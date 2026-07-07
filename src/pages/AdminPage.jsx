import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { formatDate } from "../lib/section-utils";
import SetupForm from "../components/SetupForm";
import PanelTab from "./admin/PanelTab";
import AttendanceTab from "./admin/AttendanceTab";
import AccessTab from "./admin/AccessTab";
import ShareTab from "./admin/ShareTab";
import SupportTab from "./admin/SupportTab";

const TABS = [
  { key: "panel", label: "Panel" },
  { key: "invitacion", label: "Invitación" },
  { key: "asistencia", label: "Asistencia" },
  { key: "compartir", label: "Compartir" },
  { key: "acceso", label: "Acceso" },
  { key: "soporte", label: "Soporte" },
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
    handleClearRsvpEntries, handleDeleteInvitation,
    confirmTokenInput, setConfirmTokenInput,
    formattedDate,
    reloadConfig,
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

  const coupleName = `${config.firstName} & ${config.secondName}`;

  const exportPdf = useCallback(() => {
    const s = (v) => String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    const rows = rsvpEntries.map((e) =>
      `<tr><td>${s(e.guestName)}</td><td>${e.attendance === "yes" ? "Sí" : "No"}</td><td>${e.attendance === "yes" ? e.companions : 0}</td><td>${s(e.dietaryInfo)}</td></tr>`
    ).join("");
    const tc = rsvpEntries.filter(e => e.attendance === "yes").length;
    const td = rsvpEntries.filter(e => e.attendance === "no").length;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invitados ${s(coupleName)}</title><style>
      @page{margin:2cm}body{font-family:system-ui,sans-serif;font-size:12px;color:#222;padding:2rem}h1{font-size:18px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #d4d0c8;padding:6px 8px}tr:nth-child(even){background:#faf8f5}.stats{display:flex;gap:1rem;margin:12px 0;font-size:13px}.stat{background:#f5f3ef;padding:8px 14px;border-radius:8px}@media print{body{padding:0}}
    </style></head><body>
    <h1>Invitados — ${s(coupleName)}</h1>
    <p style="color:#666;font-size:13px">${new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
    <div class="stats"><div class="stat">${tc} confirmados</div><div class="stat">${td} no asisten</div><div class="stat">${rsvpEntries.length} respuestas</div></div>
    <table><thead><tr><th>Nombre</th><th>Asistencia</th><th>Acomps</th><th>Dieta</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:12px;color:#888;font-size:11px">Wedingo</p>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) {
      setTimeout(() => { w.focus(); w.print(); URL.revokeObjectURL(url); }, 500);
    }
  }, [rsvpEntries, coupleName]);

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
    (sum, e) => sum + (e.attendance === "yes" ? e.companions : 0), 0,
  );


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
              exportPdf={exportPdf}
              formatDate={formatDate}
              onRestore={reloadConfig}
              visitCount={config._visits || 0}
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
              exportPdf={exportPdf}
              rsvpEntries={rsvpEntries}
              handleClearRsvpEntries={handleClearRsvpEntries}
              formatDate={formatDate}
            />
          )}

          {activeTab === "compartir" && (
            <ShareTab
              inviteToken={inviteToken}
              config={config}
              formattedDate={formattedDate}
              addToast={addToast}
            />
          )}

          {activeTab === "acceso" && (
            <AccessTab
              setupToken={setupToken}
              handleResetTokenFromAdmin={handleResetTokenFromAdmin}
              handleAdminLogout={handleAdminLogout}
              confirmTokenInput={confirmTokenInput}
              setConfirmTokenInput={setConfirmTokenInput}
              handleDeleteInvitation={handleDeleteInvitation}
            />
          )}

          {activeTab === "soporte" && <SupportTab />}

        </div>
      </section>
    </div>
  );
}
