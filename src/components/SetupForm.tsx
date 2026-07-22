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

import { useEffect, useMemo, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../hooks/useToast";
import CollapsibleSection from "./CollapsibleSection";
import SectionOrderEditor from "./SectionOrderEditor";
import AccessSectionForm from "./setup-forms/AccessSectionForm";
import CoverSectionForm from "./setup-forms/CoverSectionForm";
import DateSectionForm from "./setup-forms/DateSectionForm";
import GuestsSectionForm from "./setup-forms/GuestsSectionForm";
import StorySectionForm from "./setup-forms/StorySectionForm";
import GiftsSectionForm from "./setup-forms/GiftsSectionForm";
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
  // ─── Extrae estado y handlers del contexto global ───────
  const {
    formData, updateFormField, handleSaveSetup,
    saveMessage, saveError, isTokenVerified, hasStoredConfig, setLegalModal,
  } = useApp();
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();
  const { t } = useTranslation();

  // ── Muestra mensajes de éxito/error como toasts ─────────
  useEffect(() => {
    if (saveMessage) { addToast("success", saveMessage); setSaving(false); }
  }, [saveMessage, addToast]);

  useEffect(() => {
    if (saveError) { addToast("error", saveError); setSaving(false); }
  }, [saveError, addToast]);

  /**
   * Conjunto de secciones ocultas derivado del formulario.
   * Se memoiza para evitar re-cálculos en cada render.
   */
  const hiddenSet = useMemo(() => {
    const raw = formData.hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [formData.hiddenSections]);

  return (
    <form className="setup-form setup-form--nested" onSubmit={handleSaveSetup}>
      {/* ── Editor de orden de secciones ── */}
      <SectionOrderEditor
        value={formData.sectionOrder}
        onChange={updateFormField}
        hiddenValue={formData.hiddenSections}
        onHiddenChange={updateFormField}
      />

      {/* ── Sección de acceso (solo visible antes del primer guardado) ── */}
      {!isTokenVerified ? (
      <CollapsibleSection
        title={t("setup.accessSectionTitle")}
        hint={t("setup.accessSectionHint")}
        defaultOpen
      >
        <AccessSectionForm prefix={prefix} />
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de portada: nombres, padrinos, mensaje, tema, fondo ── */}
      <CollapsibleSection
        title={t("setup.coverSectionTitle")}
        hint={t("setup.coverSectionHint")}
        defaultOpen
      >
        <CoverSectionForm prefix={prefix} />
      </CollapsibleSection>

      {/* ── Sección de fecha y lugar (si no está oculta) ── */}
      {!hiddenSet.has("details") ? (
      <CollapsibleSection
        title={t("setup.dateSectionTitle")}
        hint={t("setup.dateSectionHint")}
      >
        <DateSectionForm prefix={prefix} />
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de invitados y menú (si no está oculta) ── */}
      {!hiddenSet.has("info") ? (
      <CollapsibleSection
        title={t("setup.guestsSectionTitle")}
        hint={t("setup.guestsSectionHint")}
      >
        <GuestsSectionForm prefix={prefix} />
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de historia de los novios (si no está oculta) ── */}
      {!hiddenSet.has("story") ? (
      <CollapsibleSection
        title={t("setup.storySectionTitle")}
        hint={t("setup.storySectionHint")}
      >
        <StorySectionForm prefix={prefix} />
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de regalos (si no está oculta) ── */}
      {!hiddenSet.has("gifts") ? (
      <CollapsibleSection
        title={t("setup.giftsSectionTitle")}
        hint={t("setup.giftsSectionHint")}
      >
        <GiftsSectionForm prefix={prefix} />
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de galería de fotos (si no está oculta) ── */}
      {!hiddenSet.has("gallery") ? (
      <CollapsibleSection
        title={t("setup.gallerySectionTitle")}
        hint={t("setup.gallerySectionHint")}
      >
        <GallerySectionForm />
      </CollapsibleSection>
      ) : null}

      {/* ── Consentimiento de privacidad (solo primer guardado) ── */}
      {!hasStoredConfig ? (
        <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: "pointer" }}>
          <input type="checkbox" checked={formData._privacyConsent === "true"} onChange={(e) => updateFormField("_privacyConsent", e.target.checked ? "true" : "false")} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
          <Trans i18nKey="setup.privacyConsent" components={{ link: <button type="button" onClick={() => setLegalModal("privacy")} style={{ color: "var(--setup-accent)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }} /> }} />
        </label>
      ) : null}

      {/* ── Botón de guardar ── */}
      <div className="setup-actions">
        <button className="setup-button" type="submit" disabled={saving} onClick={() => setSaving(true)}>
          {saving ? <span className="page-loading" style={{ width: "1.2rem", height: "1.2rem", display: "inline-block", verticalAlign: "middle", minHeight: 0 }} /> : t("common.save")}
        </button>
      </div>
    </form>
  );
}
