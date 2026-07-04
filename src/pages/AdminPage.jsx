import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { formatDate } from "../lib/section-utils";
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

export default function AdminPage() {
  const { inviteToken } = useParams();
  const {
    hasStoredConfig, isConfigLoading, configLoadError,
    isAdminTokenLoggedIn, config,
    setupToken,
    authMessage, authMessageType,
    rsvpEntries,
    adminMessage, adminMessageType,
    handleAdminLogout, handleResetTokenFromAdmin,
    handleClearRsvpEntries,
    confirmTokenInput, setConfirmTokenInput,
  } = useApp();

  const { addToast } = useToast();

  useEffect(() => {
    if (authMessage) addToast(authMessageType === "success" ? "success" : "error", authMessage);
  }, [authMessage, authMessageType, addToast]);

  useEffect(() => {
    if (adminMessage) addToast(adminMessageType === "error" ? "error" : "success", adminMessage);
  }, [adminMessage, adminMessageType, addToast]);

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
    return <Navigate to={`/${inviteToken}/setup`} replace />;
  }

  if (!isAdminTokenLoggedIn) {
    return <Navigate to={`/${inviteToken}`} replace />;
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
              aria-controls={"tabpanel-" + tab.key}
              className={`admin-tab ${activeTab === tab.key ? "admin-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="setup-form" role="tabpanel" id={"tabpanel-" + activeTab} aria-labelledby={"tab-" + activeTab}>
          {activeTab === "panel" && (
            <PanelTab
              inviteToken={inviteToken}
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
