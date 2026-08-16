import { memo, useState  } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormField, useAuth } from "../../contexts";
import { useToast } from "../../hooks/useToast";
import SetupField from "../SetupField";

interface AccessSectionFormProps {
  prefix?: string;
  /** Estado de confirmación del token (solo primera creación). */
  tokenAcknowledged?: boolean;
  /** Callback al marcar/desmarcar la confirmación del token. */
  onTokenAcknowledge?: (checked: boolean) => void;
}

const AccessSectionForm = memo(function AccessSectionForm({
  prefix = "",
  tokenAcknowledged = false,
  onTokenAcknowledge,
}: AccessSectionFormProps) {
  const { updateFormField, hasStoredConfig } = useConfigActions();
  const adminUsername = useFormField("adminUsername");
  const { setupToken } = useAuth();
  const { t } = useTranslation();
  const { addToast } = useToast();

  const id = (name: string) => `${prefix}${name}`;

  /** Muestra/oculta el token en el input de tipo password. */
  const [showToken, setShowToken] = useState(false);

  /** Copia el token de acceso al portapapeles con feedback. */
  const handleCopyToken = async () => {
    if (!setupToken) return;
    try {
      await navigator.clipboard.writeText(setupToken);
      addToast("success", t("common.copied"));
    } catch {
      addToast("error", t("errors.clipboardCopyFailed"));
    }
  };

  return (
    <>
      <SetupField
        id={id("adminUsername")}
        label={t("setup.usernameLabel")}
        hint={t("setup.usernameHint")}
        hintId={id("usernameHelp")}
        required
      >
        <input
          id={id("adminUsername")}
          className="setup-input"
          value={adminUsername}
          onChange={(e) =>
            updateFormField(
              "adminUsername",
              e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .slice(0, 50),
            )
          }
          placeholder={t("setup.usernamePlaceholder")}
          autoComplete="username"
          name="username"
          maxLength={50}
          required
          aria-required="true"
          aria-describedby={id("usernameHelp")}
        />
      </SetupField>

      {!hasStoredConfig ? (
        <div className="setup-token-section">
          <label className="setup-label" htmlFor={id("setupTokenReadonly")}>
            {t("setup.tokenFieldLabel")}
          </label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              id={id("setupTokenReadonly")}
              className="setup-input"
              type={showToken ? "text" : "password"}
              value={setupToken || ""}
              readOnly
              style={{ flex: 1, fontFamily: "monospace", letterSpacing: "0.05em", userSelect: "all" }}
              aria-describedby={id("setupTokenHint")}
              autoComplete="off"
            />
            <button
              type="button"
              className="setup-button setup-button--compact"
              onClick={() => setShowToken((s) => !s)}
              aria-label={showToken ? t("setup.hideToken") : t("setup.showToken")}
              title={showToken ? t("setup.hideToken") : t("setup.showToken")}
              style={{ flexShrink: 0 }}
            >
              {showToken ? t("setup.hideToken") : t("setup.showToken")}
            </button>
            <button
              type="button"
              className="setup-button setup-button--compact"
              onClick={handleCopyToken}
              aria-label={t("setup.copyToken")}
              title={t("setup.copyToken")}
              style={{ flexShrink: 0 }}
            >
              {t("common.copy")}
            </button>
          </div>
          <p className="setup-help" id={id("setupTokenHint")}>
            {t("setup.tokenFieldHint")}
          </p>
          {/* Aviso de acceso único: el token es irrecuperable si se pierde. */}
          <p className="setup-help" style={{ color: "var(--setup-accent)", marginTop: "0.35rem" }}>
            {t("setup.tokenSoleAccess")}
          </p>
          {onTokenAcknowledge ? (
            <label className="setup-checkbox-label" htmlFor={id("setupTokenAcknowledged")}>
              <input
                id={id("setupTokenAcknowledged")}
                type="checkbox"
                checked={tokenAcknowledged}
                onChange={(e) => onTokenAcknowledge(e.target.checked)}
                style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
              />
              {t("setup.tokenAcknowledge")}
            </label>
          ) : null}
        </div>
      ) : null}
    </>
  );
});

export default AccessSectionForm;

