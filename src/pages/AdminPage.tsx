/**
 * AdminPage.jsx
 * ─────────────────────────────────────────────────────────────
 * Página de administración de la invitación de boda.
 *
 * Contiene pestañas para:
 * - Panel: Estadísticas, acciones rápidas, exportar PDF.
 * - Invitación: Formulario de edición de la configuración.
 * - Asistencia: Lista de RSVPs con filtros y búsqueda.
 * - Compartir: Enlace de invitación, WhatsApp, QR.
 * - Acceso: Gestión de tokens y sesiones.
 * - Soporte: Información de ayuda y contacto.
 *
 * Protegida: redirige a /setup si no hay configuración guardada
 * o a la invitación pública si no hay sesión de admin activa.
 *
 * @module AdminPage
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../hooks/useToast";
import { formatDate } from "../lib/section-utils";
import { escHtml } from "../lib/utils";
import "../styles/admin.css";

// ─── Tabs de AdminPage (carga diferida) ────────────────────────────
const PanelTab = lazy(() => import("./admin/PanelTab"));
const AttendanceTab = lazy(() => import("./admin/AttendanceTab"));
const InvitationTab = lazy(() => import("./admin/InvitationTab"));
const AccessTab = lazy(() => import("./admin/AccessTab"));
const ShareTab = lazy(() => import("./admin/ShareTab"));
const SupportTab = lazy(() => import("./admin/SupportTab"));

/**
 * Mapa de claves de pestaña a IDs de traducción.
 */
const TAB_KEY_MAP = {
  panel: "panel",
  invitacion: "invitation",
  asistencia: "attendance",
  compartir: "share",
  acceso: "access",
  soporte: "support",
};

/**
 * Definición de las pestañas disponibles en el panel de admin.
 */
const TABS = [
  { key: "panel" },
  { key: "invitacion" },
  { key: "asistencia" },
  { key: "compartir" },
  { key: "acceso" },
  { key: "soporte" },
] as const;

/**
 * Página principal de administración de la boda.
 *
 * @returns {JSX.Element} Panel de administración con pestañas.
 */
