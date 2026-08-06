import { lazy, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useSuperAdmin } from "../contexts/SuperAdminContext";
import { SUPERADMIN_ROUTE } from "../lib/superadmin";
import "../styles/admin.css";

// ─── Tabs de SuperAdmin (carga diferida) ───────────────────────────
const DashboardTab = lazy(() => import("./superadmin/DashboardTab"));
const InvitationsTab = lazy(() => import("./superadmin/InvitationsTab"));
const TokensTab = lazy(() => import("./superadmin/TokensTab"));
const SettingsTab = lazy(() => import("./superadmin/SettingsTab"));
const ComplianceTab = lazy(() => import("./superadmin/ComplianceTab"));
const DataTab = lazy(() => import("./superadmin/DataTab"));

const TAB_KEY_MAP = {
  dashboard: "dashboard",
  invitaciones: "invitations",
  tokens: "tokens",
  datos: "data",
  ajustes: "session",
  cumplimiento: "compliance",
};

const TABS = [
  { key: "dashboard" },
  { key: "invitaciones" },
  { key: "tokens" },
  { key: "datos" },
  { key: "ajustes" },
  { key: "cumplimiento" },
];

export default function SuperAdminPanel() {
  const { t } = useTranslation();
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  // La pestaña activa se refleja en la URL (?tab=datos) para poder enlazarla.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(
    TABS.some((tab) => tab.key === tabParam) ? (tabParam as string) : "dashboard",
  );

  const handleSetTab = (key: string) => {
    setActiveTab(key);
    setSearchParams(key === "dashboard" ? {} : { tab: key }, { replace: true });
  };

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
              className={`admin-tab ${activeTab === tab.key ? "admin-tab--active" : ""}`}
              onClick={() => handleSetTab(tab.key)}
            >
              {t(`superadmin.tabs.${TAB_KEY_MAP[tab.key as keyof typeof TAB_KEY_MAP]}`)}
            </button>
          ))}
        </nav>

        <div className="setup-form" role="tabpanel" id={"sadm-tabpanel-" + activeTab} aria-labelledby={"sadm-tab-" + activeTab}>
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "invitaciones" && <InvitationsTab />}
          {activeTab === "tokens" && <TokensTab />}
          {activeTab === "datos" && <DataTab />}
          {activeTab === "ajustes" && <SettingsTab />}
          {activeTab === "cumplimiento" && <ComplianceTab />}
        </div>
      </section>
    </div>
  );
}
