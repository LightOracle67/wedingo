import { memo } from "react";
import { useTranslation } from "react-i18next";

export interface AccessTabProps {
  setupToken?: string;
  handleResetTokenFromAdmin: () => void;
  handleAdminLogout: () => void;
  handleDeleteInvitation: () => void;
}

const AccessTab = memo(function AccessTab({ setupToken, handleResetTokenFromAdmin, handleAdminLogout, handleDeleteInvitation }: AccessTabProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="setup-token-card">
        <p className="setup-help setup-help--tight">
          {t("access.description")}
        </p>
        <input
          id="setupTokenDisplay"
          className="setup-input setup-token-input"
          value={setupToken || ""}
          readOnly
          autoComplete="off"
          spellCheck="false"
          placeholder={t("access.newTokenPlaceholder")}
          aria-label={t("access.newTokenPlaceholder")}
        />
        {setupToken ? <p className="setup-token-display">{t("access.activeToken")}</p> : null}

        <div className="setup-actions">
          <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => {
            // Regenerar el token invalida el actual: se confirma explícitamente.
            if (window.confirm(t("access.regenConfirm"))) handleResetTokenFromAdmin();
          }}>
            {t("access.generateToken")}
          </button>
          <button className="setup-button" type="button" onClick={handleAdminLogout}>
            {t("access.logout")}
          </button>
        </div>
      </div>

      <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid var(--setup-border)" }} />
      <p className="setup-help" style={{ fontSize: "0.8rem", textAlign: "center" }}>
        {t("access.deleteDataDescription")}
      </p>
      <div className="setup-actions">
        <button className="setup-button setup-button--ghost" type="button" onClick={handleDeleteInvitation} style={{ borderColor: "#e06060", color: "#e06060" }}>
          {t("access.deleteInvitation")}
        </button>
      </div>
    </>
  );
});

export default AccessTab;
