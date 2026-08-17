/**
 * SetupForm.jsx
 * ─────────────────────────────────────────────────────────────
 * Formulario principal de configuración de la invitación de boda.
 * Contiene todos los campos editables: portada, fecha, menú,
 * galería, regalos, etc.
 *
 * Cada sección se renderiza dentro de un CollapsibleSection.
 * Soporta validación de archivos, subida de imágenes y vista
 * previa de mapa.
 *
 * @module SetupForm
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {useConfig, useAuth, useAppUI, useFormField} from "../contexts";
import { useToast } from "../hooks/useToast";
import CollapsibleSection from "./CollapsibleSection";
import SectionOrderEditor from "./SectionOrderEditor";
import AccessSectionForm from "./setup-forms/AccessSectionForm";
import CoverSectionForm from "./setup-forms/CoverSectionForm";
import DateSectionForm from "./setup-forms/DateSectionForm";
import TransportSectionForm from "./setup-forms/TransportSectionForm";
import GuestsSectionForm from "./setup-forms/GuestsSectionForm";
import StorySectionForm from "./setup-forms/StorySectionForm";
import GiftsSectionForm from "./setup-forms/GiftsSectionForm";
import ExtrasSectionForm from "./setup-forms/ExtrasSectionForm";
import AnimationsSectionForm from "./setup-forms/AnimationsSectionForm";
import GallerySectionForm from "./setup-forms/GallerySectionForm";
import "../styles/admin.css";

/**
 * Componente del formulario de configuración.
 *
 * @param {{ prefix?: string }} props - Prefijo opcional para IDs de campos
 *                                      (útil cuando hay múltiples formularios en la página).
 * @returns {JSX.Element} Formulario con todas las secciones de configuración.
 */
