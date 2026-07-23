import { memo } from "react";

const TABS = [
  { key: "panel", labelKey: "admin.tabs.panel" },
  { key: "invitacion", labelKey: "admin.tabs.invitation" },
  { key: "asistencia", labelKey: "admin.tabs.attendance" },
  { key: "compartir", labelKey: "admin.tabs.share" },
  { key: "acceso", labelKey: "admin.tabs.access" },
  { key: "soporte", labelKey: "admin.tabs.support" },
];

const AdminTabs = memo(function AdminTabs({ activeTab, onTabChange, t }: any) {
  return (
    <nav className="admin-tabs" aria-label={t("admin.tabs.ariaLabel")} role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`admin-tab${activeTab === tab.key ? " admin-tab--active" : ""}`}
          onClick={() => onTabChange(tab.key)}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  );
});

export default AdminTabs;
