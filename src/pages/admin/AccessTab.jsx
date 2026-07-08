import { memo } from "react";
import { useTranslation } from "react-i18next";

const AccessTab = memo(function AccessTab({ setupToken, handleResetTokenFromAdmin, handleAdminLogout, confirmTokenInput, setConfirmTokenInput, handleDeleteInvitation }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="setup-token-card">
        <p className="setup-help setup-help--tight">
          {t("access.description")}
        </p>
        <input
          className="setup-input setup-token-input"
          value={setupToken || ""}
          readOnly
          autoComplete="off"
          spellCheck="false"
          placeholder={t("access.newTokenPlaceholder")}
        />
        {setupToken ? <p className="setup-token-display">{t("access.activeToken")}</p> : null}

        <label className="setup-label" htmlFor="accessConfirmReset">
          {t("access.confirmLabel")}
        </label>
        <p className="setup-help setup-help--tight">
          {t("access.currentTokenDescription")}
        </p>
        <input
          id="accessConfirmReset"
          className="setup-input"
          value={confirmTokenInput}
          onChange={(e) => setConfirmTokenInput(e.target.value)}
          placeholder={t("access.currentTokenPlaceholder")}
          autoComplete="off"
          spellCheck="false"
        />

        <div className="setup-actions">
          <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleResetTokenFromAdmin}>
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
