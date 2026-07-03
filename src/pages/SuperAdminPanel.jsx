import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useSuperAdmin } from "../contexts/SuperAdminContext";
import { SUPERADMIN_ROUTE } from "../lib/superadmin";
import DashboardTab from "./superadmin/DashboardTab";
import InvitationsTab from "./superadmin/InvitationsTab";
import TokensTab from "./superadmin/TokensTab";
import SettingsTab from "./superadmin/SettingsTab";
import SessionsTab from "./superadmin/SessionsTab";

const TABS = [
  { key: "dashboard", label: "Panel" },
  { key: "invitaciones", label: "Invitaciones" },
  { key: "tokens", label: "Tokens" },
  { key: "sesiones", label: "Sesiones" },
  { key: "ajustes", label: "Ajustes" },
];

export default function SuperAdminPanel() {
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (isLoading) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Cargando">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Panel privado</p>
              <h1 className="setup-title">Cargando...</h1>
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
    <div className="setup-layout">
      <section className="setup-card allow-select" aria-label="Panel de administración">
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">Superadmin</p>
            <h1 className="setup-title">Panel de control</h1>
            <p className="setup-subtitle">Gestiona la plataforma Wedingo</p>
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
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "invitaciones" && <InvitationsTab />}
          {activeTab === "tokens" && <TokensTab />}
          {activeTab === "sesiones" && <SessionsTab />}
          {activeTab === "ajustes" && <SettingsTab />}
        </div>
      </section>
    </div>
  );
}
