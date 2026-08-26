import { lazy, Suspense, useCallback } from "react";
import { Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useSuperAdmin } from "../contexts/SuperAdminContext";
import { SUPERADMIN_ROUTE } from "../lib/superadmin";
import { useTabs } from "../hooks/useTabs";
import "../styles/admin.css";

// ─── Tabs de SuperAdmin (carga diferida) ───────────────────────────
const DashboardTab = lazy(() => import("./superadmin/DashboardTab"));
const InvitationsTab = lazy(() => import("./superadmin/InvitationsTab"));
const TokensTab = lazy(() => import("./superadmin/TokensTab"));
const SettingsTab = lazy(() => import("./superadmin/SettingsTab"));
const ComplianceTab = lazy(() => import("./superadmin/ComplianceTab"));
const DataTab = lazy(() => import("./superadmin/DataTab"));
const ManageTab = lazy(() => import("./superadmin/ManageTab"));
const PlatformTab = lazy(() => import("./superadmin/PlatformTab"));
const MetricsTab = lazy(() => import("./superadmin/MetricsTab"));
const SupportTab = lazy(() => import("./superadmin/SupportTab"));

const TAB_KEY_MAP = {
  dashboard: "dashboard",
  /* metricsTab/supportTab: etiquetas string; 'metrics'/'support' son dicts
     de subclaves usadas por MetricsTab/SupportTab y no pueden ser labels. */
  metricas: "metricsTab",
  invitaciones: "invitations",
  tokens: "tokens",
  datos: "data",
  gestion: "manage",
  soporte: "supportTab",
  plataforma: "platform",
  ajustes: "session",
  cumplimiento: "compliance",
};

const TABS = [
  { key: "dashboard" },
  { key: "metricas" },
  { key: "invitaciones" },
  { key: "tokens" },
  { key: "datos" },
  { key: "gestion" },
  { key: "soporte" },
  { key: "plataforma" },
  { key: "ajustes" },
  { key: "cumplimiento" },
];

export default function SuperAdminPanel() {
  const { t } = useTranslation();
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  // La pestaña activa se refleja en la URL (?tab=datos) en AMBOS sentidos:
  // el botón atrás del navegador también cambia de pestaña (useTabs).
  const TAB_KEYS = [
    "dashboard",
    "metricas",
    "invitaciones",
    "tokens",
    "datos",
    "gestion",
    "soporte",
    "plataforma",
    "ajustes",
    "cumplimiento",
  ] as const;
  const { activeTab, select: handleSetTab, tabPanelRef } = useTabs(TAB_KEYS, "dashboard");

  // Patrón ARIA de tabs operativo por teclado: flechas/Home/End con roving
  // tabindex (mismo comportamiento que el panel admin, WCAG 2.1.1).
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, key: string) => {
      const index = TABS.findIndex((t) => t.key === key);
      let nextIndex = -1;
      if (e.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
      else if (e.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
      else if (e.key === "Home") nextIndex = 0;
      else if (e.key === "End") nextIndex = TABS.length - 1;
      if (nextIndex >= 0) {
        e.preventDefault();
        const next = TABS[nextIndex]!;
        handleSetTab(next.key as (typeof TAB_KEYS)[number]);
        document.getElementById("sadm-tab-" + next.key)?.focus();
      }
    },
    [handleSetTab],
  );

  if (isLoading) {
    return (
      <div className="setup-layout setup-layout--full">
        <section className="setup-card setup-card--full allow-select" aria-label={t("common.loading")}>
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">{t("superadmin.superadmin")}</p>
              <h1 className="setup-title">{t("common.loading")}</h1>
            </div>
          </header>
        </section>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to={SUPERADMIN_ROUTE} replace />;
  }

  return (
    <div className="setup-layout setup-layout--full">
      <section className="setup-card setup-card--full allow-select" aria-label={t("superadmin.controlPanel")}>
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">{t("superadmin.superadmin")}</p>
            <h1 className="setup-title">{t("superadmin.controlPanel")}</h1>
            <p className="setup-subtitle">{t("superadmin.managePlatform")}</p>
          </div>
        </header>

        <nav className="admin-tabs" role="tablist" aria-label={t("superadmin.superadmin")}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              id={"sadm-tab-" + tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={"sadm-tabpanel-" + tab.key}
              tabIndex={activeTab === tab.key ? 0 : -1}
              className={`admin-tab ${activeTab === tab.key ? "admin-tab--active" : ""}`}
              onClick={() => handleSetTab(tab.key as (typeof TAB_KEYS)[number])}
              onKeyDown={(e) => handleTabKeyDown(e, tab.key)}
            >
              {t(`superadmin.tabs.${TAB_KEY_MAP[tab.key as keyof typeof TAB_KEY_MAP]}`)}
            </button>
          ))}
        </nav>

        <div
          className="setup-form"
          role="tabpanel"
          id={"sadm-tabpanel-" + activeTab}
          aria-labelledby={"sadm-tab-" + activeTab}
          ref={tabPanelRef}
          tabIndex={-1}
        >
          <Suspense fallback={<div className="page-loading" role="status" aria-label={t("common.loading")} />}>
            {activeTab === "dashboard" && <DashboardTab />}
            {activeTab === "metricas" && <MetricsTab />}
            {activeTab === "invitaciones" && <InvitationsTab />}
            {activeTab === "tokens" && <TokensTab />}
            {activeTab === "datos" && <DataTab />}
            {activeTab === "gestion" && <ManageTab />}
            {activeTab === "soporte" && <SupportTab />}
            {activeTab === "plataforma" && <PlatformTab />}
            {activeTab === "ajustes" && <SettingsTab />}
            {activeTab === "cumplimiento" && <ComplianceTab />}
          </Suspense>
        </div>
      </section>
    </div>
  );
}
