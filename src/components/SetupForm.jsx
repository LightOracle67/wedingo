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

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES, MONTH_OPTIONS } from "../lib/constants";
import { uploadImage, addGalleryImage } from "../lib/image-store";
import CollapsibleSection from "./CollapsibleSection";
import SectionOrderEditor from "./SectionOrderEditor";
import ThemePicker from "./ThemePicker";
import GalleryManager from "./GalleryManager";

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
    formData, updateFormField, handleSaveSetup, handleDayChange,
    handleHourChange, handleMinuteChange, handleMinuteBlur, handleYearChange,
    handleBackgroundUpload, handleClearBackground,
    handleSelectPreviewBackground, previewBackgrounds,
    saveMessage, saveError, maxAllowedYear, isTokenVerified, inviteToken, hasStoredConfig, setLegalModal,
  } = useApp();

  const { addToast, startUploadToast } = useToast();
  const { t } = useTranslation();

  /** Referencias a los inputs de archivo para resetearlos tras subida. */
  const photoRef = useRef(null);
  const galleryRef = useRef(null);

  // ── Muestra mensajes de éxito/error como toasts ─────────
  useEffect(() => {
    if (saveMessage) addToast("success", saveMessage);
  }, [saveMessage, addToast]);

  useEffect(() => {
    if (saveError) addToast("error", saveError);
  }, [saveError, addToast]);

  /**
   * Conjunto de secciones ocultas derivado del formulario.
   * Se memoiza para evitar re-cálculos en cada render.
   */
  const hiddenSet = useMemo(() => {
    const raw = formData.hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [formData.hiddenSections]);

  /** Genera un ID único con prefijo para evitar colisiones en páginas con múltiples formularios. */
  const id = (name) => `${prefix}${name}`;

  /**
   * Maneja la subida de la foto de pareja.
   * Valida tipo y tamaño, sube la imagen y actualiza el estado.
   *
   * @param {Event} e - Evento change del input file.
   */
  const handleCouplePhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) { addToast("error", t("setup.errorFileFormat")); return; }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) { addToast("error", t("setup.errorFileSize")); return; }
    const upload = startUploadToast(t("setup.photoUploading"));
    try {
      const { dataUrl } = await uploadImage(inviteToken, file, (p) => upload.update(p));
      upload.update(90);
      updateFormField("couplePhoto", dataUrl);
      upload.complete(t("setup.photoUploaded"));
    } catch {
      upload.error(t("setup.photoUploadFailed"));
    }
    if (input) input.value = "";
  }, [inviteToken, updateFormField, startUploadToast, addToast, t]);

  /**
   * Maneja la subida de múltiples imágenes a la galería.
   * Filtra archivos inválidos, sube cada uno y actualiza el estado.
   *
   * @param {Event} e - Evento change del input file múltiple.
   */
  const handleGalleryUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    const input = e.target;
    if (!files.length) return;
    const valid = files.filter(f => ALLOWED_UPLOAD_TYPES.has(f.type) && f.size <= MAX_UPLOAD_SIZE_BYTES);
    if (!valid.length) { addToast("error", t("setup.noValidFiles")); return; }
    // Acumula los dataUrls subidos para mostrarlos como miniaturas
    const currentImages = (() => {
      try { return JSON.parse(formData.galleryImages || "[]"); } catch { return []; }
    })();
    // Límite de 10 imágenes en la galería
    const MAX_GALLERY = 10;
    if (currentImages.length >= MAX_GALLERY) {
      addToast("error", t("setup.galleryMaxReached", { max: MAX_GALLERY }));
      if (input) input.value = "";
      return;
    }
    const remaining = MAX_GALLERY - currentImages.length;
    const toUpload = valid.slice(0, remaining);
    if (valid.length > remaining) {
      addToast("warning", t("setup.galleryTrimmed", { selected: valid.length, max: MAX_GALLERY }));
    }
    const upload = startUploadToast(t("setup.galleryUploading", { total: toUpload.length }));
    try {
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        // Cada archivo ocupa un segmento del progreso total (0→100).
        const fileBase = Math.round((i / toUpload.length) * 100);
        const fileSpan = Math.round(100 / toUpload.length);
        const onFileProgress = (p) => {
          // Escala el progreso del archivo (0–100) al rango del segmento.
          upload.update(fileBase + Math.round((p / 100) * fileSpan));
        };
        const { encrypted, dataUrl } = await uploadImage(inviteToken, file, onFileProgress);
        const saved = await addGalleryImage(inviteToken, encrypted, dataUrl, onFileProgress);
        // Guarda como objeto con ID para permitir editar descripción
        currentImages.push({ id: saved.id, url: saved.dataUrl, description: "" });
        updateFormField("galleryImages", JSON.stringify(currentImages));
      }
      upload.complete(t("setup.galleryUploadSuccess", { count: toUpload.length }));
    } catch {
      upload.error(t("setup.galleryUploadFailed"));
    }
    if (input) input.value = "";
  }, [inviteToken, formData.galleryImages, updateFormField, startUploadToast, addToast, t]);

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
        <label className="setup-label" htmlFor={id("adminUsername")}>
          {t("setup.usernameLabel")}
        </label>
        <input
          id={id("adminUsername")}
          className="setup-input"
          value={formData.adminUsername}
          /* Sanitiza el nombre de usuario: solo minúsculas, letras y números, máx 50 caracteres */
          onChange={(e) => updateFormField("adminUsername", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50))}
          placeholder={t("setup.usernamePlaceholder")}
          autoComplete="username"
          name="username"
        />
        <p className="setup-help">
          {t("setup.usernameHint")}
        </p>
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de portada: nombres, padrinos, mensaje, tema, fondo ── */}
      <CollapsibleSection
        title={t("setup.coverSectionTitle")}
        hint={t("setup.coverSectionHint")}
        defaultOpen
      >
        {/* ── Nombres de los novios ── */}
        <fieldset className="setup-name-group">
          <legend className="setup-label">{t("setup.namesLegend")}</legend>
          <div className="setup-name-grid">
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("firstName")}>{t("setup.firstNameLabel")}</label>
              <input
                id={id("firstName")}
                className="setup-input"
                value={formData.firstName}
                onChange={(e) => updateFormField("firstName", e.target.value.slice(0, 20))}
                placeholder={t("setup.namePlaceholder")}
                autoComplete="off"
              />
            </div>
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("secondName")}>{t("setup.secondNameLabel")}</label>
              <input
                id={id("secondName")}
                className="setup-input"
                value={formData.secondName}
                onChange={(e) => updateFormField("secondName", e.target.value.slice(0, 20))}
                placeholder={t("setup.namePlaceholder")}
                autoComplete="off"
              />
            </div>
          </div>
        </fieldset>

        {/* ── Padrinos ── */}
        <fieldset className="setup-name-group">
          <legend className="setup-label">{t("setup.godparentsLegend")}</legend>
          <div className="setup-name-grid">
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("godparent1")}>{t("setup.godparent1Label")}</label>
              <input id={id("godparent1")} className="setup-input" value={formData.godparent1} onChange={(e) => updateFormField("godparent1", e.target.value.slice(0, 40))} placeholder={t("setup.namePlaceholder")} autoComplete="off" />
            </div>
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("godparent2")}>{t("setup.godparent2Label")}</label>
              <input id={id("godparent2")} className="setup-input" value={formData.godparent2} onChange={(e) => updateFormField("godparent2", e.target.value.slice(0, 40))} placeholder={t("setup.namePlaceholder")} autoComplete="off" />
            </div>
          </div>
          <p className="setup-help">{t("setup.godparentsHint")}</p>
        </fieldset>

        {/* ── Mensaje de invitación ── */}
        <label className="setup-label" htmlFor={id("inviteMessage")}>
          {t("setup.messageLabel")}
        </label>
        <textarea
          id={id("inviteMessage")}
          className="setup-textarea"
          value={formData.inviteMessage}
          onChange={(e) => updateFormField("inviteMessage", e.target.value.slice(0, 220))}
          placeholder={t("setup.messagePlaceholder")}
        />

        {/* ── Selector de tema con grupos colapsables ── */}
        <p className="setup-label">{t("setup.themeLabel")}</p>
        <ThemePicker value={formData.theme} onChange={(val) => updateFormField("theme", val)} t={t} />

        {/* ── Panel de subida de fondo personalizado ── */}
        <div className="setup-background-panel">
          <div className="setup-background-panel__header">
            <div>
              <p className="setup-label setup-label--tight">{t("setup.backgroundLabel")}</p>
              <p className="setup-help setup-help--tight">
                {t("setup.backgroundText")}
              </p>
            </div>
            {/* Botón para eliminar el fondo actual (solo si hay uno) */}
            {formData.backgroundImage ? (
              <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClearBackground}>
                {t("setup.removeBackground")}
              </button>
            ) : null}
          </div>

          {/* Zona de drop/upload */}
          <label className="setup-upload" htmlFor={id("backgroundUpload")}>
            <span className="setup-upload__title">{t("setup.uploadTitle")}</span>
            <span className="setup-upload__subtitle">{t("setup.uploadSubtitle")}</span>
          </label>
          <input id={id("backgroundUpload")} className="setup-upload__input" type="file" accept={[...ALLOWED_UPLOAD_TYPES].join(",")} onChange={handleBackgroundUpload} />

          {/* Previsualización de la imagen seleccionada */}
          {formData.backgroundImage ? (
            <div className="setup-selected-background">
              <img src={formData.backgroundImage} alt={t("setup.currentBackground")} className="setup-selected-background__image" />
              <div>
                <p className="setup-selected-background__title">{t("setup.currentBackground")}</p>
                <p className="setup-help setup-help--tight">{formData.backgroundImageLabel || t("setup.selectedImage")}</p>
              </div>
            </div>
          ) : null}

          {/* Grid de fondos predefinidos desde el mapa */}
          {previewBackgrounds.length ? (
            <div className="setup-background-grid">
              {previewBackgrounds.filter((bg) => bg.id !== "default").map((bg) => (
                <button
                  key={bg.id}
                  className="setup-background-card"
                  type="button"
                  onClick={() => handleSelectPreviewBackground(bg.src, `${formData.weddingPlace} · ${bg.label}`)}
                >
                  <img src={bg.src} alt={bg.label} className="setup-background-card__image" />
                  <span className="setup-background-card__title">{bg.label}</span>
                  <span className="setup-background-card__description">{bg.description}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* ── Subida de foto de pareja ── */}
        <div className="setup-background-panel" style={{ marginTop: "0.75rem" }}>
          <p className="setup-label">{t("setup.couplePhotoLabel")}</p>
          <label className="setup-upload" htmlFor={id("couplePhoto")}>
            <span className="setup-upload__title">{t("setup.couplePhotoUpload")}</span>
            <span className="setup-upload__subtitle">{t("setup.couplePhotoHint")}</span>
          </label>
          <input ref={photoRef} id={id("couplePhoto")} className="setup-upload__input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCouplePhotoUpload} />
          {formData.couplePhoto ? (
            <div className="setup-selected-background">
              <img src={formData.couplePhoto} alt={t("setup.couplePhotoLabel")} className="setup-selected-background__image" style={{ borderRadius: "50%", aspectRatio: "1", width: "5rem" }} />
              <div>
                <p className="setup-selected-background__title">{t("setup.currentPhoto")}</p>
                <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => { updateFormField("couplePhoto", ""); updateFormField("couplePhotoStorage", ""); }}>{t("setup.remove")}</button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── URL de música de fondo ── */}
        <label className="setup-label" htmlFor={id("musicUrl")}>{t("setup.musicLabel")}</label>
        <input id={id("musicUrl")} className="setup-input" value={formData.musicUrl} onChange={(e) => updateFormField("musicUrl", e.target.value.slice(0, 500))} placeholder={t("setup.musicPlaceholder")} autoComplete="off" />
        <p className="setup-help">{t("setup.musicHint")}</p>
      </CollapsibleSection>

      {/* ── Sección de fecha y lugar (si no está oculta) ── */}
      {!hiddenSet.has("details") ? (
      <CollapsibleSection
        title={t("setup.dateSectionTitle")}
        hint={t("setup.dateSectionHint")}
      >
        {/* ── Búsqueda de lugar con geolocalización ── */}
        <label className="setup-label" htmlFor={id("weddingPlace")}>
          {t("setup.placeLabel")}
        </label>
        <div style={{ position: "relative" }}>
          <input
            id={id("weddingPlace")}
            className="setup-input"
            value={formData.weddingPlace}
            onChange={(e) => {
              const val = e.target.value.slice(0, 120);
              updateFormField("weddingPlace", val);
              // Resetea coordenadas al cambiar el lugar manualmente
              updateFormField("weddingLatitude", "");
              updateFormField("weddingLongitude", "");
              // Búsqueda dinámica de ubicaciones (mínimo 3 caracteres)
              if (val.length >= 3) {
                import("../lib/geo-utils").then(({ searchLocations }) => {
                  searchLocations(val).then(results => {
                    const el = document.getElementById("weddingPlaceResults");
                    if (el) {
                      el.textContent = "";
                      results.forEach(r => {
                        const btn = document.createElement("button");
                        btn.type = "button";
                        btn.style.cssText = "display:block;width:100%;text-align:left;padding:0.5rem 0.6rem;border:none;border-bottom:1px solid color-mix(in srgb,var(--setup-border) 50%,transparent);background:transparent;color:var(--setup-title);cursor:pointer;font-size:0.85rem;font-family:inherit";
                        btn.dataset.lat = r.latitude;
                        btn.dataset.lon = r.longitude;
                        btn.dataset.label = r.label;
                        btn.textContent = r.label;
                        // Al hacer clic, rellena el lugar y las coordenadas
                        btn.onclick = () => {
                          updateFormField("weddingPlace", r.label.slice(0, 120));
                          updateFormField("weddingLatitude", r.latitude);
                          updateFormField("weddingLongitude", r.longitude);
                          el.textContent = "";
                        };
                        el.appendChild(btn);
                      });
                    }
                  });
                });
              } else {
                // Limpia resultados si hay menos de 3 caracteres
                const el = document.getElementById("weddingPlaceResults");
                if (el) el.textContent = "";
              }
            }}
            /* Cierra el dropdown al perder el foco (con retraso para permitir clics) */
            onBlur={() => setTimeout(() => {
              const el = document.getElementById("weddingPlaceResults");
              if (el) el.textContent = "";
            }, 200)}
            placeholder={t("setup.placePlaceholder")}
            autoComplete="off"
          />
          {/* Dropdown de resultados de búsqueda */}
          <div id="weddingPlaceResults" style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
            background: "color-mix(in srgb, var(--setup-grad-start) 96%, transparent)",
            border: "1px solid var(--setup-border)", borderRadius: "0 0 0.7rem 0.7rem",
            maxHeight: "200px", overflowY: "auto",
          }} />
        </div>
        <p className="setup-help">{t("setup.placeHint")}</p>

        {/* ── Previsualización del mapa (imagen estática) ── */}
        {(() => {
          if (!previewBackgrounds.length) return null;
          const locationPreview = previewBackgrounds.find((bg) => bg.id === "default");
          if (!locationPreview) return null;
          return (
            <div className="setup-location-preview">
              <p className="setup-label setup-label--tight">{t("setup.mapPreview")}</p>
              <img src={locationPreview.src} alt={t("setup.mapPreview")} className="setup-location-preview__image" />
            </div>
          );
        })()}

        {/* ── Selectores de fecha: día, mes, año ── */}
        <div className="setup-date-grid">
          <div>
            <label className="setup-label" htmlFor={id("weddingDay")}>{t("setup.dayLabel")}</label>
            <input
              id={id("weddingDay")}
              className="setup-input"
              value={formData.weddingDay}
              onChange={(e) => handleDayChange(e.target.value)}
              placeholder={t("setup.dayPlaceholder")}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="setup-label" htmlFor={id("weddingMonth")}>{t("setup.monthLabel")}</label>
            <select
              id={id("weddingMonth")}
              className="setup-input"
              value={formData.weddingMonth}
              onChange={(e) => updateFormField("weddingMonth", e.target.value)}
            >
              <option value="" disabled>{t("setup.monthPlaceholder")}</option>
              {MONTH_OPTIONS.map((mo) => (
                <option key={mo.value} value={mo.value}>{mo.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="setup-label" htmlFor={id("weddingYear")}>{t("setup.yearLabel")}</label>
            <input
              id={id("weddingYear")}
              className="setup-input"
              value={formData.weddingYear}
              onChange={(e) => handleYearChange(e.target.value)}
              placeholder={t("setup.yearPlaceholder")}
              autoComplete="off"
            />
            <p className="setup-help">{t("setup.yearMaxHint", { year: maxAllowedYear })}</p>
          </div>
        </div>

        {/* ── Selectores de hora: hora, minuto ── */}
        <div className="setup-date-grid">
          <div>
            <label className="setup-label" htmlFor={id("weddingHour")}>{t("setup.hourLabel")}</label>
            <input
              id={id("weddingHour")}
              className="setup-input"
              value={formData.weddingHour}
              onChange={(e) => handleHourChange(e.target.value)}
              placeholder={t("setup.hourPlaceholder")}
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="setup-help">{t("setup.hourHint")}</p>
          </div>
          <div>
            <label className="setup-label" htmlFor={id("weddingMinute")}>{t("setup.minuteLabel")}</label>
            <input
              id={id("weddingMinute")}
              className="setup-input"
              value={formData.weddingMinute}
              onChange={(e) => handleMinuteChange(e.target.value)}
              onBlur={handleMinuteBlur}
              placeholder={t("setup.minutePlaceholder")}
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="setup-help">{t("setup.minuteHint")}</p>
          </div>
        </div>

        {/* ── Cronograma del evento ── */}
        <label className="setup-label" htmlFor={id("weddingSchedule")}>
          {t("setup.scheduleLabel")}
        </label>
        <textarea
          id={id("weddingSchedule")}
          className="setup-textarea"
          value={formData.weddingSchedule}
          onChange={(e) => updateFormField("weddingSchedule", e.target.value.slice(0, 2000))}
          placeholder={t("setup.schedulePlaceholder")}
          rows={4}
        />
        <p className="setup-help">{t("setup.scheduleHint")}</p>

        {/* ── Código de vestimenta ── */}
        <label className="setup-label">{t("setup.dressCodeLabel")}</label>
        <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
          {[
            { value: "Traje de gala", key: "setup.dressCodeGala" },
            { value: "Etiqueta informal", key: "setup.dressCodeCasual" },
            { value: "Vestimenta formal", key: "setup.dressCodeFormal" },
            { value: "Cóctel elegante", key: "setup.dressCodeCocktail" },
            { value: "Ropa cómoda", key: "setup.dressCodeComfortable" },
          ].map(({ value, key }) => (
            <label key={value} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
              <input type="checkbox" checked={formData.weddingDressCode === value} onChange={() => updateFormField("weddingDressCode", formData.weddingDressCode === value ? "" : value)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
              {t(key)}
            </label>
          ))}
        </div>
        <p className="setup-help">{t("setup.dressCodeHint")}</p>

        {/* ── Información de alojamiento ── */}
        <label className="setup-label" htmlFor={id("accommodationInfo")}>
          {t("setup.accommodationLabel")}
        </label>
        <textarea
          id={id("accommodationInfo")}
          className="setup-textarea"
          value={formData.accommodationInfo}
          onChange={(e) => updateFormField("accommodationInfo", e.target.value.slice(0, 2000))}
          placeholder={t("setup.accommodationPlaceholder")}
          rows={4}
        />
        <p className="setup-help">{t("setup.accommodationHint")}</p>

        {/* ── Información de transporte ── */}
        <label className="setup-label" htmlFor={id("transportInfo")}>
          {t("setup.transportLabel")}
        </label>
        <textarea
          id={id("transportInfo")}
          className="setup-textarea"
          value={formData.transportInfo}
          onChange={(e) => updateFormField("transportInfo", e.target.value.slice(0, 2000))}
          placeholder={t("setup.transportPlaceholder")}
          rows={4}
        />
        <p className="setup-help">{t("setup.transportHint")}</p>
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de invitados y menú (si no está oculta) ── */}
      {!hiddenSet.has("info") ? (
      <CollapsibleSection
        title={t("setup.guestsSectionTitle")}
        hint={t("setup.guestsSectionHint")}
      >
        {/* ── Política de niños ── */}
        <label className="setup-label">{t("setup.kidsLabel")}</label>
        <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {[
            { value: "Bienvenidos con zona de juegos", key: "setup.kidsWelcome" },
            { value: "Bienvenidos bajo supervisión", key: "setup.kidsSupervised" },
            { value: "Solo para adultos", key: "setup.kidsAdultOnly" },
          ].map(({ value, key }) => (
            <label key={value} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
              <input type="checkbox" checked={formData.kidsPolicy === value} onChange={() => updateFormField("kidsPolicy", formData.kidsPolicy === value ? "" : value)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
              {t(key)}
            </label>
          ))}
        </div>
        <p className="setup-help">{t("setup.kidsHint")}</p>

        <div className="story-divider" style={{ margin: "0.75rem 0" }} />
        <label className="setup-label" style={{ marginBottom: "0.3rem", display: "block" }}>{t("setup.menuCelebrationLabel")}</label>

        {/* ── Toggle de menú habilitado ── */}
        <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.9rem", cursor: "pointer", marginBottom: "0.5rem" }}>
          <input type="checkbox" checked={formData.menuEnabled === "true"} onChange={(e) => updateFormField("menuEnabled", e.target.checked ? "true" : "false")} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
          <span>{t("setup.menuEnabledLabel")}</span>
        </label>

        {/* ── Opciones de menú (carne, pescado, vegano, postre) ── */}
        {formData.menuEnabled === "true" ? (
          <>
            <p className="setup-help" style={{ marginBottom: "0.4rem" }}>{t("setup.menuHint")}</p>
            {[
              { key: "menuCarne", labelKey: "setup.menuCarneLabel", phKey: "setup.menuCarnePlaceholder" },
              { key: "menuPescado", labelKey: "setup.menuPescadoLabel", phKey: "setup.menuPescadoPlaceholder" },
              { key: "menuVegano", labelKey: "setup.menuVeganoLabel", phKey: "setup.menuVeganoPlaceholder" },
            ].map(({ key, labelKey, phKey }) => {
              // Solo muestra el textarea si la opción está seleccionada
              const val = formData[key] || "";
              return (
                <div key={key} style={{ marginBottom: "0.5rem" }}>
                  <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--setup-title)" }}>
                    <input type="checkbox" checked={!!val} onChange={(e) => { if (!e.target.checked) updateFormField(key, ""); }} style={{ accentColor: "var(--setup-accent)", width: "0.9rem", height: "0.9rem", flexShrink: 0 }} />
                    {t(labelKey)}
                  </label>
                  {!!val && <textarea className="setup-textarea" value={val} onChange={(e) => updateFormField(key, e.target.value)} placeholder={t(phKey)} rows={2} style={{ marginTop: "0.15rem", fontSize: "0.85rem" }} />}
                </div>
              );
            })}
            <div style={{ marginBottom: "0.5rem" }}>
              <p className="setup-label" style={{ fontSize: "0.85rem", marginBottom: "0.2rem" }}>{t("setup.postreLabel")}</p>
              <textarea className="setup-textarea" value={formData.menuPostre || ""} onChange={(e) => updateFormField("menuPostre", e.target.value)} placeholder={t("setup.postrePlaceholder")} rows={2} style={{ fontSize: "0.85rem" }} />
            </div>
            <p className="setup-help">{t("setup.menuRequiredText")}</p>
          </>
        ) : (
          /* ── Texto libre de menú (si no está habilitado el menú estructurado) ── */
          <>
            <textarea className="setup-textarea" value={formData.menuTexto} onChange={(e) => updateFormField("menuTexto", e.target.value.slice(0, 2000))} placeholder={t("setup.menuTextoPlaceholder")} rows={3} />
            <p className="setup-help">{t("setup.menuTextoHint")}</p>
          </>
        )}
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de historia de los novios (si no está oculta) ── */}
      {!hiddenSet.has("story") ? (
      <CollapsibleSection
        title={t("setup.storySectionTitle")}
        hint={t("setup.storySectionHint")}
      >
        <label className="setup-label" htmlFor={id("storyText")}>
          {t("setup.storyLabel")}
        </label>
        <textarea
          id={id("storyText")}
          className="setup-textarea"
          value={formData.storyText}
          onChange={(e) => updateFormField("storyText", e.target.value.slice(0, 2000))}
          placeholder={t("setup.storyPlaceholder")}
          rows={4}
        />
        <p className="setup-help">{t("setup.storyHint")}</p>
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de regalos (si no está oculta) ── */}
      {!hiddenSet.has("gifts") ? (
      <CollapsibleSection
        title={t("setup.giftsSectionTitle")}
        hint={t("setup.giftsSectionHint")}
      >
        <label className="setup-label" htmlFor={id("giftsInfo")}>
          {t("setup.giftsInfoLabel")}
        </label>
        <textarea
          id={id("giftsInfo")}
          className="setup-textarea"
          value={formData.giftsInfo}
          onChange={(e) => updateFormField("giftsInfo", e.target.value.slice(0, 2000))}
          placeholder={t("setup.giftsInfoPlaceholder")}
          rows={4}
        />
        <p className="setup-help">{t("setup.giftsInfoHint")}</p>

        {/* ── Información bancaria (IBAN, etc.) - se encripta antes de guardar ── */}
        <label className="setup-label" htmlFor={id("bankInfo")}>
          {t("setup.bankInfoLabel")}
        </label>
        <input
          id={id("bankInfo")}
          className="setup-input"
          value={formData.bankInfo}
          onChange={(e) => updateFormField("bankInfo", e.target.value.slice(0, 100))}
          placeholder={t("setup.bankInfoPlaceholder")}
          autoComplete="off"
        />
        <p className="setup-help">{t("setup.bankInfoHint")}</p>
      </CollapsibleSection>
      ) : null}

      {/* ── Sección de galería de fotos (si no está oculta) ── */}
      {!hiddenSet.has("gallery") ? (
      <CollapsibleSection
        title={t("setup.gallerySectionTitle")}
        hint={t("setup.gallerySectionHint")}
      >
        <label className="setup-upload" htmlFor={id("galleryUpload")}>
          <span className="setup-upload__title">{t("setup.galleryUploadLabel")}</span>
          <span className="setup-upload__subtitle">{t("setup.galleryUploadHint")}</span>
        </label>
        <input ref={galleryRef} id={id("galleryUpload")} className="setup-upload__input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleGalleryUpload} />
        <GalleryManager images={formData.galleryImages} onChange={(val) => updateFormField("galleryImages", val)} inviteToken={inviteToken} onUpload={handleGalleryUpload} id={id} t={t} />
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
      <div className="setup-actions" style={{ padding: "0.25rem 0" }}>
        <button className="setup-button" type="submit">
          {t("common.save")}
        </button>
      </div>
    </form>
  );
}
