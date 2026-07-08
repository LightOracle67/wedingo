import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSuperAdmin } from "../contexts/SuperAdminContext";
import { SUPERADMIN_ROUTE } from "../lib/superadmin";
import DashboardTab from "./superadmin/DashboardTab";
import InvitationsTab from "./superadmin/InvitationsTab";
import TokensTab from "./superadmin/TokensTab";
import SettingsTab from "./superadmin/SettingsTab";
import ComplianceTab from "./superadmin/ComplianceTab";

const TAB_KEY_MAP = {
  dashboard: "dashboard",
  invitaciones: "invitations",
  tokens: "tokens",
  ajustes: "session",
  cumplimiento: "compliance",
};

const TABS = [
  { key: "dashboard" },
  { key: "invitaciones" },
  { key: "tokens" },
  { key: "ajustes" },
  { key: "cumplimiento" },
];

export default function SuperAdminPanel() {
  const { t } = useTranslation();
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (isLoading) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label={t("common.loading")}>
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
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`admin-tab ${activeTab === tab.key ? "admin-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {t(`superadmin:tabs.${TAB_KEY_MAP[tab.key]}`)}
            </button>
          ))}
        </nav>

        <div className="setup-form">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "invitaciones" && <InvitationsTab />}
          {activeTab === "tokens" && <TokensTab />}
          {activeTab === "ajustes" && <SettingsTab />}
          {activeTab === "cumplimiento" && <ComplianceTab />}
        </div>
      </section>
    </div>
  );
}