export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const { inviteToken } = useParams();
  // ─── Estados del contexto global ───────────────────────
  const {
    hasStoredConfig, isConfigLoading, configLoadError,
    isAdminTokenLoggedIn, config,
    setupToken,
    authMessage, authMessageType,
    rsvpEntries,
    adminMessage, adminMessageType,
    handleAdminLogout, handleResetTokenFromAdmin,
    handleClearRsvpEntries, handleDeleteInvitation,
    formattedDate,
    reloadConfig,
  } = useApp();

  const { addToast } = useToast();
  const location = useLocation();

  // ─── Muestra mensajes de auth como toasts ──────────────
  useEffect(() => {
    if (authMessage) addToast(authMessageType === "success" ? "success" : "error", authMessage);
  }, [authMessage, authMessageType, addToast]);

  useEffect(() => {
    if (adminMessage) addToast(adminMessageType === "error" ? "error" : "success", adminMessage);
  }, [adminMessage, adminMessageType, addToast]);

  // ─── Estados locales de UI ─────────────────────────────
  const tabFromUrl = new URLSearchParams(location.search).get("tab") || "panel";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  // Sync tab changes to URL
  const handleSetTab = useCallback((tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const params = new URLSearchParams(location.search);
    if (tab === "panel") params.delete("tab");
    else params.set("tab", tab);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${location.pathname}?${qs}` : location.pathname);
  }, [location.search, location.pathname]);

  /**
   * Filtra las entradas RSVP según el filtro de asistencia y la búsqueda.
   * Se recalcula cuando cambian las entradas, el filtro o la búsqueda.
   */
  const filteredEntries = useMemo(() => {
    let result = rsvpEntries;
    if (attendanceFilter === "yes") result = result.filter((e: { attendance: string }) => e.attendance === "yes");
    if (attendanceFilter === "no") result = result.filter((e: { attendance: string }) => e.attendance === "no");
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e: { guestName: string }) => e.guestName.toLowerCase().includes(q));
    }
    return result;
  }, [rsvpEntries, attendanceFilter, searchQuery]);

  /** Callback memoizado para cambiar de pestaña. */
  const setActiveTabAndFilter = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  /** Callback memoizado para cambiar el filtro de asistencia. */
  const setAttendanceFilterValue = useCallback((filter: string) => {
    setAttendanceFilter(filter);
  }, []);

  /** Nombre de la pareja formateado para mostrar en el panel. */
  const coupleName = `${config.firstName} & ${config.secondName}`;

  /**
   * Genera y abre un PDF imprimible con la lista de asistentes.
   * Crea un HTML con estilos de impresión y abre la ventana de impresión.
   */
  const exportPdf = useCallback(() => {
    // Construye las filas de la tabla con escape HTML para prevenir XSS
    const rows = rsvpEntries.map((e: { guestName: string; attendance: string; companions?: number; dietaryInfo?: string }) =>
      `<tr><td>${escHtml(e.guestName)}</td><td>${e.attendance === "yes" ? t("panel.attends") : t("panel.notAttends")}</td><td>${e.attendance === "yes" ? e.companions : 0}</td><td>${escHtml(e.dietaryInfo || "")}</td></tr>`
    ).join("");
    const tc = rsvpEntries.filter((e: { attendance: string }) => e.attendance === "yes").length;
    const td = rsvpEntries.filter((e: { attendance: string }) => e.attendance === "no").length;
    // HTML completo con estilos para impresión
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t("admin.pdfTitle", { name: escHtml(coupleName) })}</title><style>
      @page{margin:2cm}body{font-family:system-ui,sans-serif;font-size:12px;color:#222;padding:2rem}h1{font-size:18px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #d4d0c8;padding:6px 8px}tr:nth-child(even){background:#faf8f5}.stats{display:flex;gap:1rem;margin:12px 0;font-size:13px}.stat{background:#f5f3ef;padding:8px 14px;border-radius:8px}@media print{body{padding:0}}
    </style></head><body>
    <h1>${t("admin.pdfTitle", { name: escHtml(coupleName) })}</h1>
    <p style="color:#666;font-size:13px">${new Date().toLocaleDateString(i18n.language,{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
    <div class="stats"><div class="stat">${tc} ${t("admin.pdfConfirmed")}</div><div class="stat">${td} ${t("admin.pdfNotAttending")}</div><div class="stat">${rsvpEntries.length} ${t("admin.pdfResponses")}</div></div>
    <table><thead><tr><th>${t("admin.pdfTableName")}</th><th>${t("admin.pdfTableAttendance")}</th><th>${t("admin.pdfTableCompanions")}</th><th>${t("admin.pdfTableDiet")}</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:12px;color:#888;font-size:11px">${t("support.appTitle")}</p>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) {
      // Abre el diálogo de impresión tras un pequeño retraso
      setTimeout(() => { w.focus(); w.print(); URL.revokeObjectURL(url); }, 500);
    }
  }, [rsvpEntries, coupleName, t, i18n.language]);

  // ─── Cálculo de estadísticas de asistencia ─────────────
  const confirmedResponses = rsvpEntries.filter((e: { attendance: string }) => e.attendance === "yes").length;
  const declinedResponses = rsvpEntries.filter((e: { attendance: string }) => e.attendance === "no").length;
  const totalGuests = rsvpEntries.reduce(
    (s: number, r: { companions?: number }) => s + (Number(r.companions) || 1), 0,
  );

  /** Props agrupadas para PanelTab (reduce prop drilling). */
  const panelConfig = useMemo(() => ({
    inviteToken,
    confirmedResponses,
    declinedResponses,
    totalGuests,
    rsvpEntries,
    setActiveTab: setActiveTabAndFilter,
    setAttendanceFilter: setAttendanceFilterValue,
    exportPdf,
    formatDate,
    onRestore: reloadConfig,
    visitCount: config._visits || 0,
  }), [inviteToken, confirmedResponses, declinedResponses, totalGuests, rsvpEntries, setActiveTabAndFilter, setAttendanceFilterValue, exportPdf, reloadConfig, config._visits]);

  /** Props agrupadas para AttendanceTab. */
  const attendanceConfig = useMemo(() => ({
    searchQuery,
    setSearchQuery,
    attendanceFilter,
    setAttendanceFilter: setAttendanceFilterValue,
    filteredEntries,
    exportPdf,
    rsvpEntries,
    handleClearRsvpEntries,
    formatDate,
  }), [searchQuery, setSearchQuery, attendanceFilter, setAttendanceFilterValue, filteredEntries, exportPdf, rsvpEntries, handleClearRsvpEntries]);

  // ─── Estados de carga ──────────────────────────────────
  if (isConfigLoading) {
    return (
      <div className="setup-layout setup-layout--full">
        <section className="setup-card setup-card--full allow-select" aria-label={t("setup.loadingTitle")} style={{ borderRadius: "1rem" }}>
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">{t("setup.configTitle")}</p>
              <h1 className="setup-title">{t("setup.loadingTitle")}</h1>
              <p className="setup-subtitle">{t("admin.loadingConfig")}</p>
            </div>
          </header>
        </section>
      </div>
    );
  }

  // ─── Error de carga ────────────────────────────────────
  if (configLoadError) {
    return (
      <div className="setup-layout setup-layout--full">
        <section className="setup-card setup-card--full allow-select" aria-label={t("common.error")} style={{ borderRadius: "1rem" }}>
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">{t("common.error")}</p>
              <h1 className="setup-title">{t("admin.errorLoadingConfig")}</h1>
              <p className="setup-subtitle">{configLoadError}</p>
            </div>
          </header>
          <div className="setup-actions">
            <button className="setup-button" type="button" onClick={() => window.location.reload()}>
              {t("common.retry")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ─── Redirección si no hay configuración guardada ──────
  if (!hasStoredConfig) {
    return <Navigate to={`/${inviteToken}/setup`} replace />;
  }

  // ─── Redirección si no hay sesión de admin activa ──────
  if (!isAdminTokenLoggedIn) {
    return <Navigate to={`/${inviteToken}`} replace />;
  }


  return (
    <div className="setup-layout setup-layout--full">
      <section className="setup-card setup-card--wide setup-card--full allow-select" aria-label={t("admin.privateArea")} style={{ borderRadius: "1rem" }}>
        {/* ── Cabecera del panel ── */}
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">{t("admin.privateArea")}</p>
            <h1 className="setup-title">{coupleName}</h1>
            <p className="setup-subtitle">{t("admin.manageInvitation")}</p>
          </div>
        </header>

        {/* ── Navegación por pestañas ── */}
        <nav className="admin-tabs" role="tablist" aria-label={t("admin.sectionsLabel")}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              id={"tab-" + tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={"tabpanel-" + tab.key}
              className={`admin-tab ${activeTab === tab.key ? "admin-tab--active" : ""}`}
              onClick={() => handleSetTab(tab.key)}
            >
              {t(`admin.tabs.${TAB_KEY_MAP[tab.key]}`)}
            </button>
          ))}
        </nav>

        {/* ── Contenido de la pestaña activa ── */}
        <Suspense fallback={<div className="page-loading" style={{ minHeight: "10rem", margin: "1rem" }} />}>
          <div className="setup-form" role="tabpanel" id={"tabpanel-" + activeTab} aria-labelledby={"tab-" + activeTab}>
            {/* Pestaña: Panel de control */}
            {activeTab === "panel" && <PanelTab config={panelConfig} />}

            {/* Pestaña: Editar invitación */}
            {activeTab === "invitacion" && <InvitationTab />}

            {/* Pestaña: Lista de asistencia */}
            {activeTab === "asistencia" && <AttendanceTab config={attendanceConfig} />}

            {/* Pestaña: Compartir invitación */}
            {activeTab === "compartir" && (
              <ShareTab
                inviteToken={inviteToken || ""}
                config={config}
                formattedDate={formattedDate}
                addToast={addToast}
              />
            )}

            {/* Pestaña: Gestión de acceso */}
            {activeTab === "acceso" && (
               <AccessTab
                 setupToken={setupToken}
                 handleResetTokenFromAdmin={handleResetTokenFromAdmin}
                 handleAdminLogout={handleAdminLogout}
                 handleDeleteInvitation={handleDeleteInvitation}
               />
            )}

            {/* Pestaña: Soporte */}
            {activeTab === "soporte" && <SupportTab />}
          </div>
        </Suspense>
      </section>
    </div>
  );
}
