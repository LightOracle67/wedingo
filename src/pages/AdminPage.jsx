import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
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

export default function AdminPage() {
  const {
    hasStoredConfig, isConfigLoading, configLoadError,
    isAdminTokenLoggedIn, config,
    setupToken, setupTokenInput, setSetupTokenInput,
    adminLoginUsername, setAdminLoginUsername,
    isTokenVerifying,
    authMessage, authMessageType,
    rsvpEntries,
    adminMessage,
    handleGenerateToken, handleAdminTokenLogin,
    handleAdminLogout, handleResetTokenFromAdmin,
    handleClearRsvpEntries,
    confirmTokenInput, setConfirmTokenInput,
  } = useApp();

  const { addToast } = useToast();

  useEffect(() => {
    if (authMessage) addToast(authMessageType === "success" ? "success" : "error", authMessage);
  }, [authMessage, authMessageType, addToast]);

  useEffect(() => {
    if (adminMessage) addToast("success", adminMessage);
  }, [adminMessage, addToast]);

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
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Acceso al panel">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Acceso restringido</p>
              <h1 className="setup-title">No has iniciado sesión</h1>
              <p className="setup-subtitle">
                Introduce tu usuario y código de acceso para gestionar la invitación.
              </p>
            </div>
          </header>

          <form className="setup-form" onSubmit={(e) => { e.preventDefault(); handleAdminTokenLogin(); }}>
            <label className="setup-label" htmlFor="adminTokenLoginUsername">
              Usuario
            </label>
            <input
              id="adminTokenLoginUsername"
              className="setup-input"
              value={adminLoginUsername}
              onChange={(e) => setAdminLoginUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50))}
              placeholder="Escribe tu nombre de usuario"
              autoComplete="username"
              name="username"
            />

            <label className="setup-label" htmlFor="adminTokenLoginCode">
              Código de acceso
            </label>
            <p className="setup-help setup-help--tight">
              Cópialo tal como aparece. Si no lo tienes, genera uno nuevo.
            </p>
            <input
              id="adminTokenLoginCode"
              className="setup-input setup-token-input"
              type="password"
              value={setupTokenInput}
              onChange={(e) => setSetupTokenInput(e.target.value.toUpperCase())}
              placeholder="Pega aquí el código de acceso"
              maxLength={19}
              autoComplete="current-password"
              spellCheck="false"
            />
            {setupToken ? <p className="setup-token-display">Código activo (solo tú lo ves).</p> : null}

            <label className="setup-label" htmlFor="adminConfirmGenerate">
              Confirmar
            </label>
            <p className="setup-help setup-help--tight">
              Escribe <strong>CONFIRMAR</strong> para generar un código nuevo.
            </p>
            <input
              id="adminConfirmGenerate"
              className="setup-input"
              value={confirmTokenInput}
              onChange={(e) => setConfirmTokenInput(e.target.value)}
              placeholder="Escribe CONFIRMAR"
              autoComplete="off"
              spellCheck="false"
            />

            <div className="setup-actions">
              <button className="setup-button" type="submit" disabled={isTokenVerifying}>
                {isTokenVerifying ? "Comprobando..." : "Entrar"}
              </button>
              <button className="setup-button setup-button--ghost" type="button" onClick={handleGenerateToken}>
                Generar nuevo código
              </button>
            </div>

          </form>
        </section>
      </div>
    );
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
              confirmTokenInput={confirmTokenInput}
              setConfirmTokenInput={setConfirmTokenInput}
            />
          )}

        </div>
      </section>
    </div>
  );
}
