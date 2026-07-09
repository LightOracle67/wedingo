import { memo } from "react";
import { useTranslation } from "react-i18next";

const SupportTab = memo(function SupportTab() {
  const { t } = useTranslation();

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
    <div className="support-section">
      <h3>{t("support.title")}</h3>
      <p>{t("support.description")}</p>
      <ul className="support-list">
        <li>{t("support.email")}</li>
      </ul>

      <hr className="support-divider" />

      <h3>{t("support.rightsTitle")}</h3>
      <p>{t("support.rightsDescription")}</p>
      <div className="legal-actions">
        <button className="setup-button" onClick={handleDeleteMail}>{t("support.deleteButton")}</button>
        <button className="setup-button" onClick={handleExportMail}>{t("support.exportButton")}</button>
      </div>
      <p style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "var(--setup-subtitle)" }}>
        {t("support.rightsHint")}
      </p>

      <hr className="support-divider" />

      <h3>{t("support.ccpaTitle")}</h3>
      <p>{t("support.ccpaText")}</p>

      <hr className="support-divider" />

      <h3>{t("support.appTitle")}</h3>
      <p>{t("support.appDescription")}</p>
      <p className="support-copyright">{t("support.copyright", { year: new Date().getFullYear() })}</p>
      <p style={{ fontSize: "0.7rem", color: "var(--setup-muted)", marginTop: "0.2rem" }}>v2.0.0</p>
    </div>
  );
});

export default SupportTab;
