import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_VERSION } from "../../lib/constants";
import ChangelogModal from "../../components/ChangelogModal";

const SupportTab = memo(function SupportTab() {
  const { t } = useTranslation();
  const [showChangelog, setShowChangelog] = useState(false);

  const handleDeleteMail = () => {
    const subject = encodeURIComponent(t("support.deleteEmailSubject"));
    const body = encodeURIComponent(t("support.deleteEmailBody"));
    window.open(`mailto:adriancl2001@gmail.com?subject=${subject}&body=${body}`, "_blank");
  };

  const handleExportMail = () => {
    const subject = encodeURIComponent(t("support.exportEmailSubject"));
    const body = encodeURIComponent(t("support.exportEmailBody"));
    window.open(`mailto:adriancl2001@gmail.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="setup-token-card" style={{ padding: "1rem" }}>
      <div className="support-grid">
        <div className="setup-background-panel">
          <p className="setup-label">{t("support.title")}</p>
          <p className="setup-help" style={{ fontSize: "0.85rem" }}>{t("support.description")}</p>
          <p className="setup-help" style={{ fontSize: "0.8rem", marginTop: "0.3rem" }}>
            {t("support.email")}
          </p>
        </div>

        <div className="setup-background-panel">
          <p className="setup-label">{t("support.rightsTitle")}</p>
          <p className="setup-help" style={{ fontSize: "0.85rem" }}>{t("support.rightsDescription")}</p>
          <div className="legal-actions">
            <button className="setup-button" onClick={handleDeleteMail}>{t("support.deleteButton")}</button>
            <button className="setup-button" onClick={handleExportMail}>{t("support.exportButton")}</button>
          </div>
          <p style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "var(--setup-subtitle)" }}>
            {t("support.rightsHint")}
          </p>
        </div>

        <div className="setup-background-panel">
          <p className="setup-label">{t("support.ccpaTitle")}</p>
          <p className="setup-help" style={{ fontSize: "0.85rem" }}>{t("support.ccpaText")}</p>
        </div>

        <div className="setup-background-panel">
          <p className="setup-label">{t("support.appTitle")}</p>
          <p className="setup-help" style={{ fontSize: "0.85rem" }}>{t("support.appDescription")}</p>
          <p style={{ fontSize: "0.8rem", color: "var(--setup-muted)", marginTop: "0.3rem" }}>
            {t("support.copyright", { year: new Date().getFullYear() })}
          </p>
          <button type="button" onClick={() => setShowChangelog(true)} style={{ fontSize: "0.7rem", color: "var(--setup-accent)", marginTop: "0.2rem", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>
            v{APP_VERSION}
          </button>
          {showChangelog ? <ChangelogModal onClose={() => setShowChangelog(false)} /> : null}
        </div>
      </div>
    </div>
  );
});

export default SupportTab;