export default function SetupForm({ prefix = "" }) {
  const { t } = useTranslation();
  // Ref al <form> real: .setup-form también lo usan los div contenedores de
  // SetupPage/AdminPage, por lo que un querySelector podía devolver un <div>
  // sin requestSubmit() y lanzar un TypeError al pulsar Ctrl/Cmd+Enter.
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (formRef.current) formRef.current.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);
  // ─── Extrae estado y handlers del contexto global (hooks granulares) ──
  const { updateFormField, handleSaveSetup, hasStoredConfig, isSaving, handleResetForm } = useConfig();
  const _privacyConsent = useFormField("_privacyConsent");
  const hiddenSections = useFormField("hiddenSections");
  const sectionOrder = useFormField("sectionOrder");
  const { isTokenVerified, isRestoringSession } = useAuth();
  const { saveMessage, saveError, setLegalModal } = useAppUI();
  const { addToast } = useToast();

  /** Confirmación de haber guardado el token de acceso (solo primer guardado). */
  const [tokenAcknowledged, setTokenAcknowledged] = useState(false);

  // ── Muestra mensajes de éxito/error como toasts ─────────
  useEffect(() => {
    if (saveMessage) {
      addToast("success", saveMessage);
    }
  }, [saveMessage, addToast]);

  useEffect(() => {
    if (saveError) {
      console.error("[app]", "[SetupForm]", "save error", { error: saveError });
      addToast("error", saveError);
    }
  }, [saveError, addToast]);

  /**
   * En el primer guardado el token de acceso es obligatorio confirmar:
   * no se permite guardar hasta marcar el checkbox de confirmación.
   */
  const handleSubmit = (e: React.FormEvent) => {
    if (!hasStoredConfig && !tokenAcknowledged) {
      e.preventDefault();
      addToast("error", t("setup.tokenAcknowledgeRequired"));
      return;
    }
    handleSaveSetup(e);
  };

  /**
   * Conjunto de secciones ocultas derivado del formulario.
   * Se memoiza para evitar re-cálculos en cada render.
   */
  const hiddenSet = useMemo(() => {
    const raw = hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [hiddenSections]);

  return (
    <form ref={formRef} className="setup-form setup-form--nested" onSubmit={handleSubmit} aria-busy={isSaving || undefined}>
      {/* ── Editor de orden de secciones ── */}
      <SectionOrderEditor
        value={sectionOrder}
        onChange={updateFormField}
        hiddenValue={hiddenSections}
        onHiddenChange={updateFormField}
      />

      {/* ── Sección de acceso (solo visible antes del primer guardado) ── */}

      {isRestoringSession ? null : !isTokenVerified ? (
        <CollapsibleSection title={t("setup.accessSectionTitle")} hint={t("setup.accessSectionHint")} defaultOpen>
          <AccessSectionForm
            prefix={prefix}
            tokenAcknowledged={tokenAcknowledged}
            onTokenAcknowledge={setTokenAcknowledged}
          />
        </CollapsibleSection>
      ) : null}

      {/* ── Sección de portada: nombres, padrinos, mensaje, tema, fondo ── */}

      <CollapsibleSection title={t("setup.coverSectionTitle")} hint={t("setup.coverSectionHint")} defaultOpen>
        <CoverSectionForm prefix={prefix} />
      </CollapsibleSection>

      {/* ── Sección de fecha y lugar (si no está oculta) ── */}

      {!hiddenSet.has("details") ? (
        <CollapsibleSection title={t("setup.dateSectionTitle")} hint={t("setup.dateSectionHint")}>
          <DateSectionForm prefix={prefix} />
        </CollapsibleSection>
      ) : null}

      {/* ── Sección de transporte (si no está oculta) ── */}

      {!hiddenSet.has("transport") ? (
        <CollapsibleSection title={t("setup.transportSectionTitle")} hint={t("setup.transportSectionHint")}>
          <TransportSectionForm prefix={prefix} />
        </CollapsibleSection>
      ) : null}

      {/* ── Sección de invitados y menú (si no está oculta) ── */}

      {!hiddenSet.has("info") ? (
        <CollapsibleSection title={t("setup.guestsSectionTitle")} hint={t("setup.guestsSectionHint")}>
          <GuestsSectionForm prefix={prefix} />
        </CollapsibleSection>
      ) : null}

      {/* ── Sección de historia de los novios (si no está oculta) ── */}

      {!hiddenSet.has("story") ? (
        <CollapsibleSection title={t("setup.storySectionTitle")} hint={t("setup.storySectionHint")}>
          <StorySectionForm prefix={prefix} />
        </CollapsibleSection>
      ) : null}

      {/* ── Sección de regalos (si no está oculta) ── */}

      {!hiddenSet.has("gifts") ? (
        <CollapsibleSection title={t("setup.giftsSectionTitle")} hint={t("setup.giftsSectionHint")}>
          <GiftsSectionForm prefix={prefix} />
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection title={t("setup.extrasSectionTitle")} hint={t("setup.extrasSectionHint")}>
        <ExtrasSectionForm prefix={prefix} />
      </CollapsibleSection>

      {/* ── Sección de animaciones ── */}

      <CollapsibleSection title={t("setup.animationsSectionTitle")} hint={t("setup.animationsSectionHint")}>
        <AnimationsSectionForm prefix={prefix} />
      </CollapsibleSection>

      {/* ── Sección de galería de fotos (si no está oculta) ── */}

      {!hiddenSet.has("gallery") ? (
        <CollapsibleSection title={t("setup.gallerySectionTitle")} hint={t("setup.gallerySectionHint")}>
          <GallerySectionForm />
        </CollapsibleSection>
      ) : null}

      {/* ── Consentimiento de privacidad (solo primer guardado) ── */}
      {!hasStoredConfig ? (
        <label className="setup-checkbox-label" htmlFor="privacyConsent">
          <input
            id="privacyConsent"
            type="checkbox"
            checked={_privacyConsent === "true"}
            onChange={(e) => updateFormField("_privacyConsent", e.target.checked ? "true" : "false")}
            style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
          />
          <span>
            {t("setup.privacyConsentBefore")}
            {/* Enlace a la política fuera del label (HTML válido, teclado y SR). */}
            <span
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLegalModal("privacy");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLegalModal("privacy");
                }
              }}
              style={{
                color: "var(--setup-accent)",
                textDecoration: "underline",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "inherit",
                padding: 0,
              }}
            >
              {t("public.privacyPolicy")}
            </span>
            {t("setup.privacyConsentAfter")}
          </span>
        </label>
      ) : null}

      {/* ── Botones de guardar y restablecer ── */}

      <div className="setup-actions setup-actions--sticky" style={{ background: 0, WebkitBackdropFilter: "unset" }}>
        <button
          className="setup-button setup-button--ghost"
          type="button"
          onClick={handleResetForm}
          disabled={isSaving}
        >
          {t("setup.resetButton")}
        </button>
        <button className="setup-button" type="submit" disabled={(!hasStoredConfig && !tokenAcknowledged) || isSaving}>
          {isSaving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
