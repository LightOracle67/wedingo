import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import SetupForm from "../components/SetupForm";
import PanelTab from "./admin/PanelTab";
import AttendanceTab from "./admin/AttendanceTab";
import AccessTab from "./admin/AccessTab";

const TABS = [
  { key: "panel", label: "Panel" },
  { key: "invitacion", label: "Invitación" },
  { key: "asistencia", label: "Asistencia" },
  { key: "acceso", label: "Acceso" },
];

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function NavigateUnauthenticated() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/setup", { replace: true }), 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="setup-layout">
      <section className="setup-card" style={{ textAlign: "center" }}>
        <header className="setup-header" style={{ justifyContent: "center" }}>
          <div>
            <p className="setup-eyebrow">Acceso restringido</p>
            <h1 className="setup-title">No has iniciado sesión</h1>
            <p className="setup-subtitle">
              Para acceder al panel de administración necesitas iniciar sesión desde la página de configuración.
            </p>
          </div>
        </header>
        <p className="setup-help" style={{ marginTop: "1rem" }}>
          Serás redirigido automáticamente en unos segundos...
        </p>
        <div className="setup-actions" style={{ justifyContent: "center", marginTop: "1.25rem" }}>
          <button className="setup-button" type="button" onClick={() => navigate("/setup", { replace: true })}>
            Ir a configuración
          </button>
          <button className="setup-button setup-button--ghost" type="button" onClick={() => navigate("/")}>
            Volver a la portada
          </button>
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const {
    hasStoredConfig, isConfigLoading, configLoadError,
    isAdminTokenLoggedIn, config,
    setupToken,
    rsvpEntries,
    adminMessage,
    handleAdminLogout, handleResetTokenFromAdmin,
    handleClearRsvpEntries,
  } = useApp();

  const [activeTab, setActiveTab] = useState("panel");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  const filteredEntries = useMemo(() => {
    let result = rsvpEntries;
    if (attendanceFilter === "yes") result = result.filter((e) => e.attendance === "yes");
    if (attendanceFilter === "no") result = result.filter((e) => e.attendance === "no");
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e) => e.guestName.toLowerCase().includes(q));
    }
    return result;
  }, [rsvpEntries, attendanceFilter, searchQuery]);

  const setActiveTabAndFilter = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const setAttendanceFilterValue = useCallback((filter) => {
    setAttendanceFilter(filter);
  }, []);

  const exportCsv = useCallback(() => {
    const sanitize = (val) => {
      const s = String(val);
      if (/^[=+\-@]/.test(s)) return `"'${s}"`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = "Nombre,Asistencia,Acompañantes,Nota,Fecha";
    const rows = rsvpEntries.map((e) =>
      [
        sanitize(e.guestName),
        e.attendance === "yes" ? "Sí" : "No",
        e.attendance === "yes" ? e.companions : 0,
        sanitize(e.note || ""),
        formatDate(e.submittedAt),
      ].join(","),
    );
    const blob = new Blob(["\uFEFF" + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invitados_${config.firstName}_${config.secondName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rsvpEntries, config.firstName, config.secondName]);

  if (isConfigLoading) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Cargando configuración">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Configuración</p>
              <h1 className="setup-title">Cargando invitación</h1>
              <p className="setup-subtitle">Estamos recuperando la configuración guardada.</p>
            </div>
          </header>
        </section>
      </div>
    );
  }

  if (configLoadError) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Error de carga">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Error de conexión</p>
              <h1 className="setup-title">No pudimos cargar la invitación</h1>
              <p className="setup-subtitle">{configLoadError}</p>
            </div>
          </header>
          <div className="setup-actions">
            <button className="setup-button" type="button" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!hasStoredConfig) {
    return <Navigate to="/setup" replace />;
  }

  if (!isAdminTokenLoggedIn) {
    return <NavigateUnauthenticated />;
  }

  const confirmedResponses = rsvpEntries.filter((e) => e.attendance === "yes").length;
  const declinedResponses = rsvpEntries.filter((e) => e.attendance === "no").length;
  const totalGuests = rsvpEntries.reduce(
    (sum, e) => sum + (e.attendance === "yes" ? 1 + e.companions : 0), 0,
  );

  const coupleName = `${config.firstName} & ${config.secondName}`;

  return (
    <div className="setup-layout">
      <section className="setup-card allow-select" aria-label="Panel de administración">
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">Área privada</p>
            <h1 className="setup-title">{coupleName}</h1>
            <p className="setup-subtitle">Gestiona tu invitación de boda</p>
          </div>
        </header>

        <nav className="admin-tabs" role="tablist" aria-label="Secciones">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`admin-tab ${activeTab === tab.key ? "admin-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="setup-form">
          {activeTab === "panel" && (
            <PanelTab
              confirmedResponses={confirmedResponses}
              declinedResponses={declinedResponses}
              totalGuests={totalGuests}
              rsvpEntries={rsvpEntries}
              setActiveTab={setActiveTabAndFilter}
              setAttendanceFilter={setAttendanceFilterValue}
              exportCsv={exportCsv}
              formatDate={formatDate}
            />
          )}

          {activeTab === "invitacion" && <SetupForm prefix="admin" />}

          {activeTab === "asistencia" && (
            <AttendanceTab
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              attendanceFilter={attendanceFilter}
              setAttendanceFilter={setAttendanceFilterValue}
              filteredEntries={filteredEntries}
              exportCsv={exportCsv}
              rsvpEntries={rsvpEntries}
              handleClearRsvpEntries={handleClearRsvpEntries}
              formatDate={formatDate}
            />
          )}

          {activeTab === "acceso" && (
            <AccessTab
              setupToken={setupToken}
              handleResetTokenFromAdmin={handleResetTokenFromAdmin}
              handleAdminLogout={handleAdminLogout}
            />
          )}

          {adminMessage ? <p className="setup-success">{adminMessage}</p> : null}
        </div>
      </section>
    </div>
  );
}
