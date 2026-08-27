import { memo } from "react";
import type { RsvpFormData } from "../../../hooks/useRsvp";
import type { Translate } from "./derive";

interface ConsentsBlockProps {
  form: RsvpFormData;
  /** Escritura de campos escalares del formulario. */
  onField: (field: string, value: unknown) => void;
  showHealthConsent: boolean;
  signatureEnabled: boolean;
  policyVersion?: string | undefined;
  frozen: boolean;
  disabled: boolean;
  onOpenPrivacy: () => void;
  t: Translate;
}

/**
 * Bloque de consentimientos y datos opcionales del titular: privacidad
 * (obligatoria, con enlace operable a la política), salud condicional,
 * firma digital opcional, contacto opt-in y publicar nombre.
 */
const ConsentsBlock = memo(function ConsentsBlock({
  form,
  onField,
  showHealthConsent,
  signatureEnabled,
  policyVersion,
  frozen,
  disabled,
  onOpenPrivacy,
  t,
}: ConsentsBlockProps) {
  return (
    <div className="rv2-consents">
      {/* Privacidad: el enlace vive FUERA del label como span role=link
          (HTML válido y activable por teclado sin activar el checkbox). */}
      <label className="rv2-check">
        <input
          type="checkbox"
          checked={form.privacyConsent}
          onChange={(e) => onField("privacyConsent", e.target.checked)}
          required
          disabled={frozen}
        />
        <span>
          {t("rsvp.privacyConsentBefore")}
          <span
            role="link"
            tabIndex={frozen ? -1 : 0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenPrivacy();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenPrivacy();
              }
            }}
            className="rv2-link"
          >
            {t("public.privacyPolicy")}
          </span>
          {t("rsvp.privacyConsentAfter")}
        </span>
      </label>

      {/* Transparencia GDPR: versión de política vigente */}
      {policyVersion ? <p className="rv2-policyver">{t("rsvp.policyVersion", { version: policyVersion })}</p> : null}

      {showHealthConsent ? (
        <label className="rv2-check">
          <input
            type="checkbox"
            checked={form.healthConsent}
            required={showHealthConsent}
            onChange={(e) => onField("healthConsent", e.target.checked)}
            disabled={frozen}
          />
          <span>{t("rsvp.healthConsent")}</span>
        </label>
      ) : null}

      {signatureEnabled && !frozen ? (
        <label className="rv2-check">
          <input
            type="checkbox"
            checked={form.digitalSignature}
            onChange={(e) => onField("digitalSignature", e.target.checked)}
            disabled={disabled}
          />
          <span>{t("rsvp.digitalSignature")}</span>
        </label>
      ) : null}

    </div>
  );
});

export default ConsentsBlock;
