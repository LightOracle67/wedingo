import { memo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Panel de herramientas de la pestaña Gestión: comparar dos invitaciones
 * (diff campo a campo) y validar el JSON de configuración.
 *
 * Es un subcomponente de presentación puro: recibe por props los valores y
 * los callbacks ya construidos por ManageTab, sin acceso directo a Firestore
 * ni al estado global. Se extrae para reducir el tamaño del monolítico y
 * poder testear la UI del panel de forma aislada.
 */
interface ToolboxPanelProps {
  invitations: Array<{ id: string; name: string }>;
  cmpA: string;
  cmpB: string;
  onCmpA: (v: string) => void;
  onCmpB: (v: string) => void;
  cmpDiff: Array<{ key: string; a: string; b: string }>;
  onCompare: () => void;
  validatorJson: string;
  onValidatorJson: (v: string) => void;
  validatorResult: { ok: boolean; msg: string } | null;
  onValidate: () => void;
}

function ToolboxPanelBase({
  invitations,
  cmpA,
  cmpB,
  onCmpA,
  onCmpB,
  cmpDiff,
  onCompare,
  validatorJson,
  onValidatorJson,
  validatorResult,
  onValidate,
}: ToolboxPanelProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Comparar invitaciones + validador de configuración */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("manage.compareTitle")}</p>
        <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <select
            className="setup-input"
            value={cmpA}
            onChange={(e) => onCmpA(e.target.value)}
            aria-label={t("manage.compareA")}
            style={{ maxWidth: "100%" }}
          >
            <option value="">A —</option>
            {invitations.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.id}
              </option>
            ))}
          </select>
          <select
            className="setup-input"
            value={cmpB}
            onChange={(e) => onCmpB(e.target.value)}
            aria-label={t("manage.compareB")}
            style={{ maxWidth: "100%" }}
          >
            <option value="">B —</option>
            {invitations.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.id}
              </option>
            ))}
          </select>
          <button className="setup-button setup-button--compact" type="button" onClick={onCompare}>
            {t("manage.compareButton")}
          </button>
        </div>
        {cmpDiff.length > 0 ? (
          <div
            style={{
              marginTop: "0.5rem",
              maxHeight: "10rem",
              overflowY: "auto",
              border: "1px solid var(--setup-border)",
              borderRadius: "0.5rem",
            }}
          >
            {cmpDiff.map((d) => (
              <div
                key={d.key}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem",
                  borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)",
                }}
              >
                <strong>{d.key}</strong>: <code>{d.a}</code> → <code>{d.b}</code>
              </div>
            ))}
          </div>
        ) : (
          <p className="setup-help" style={{ margin: "0.4rem 0 0" }}>
            {t("manage.compareNone")}
          </p>
        )}
      </div>

      <div className="setup-background-panel">
        <p className="setup-label">{t("manage.validatorTitle")}</p>
        <p className="setup-help">{t("manage.validatorHelp")}</p>
        <textarea
          className="setup-textarea"
          value={validatorJson}
          onChange={(e) => onValidatorJson(e.target.value)}
          rows={5}
          spellCheck={false}
          style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
          aria-label={t("manage.validatorTitle")}
        />
        <div className="setup-actions">
          <button className="setup-button setup-button--compact" type="button" onClick={onValidate}>
            {t("manage.validatorButton")}
          </button>
        </div>
        {validatorResult ? (
          <p className={validatorResult.ok ? "setup-success" : "setup-error"} role="alert">
            {validatorResult.msg}
          </p>
        ) : null}
      </div>
    </>
  );
}

export const ToolboxPanel = memo(ToolboxPanelBase);
