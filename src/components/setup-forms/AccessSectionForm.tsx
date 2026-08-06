import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";
import { useToast } from "../../hooks/useToast";

interface AccessSectionFormProps {
  prefix?: string;
  /** Estado de confirmación del token (solo primera creación). */
  tokenAcknowledged?: boolean;
  /** Callback al marcar/desmarcar la confirmación del token. */
  onTokenAcknowledge?: (checked: boolean) => void;
}

export default function AccessSectionForm({ prefix = "", tokenAcknowledged = false, onTokenAcknowledge }: AccessSectionFormProps) {
  const { formData, updateFormField, setupToken, hasStoredConfig } = useApp();
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
      <label className="setup-label setup-label--required" htmlFor={id("adminUsername")}>
        {t("setup.usernameLabel")}
      </label>
      <input
        id={id("adminUsername")}
        className="setup-input"
        value={formData.adminUsername}
        onChange={(e) => updateFormField("adminUsername", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50))}
        placeholder={t("setup.usernamePlaceholder")}
        autoComplete="username"
        name="username"
        maxLength={50}
        required
        aria-required="true"
        aria-describedby="usernameHelp"
      />
      <p className="setup-help" id="usernameHelp">
        {t("setup.usernameHint")}
      </p>

      {!hasStoredConfig ? (
        <div
          className="setup-token-section"
          style={{ marginTop: "0.9rem", padding: "0.9rem 1rem", borderRadius: "var(--radius-md)", background: "color-mix(in srgb, var(--setup-field-bg) 55%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 35%, transparent)" }}
        >
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
              disabled
              style={{ flex: 1, fontFamily: "monospace", letterSpacing: "0.05em", userSelect: "all" }}
              aria-describedby="setupTokenHint"
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
          <p className="setup-help" id="setupTokenHint">
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
}
