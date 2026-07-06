import { useCallback, useEffect, useMemo, useRef } from "react";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES, MONTH_OPTIONS, THEME_GROUPS, THEME_OPTIONS, THEME_PREVIEW_COLORS } from "../lib/constants";
import { compressImage } from "../lib/image-utils";
import CollapsibleSection from "./CollapsibleSection";
import SectionOrderEditor from "./SectionOrderEditor";

export default function SetupForm({ prefix = "" }) {
  const {
    formData, updateFormField, handleSaveSetup, handleDayChange,
    handleHourChange, handleMinuteChange, handleMinuteBlur, handleYearChange,
    handleCoordinateChange, handleBackgroundUpload, handleClearBackground,
    handleSelectPreviewBackground, previewBackgrounds,
    saveMessage, saveError, maxAllowedYear, isTokenVerified, inviteToken, hasStoredConfig, setLegalModal,
  } = useApp();

  const { addToast } = useToast();
  const photoRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    if (saveMessage) addToast("success", saveMessage);
  }, [saveMessage, addToast]);

  useEffect(() => {
    if (saveError) addToast("error", saveError);
  }, [saveError, addToast]);

  const hiddenSet = useMemo(() => {
    const raw = formData.hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [formData.hiddenSections]);

  const id = (name) => `${prefix}${name}`;

  const handleCouplePhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) { addToast("error", "Formato no permitido. Usa JPG o PNG."); return; }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) { addToast("error", "La imagen supera 20 MB."); return; }
    try {
      const dataUrl = await compressImage(file);
      const { uploadBackgroundImage } = await import("../lib/storage-utils");
      const { downloadUrl } = await uploadBackgroundImage(inviteToken, dataUrl);
      updateFormField("couplePhoto", downloadUrl);
      updateFormField("couplePhotoStorage", `invitations/${inviteToken}/couplePhoto.${dataUrl.startsWith("data:image/png") ? "png" : "jpg"}`);
      addToast("success", "Foto subida correctamente.");
    } catch { addToast("error", "No se pudo subir la foto."); }
    e.target.value = "";
  }, [inviteToken, updateFormField, addToast]);

  const handleGalleryUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const valid = files.filter(f => ALLOWED_UPLOAD_TYPES.has(f.type) && f.size <= MAX_UPLOAD_SIZE_BYTES);
    if (!valid.length) { addToast("error", "Ningún archivo válido. Máximo 20 MB, JPG/PNG."); return; }
    try {
      const existing = (() => { try { return JSON.parse(formData.galleryImages || "[]"); } catch { return []; } })();
      const { uploadBackgroundImage } = await import("../lib/storage-utils");
      for (const file of valid) {
        const dataUrl = await compressImage(file);
        const { downloadUrl } = await uploadBackgroundImage(inviteToken, dataUrl);
        existing.push(downloadUrl);
      }
      updateFormField("galleryImages", JSON.stringify(existing));
      addToast("success", `${valid.length} foto(s) subida(s) correctamente.`);
    } catch { addToast("error", "No se pudieron subir las fotos."); }
    e.target.value = "";
  }, [inviteToken, formData.galleryImages, updateFormField, addToast]);

  return (
    <form className="setup-form setup-form--nested" onSubmit={handleSaveSetup}>
      <SectionOrderEditor
        value={formData.sectionOrder}
        onChange={updateFormField}
        hiddenValue={formData.hiddenSections}
        onHiddenChange={updateFormField}
      />

      {!isTokenVerified ? (
      <CollapsibleSection
        title="Acceso"
        hint="Tu nombre de usuario"
        defaultOpen
      >
        <label className="setup-label" htmlFor={id("adminUsername")}>
          Nombre de usuario
        </label>
        <input
          id={id("adminUsername")}
          className="setup-input"
          value={formData.adminUsername}
          onChange={(e) => updateFormField("adminUsername", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50))}
          placeholder="Escribe un nombre de usuario"
          autoComplete="username"
          name="username"
        />
        <p className="setup-help">
          Usa letras y números. Lo necesitarás para acceder al panel cuando tu sesión expire.
        </p>
      </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        title="Portada"
        hint="Nombres, mensaje y tema"
        defaultOpen
      >
        <fieldset className="setup-name-group">
          <legend className="setup-label">Nombres</legend>
          <div className="setup-name-grid">
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("firstName")}>Primer contrayente</label>
              <input
                id={id("firstName")}
                className="setup-input"
                value={formData.firstName}
                onChange={(e) => updateFormField("firstName", e.target.value.slice(0, 20))}
                placeholder="Nombre"
                autoComplete="off"
              />
            </div>
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("secondName")}>Segundo contrayente</label>
              <input
                id={id("secondName")}
                className="setup-input"
                value={formData.secondName}
                onChange={(e) => updateFormField("secondName", e.target.value.slice(0, 20))}
                placeholder="Nombre"
                autoComplete="off"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="setup-name-group">
          <legend className="setup-label">Padrinos (opcional)</legend>
          <div className="setup-name-grid">
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("godparent1")}>Primer padrino/madrina</label>
              <input id={id("godparent1")} className="setup-input" value={formData.godparent1} onChange={(e) => updateFormField("godparent1", e.target.value.slice(0, 40))} placeholder="Nombre" autoComplete="off" />
            </div>
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("godparent2")}>Segundo padrino/madrina</label>
              <input id={id("godparent2")} className="setup-input" value={formData.godparent2} onChange={(e) => updateFormField("godparent2", e.target.value.slice(0, 40))} placeholder="Nombre" autoComplete="off" />
            </div>
          </div>
          <p className="setup-help">Si escribes un nombre, el otro también es obligatorio.</p>
        </fieldset>

        <label className="setup-label" htmlFor={id("inviteMessage")}>
          Mensaje principal
        </label>
        <textarea
          id={id("inviteMessage")}
          className="setup-textarea"
          value={formData.inviteMessage}
          onChange={(e) => updateFormField("inviteMessage", e.target.value.slice(0, 220))}
          placeholder="Escribe el mensaje de la invitación"
        />

        <p className="setup-label">Tema visual</p>
        {THEME_GROUPS.map((group) => (
          <CollapsibleSection key={group.value} title={group.label} hint={`${THEME_OPTIONS.filter((t) => t.group === group.value).length} temas`}>
            <div className="theme-picker__grid">
              {THEME_OPTIONS.filter((t) => t.group === group.value).map((theme) => {
                const colors = THEME_PREVIEW_COLORS[theme.value];
                return (
                  <button
                    key={theme.value}
                    type="button"
                    className={`theme-picker__card ${formData.theme === theme.value ? "theme-picker__card--active" : ""}`}
                    onClick={() => updateFormField("theme", theme.value)}
                    aria-pressed={formData.theme === theme.value}
                  >
                    <span
                      className="theme-picker__swatch"
                      style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg} 50%, ${colors.accent} 100%)` }}
                    >
                      <span className="theme-picker__dot" style={{ background: colors.accent }} />
                    </span>
                    <span className="theme-picker__info">
                      <span className="theme-picker__name">{theme.label}</span>
                      <span className="theme-picker__hint">{theme.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>
        ))}

        <div className="setup-background-panel">
          <div className="setup-background-panel__header">
            <div>
              <p className="setup-label setup-label--tight">Fondo de la portada</p>
              <p className="setup-help setup-help--tight">
                Sube una foto o elige un fondo para la portada.
              </p>
            </div>
            {formData.backgroundImage ? (
              <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClearBackground}>
                Quitar el fondo
              </button>
            ) : null}
          </div>

          <label className="setup-upload" htmlFor={id("backgroundUpload")}>
            <span className="setup-upload__title">Subir foto</span>
            <span className="setup-upload__subtitle">Máximo 20 MB. Se comprimirá automáticamente.</span>
          </label>
          <input id={id("backgroundUpload")} className="setup-upload__input" type="file" accept={[...ALLOWED_UPLOAD_TYPES].join(",")} onChange={handleBackgroundUpload} />

          {formData.backgroundImage ? (
            <div className="setup-selected-background">
              <img src={formData.backgroundImage} alt="Fondo seleccionado" className="setup-selected-background__image" />
              <div>
                <p className="setup-selected-background__title">Fondo actual</p>
                <p className="setup-help setup-help--tight">{formData.backgroundImageLabel || "Imagen seleccionada"}</p>
              </div>
            </div>
          ) : null}

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

        <div className="setup-background-panel" style={{ marginTop: "0.75rem" }}>
          <p className="setup-label">Foto de los novios</p>
          <label className="setup-upload" htmlFor={id("couplePhoto")}>
            <span className="setup-upload__title">Subir foto</span>
            <span className="setup-upload__subtitle">Foto de la pareja para la portada.</span>
          </label>
          <input ref={photoRef} id={id("couplePhoto")} className="setup-upload__input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCouplePhotoUpload} />
          {formData.couplePhoto ? (
            <div className="setup-selected-background">
              <img src={formData.couplePhoto} alt="" className="setup-selected-background__image" style={{ borderRadius: "50%", aspectRatio: "1", width: "5rem" }} />
              <div>
                <p className="setup-selected-background__title">Foto actual</p>
                <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => { updateFormField("couplePhoto", ""); updateFormField("couplePhotoStorage", ""); }}>Quitar</button>
              </div>
            </div>
          ) : null}
        </div>



        <label className="setup-label" htmlFor={id("musicUrl")}>Música de fondo</label>
        <input id={id("musicUrl")} className="setup-input" value={formData.musicUrl} onChange={(e) => updateFormField("musicUrl", e.target.value.slice(0, 500))} placeholder="https://example.com/cancion.mp3" autoComplete="off" />
        <p className="setup-help">Enlace a un archivo de audio MP3 para reproducir en la portada.</p>

        <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input type="checkbox" checked={formData.darkMode === "true"} onChange={(e) => updateFormField("darkMode", e.target.checked ? "true" : "false")} style={{ accentColor: "var(--setup-accent)", width: "1.1rem", height: "1.1rem" }} />
          <span style={{ color: "var(--setup-title)" }}>Modo oscuro</span>
        </label>
        <p className="setup-help">Fondo más oscuro independientemente del tema seleccionado.</p>
      </CollapsibleSection>

      {!hiddenSet.has("details") ? (
      <CollapsibleSection
        title="Lugar, Fecha y Hora"
        hint="Dónde, cuándo y a qué hora"
      >
        <label className="setup-label" htmlFor={id("weddingPlace")}>
          Lugar de la boda
        </label>
        <input
          id={id("weddingPlace")}
          className="setup-input"
          value={formData.weddingPlace}
          onChange={(e) => updateFormField("weddingPlace", e.target.value.slice(0, 120))}
          placeholder="Nombre o dirección del lugar de la celebración"
          autoComplete="off"
        />
        <p className="setup-help">
          Dirección del lugar. Si quieres más precisión, añade coordenadas.
        </p>

        <fieldset className="setup-name-group">
          <legend className="setup-label">Coordenadas del mapa (opcional)</legend>
          <div className="setup-date-grid">
            <div>
              <label className="setup-label" htmlFor={id("weddingLatitude")}>Latitud</label>
              <input
                id={id("weddingLatitude")}
                className="setup-input"
                value={formData.weddingLatitude}
                onChange={(e) => handleCoordinateChange("weddingLatitude", e.target.value)}
                placeholder="Ejemplo: 40.4168"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="setup-label" htmlFor={id("weddingLongitude")}>Longitud</label>
              <input
                id={id("weddingLongitude")}
                className="setup-input"
                value={formData.weddingLongitude}
                onChange={(e) => handleCoordinateChange("weddingLongitude", e.target.value)}
                placeholder="Ejemplo: -3.7038"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
          </div>
        </fieldset>

        {(() => {
          if (!previewBackgrounds.length) return null;
          const locationPreview = previewBackgrounds.find((bg) => bg.id === "default");
          if (!locationPreview) return null;
          return (
            <div className="setup-location-preview">
              <p className="setup-label setup-label--tight">Previsualización del mapa</p>
              <img src={locationPreview.src} alt="Mapa de la ubicación" className="setup-location-preview__image" />
            </div>
          );
        })()}

        <div className="setup-date-grid">
          <div>
            <label className="setup-label" htmlFor={id("weddingDay")}>Día</label>
            <input
              id={id("weddingDay")}
              className="setup-input"
              value={formData.weddingDay}
              onChange={(e) => handleDayChange(e.target.value)}
              placeholder="Ejemplo: 12"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="setup-label" htmlFor={id("weddingMonth")}>Mes</label>
            <select
              id={id("weddingMonth")}
              className="setup-input"
              value={formData.weddingMonth}
              onChange={(e) => updateFormField("weddingMonth", e.target.value)}
            >
              <option value="" disabled>Selecciona un mes</option>
              {MONTH_OPTIONS.map((mo) => (
                <option key={mo.value} value={mo.value}>{mo.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="setup-label" htmlFor={id("weddingYear")}>Año</label>
            <input
              id={id("weddingYear")}
              className="setup-input"
              value={formData.weddingYear}
              onChange={(e) => handleYearChange(e.target.value)}
              placeholder="Ejemplo: 2027"
              autoComplete="off"
            />
            <p className="setup-help">Máximo permitido: {maxAllowedYear}</p>
          </div>
        </div>

        <div className="setup-date-grid">
          <div>
            <label className="setup-label" htmlFor={id("weddingHour")}>Hora</label>
            <input
              id={id("weddingHour")}
              className="setup-input"
              value={formData.weddingHour}
              onChange={(e) => handleHourChange(e.target.value)}
              placeholder="Ejemplo: 14"
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="setup-help">De 0 a 23</p>
          </div>
          <div>
            <label className="setup-label" htmlFor={id("weddingMinute")}>Minutos</label>
            <input
              id={id("weddingMinute")}
              className="setup-input"
              value={formData.weddingMinute}
              onChange={(e) => handleMinuteChange(e.target.value)}
              onBlur={handleMinuteBlur}
              placeholder="Ejemplo: 30"
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="setup-help">De 00 a 59</p>
          </div>
        </div>

        <label className="setup-label" htmlFor={id("weddingSchedule")}>
          Horario de la boda
        </label>
        <textarea
          id={id("weddingSchedule")}
          className="setup-textarea"
          value={formData.weddingSchedule}
          onChange={(e) => updateFormField("weddingSchedule", e.target.value.slice(0, 2000))}
          placeholder="Ejemplo: 18:00 Recepción de invitados&#10;18:30 Ceremonia&#10;19:30 Cóctel&#10;21:00 Banquete&#10;23:00 Baile"
          rows={4}
        />
        <p className="setup-help">Escribe el horario, un salto de línea por cada evento.</p>

        <label className="setup-label">Código de vestimenta</label>
        <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
          {["Traje de gala", "Etiqueta informal", "Vestimenta formal", "Cóctel elegante", "Ropa cómoda"].map((opt) => (
            <label key={opt} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
              <input type="checkbox" checked={formData.weddingDressCode === opt} onChange={() => updateFormField("weddingDressCode", formData.weddingDressCode === opt ? "" : opt)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
              {opt}
            </label>
          ))}
        </div>
        <p className="setup-help">Selecciona el código de vestimenta de la celebración.</p>

        <label className="setup-label" htmlFor={id("accommodationInfo")}>
          Alojamiento
        </label>
        <textarea
          id={id("accommodationInfo")}
          className="setup-textarea"
          value={formData.accommodationInfo}
          onChange={(e) => updateFormField("accommodationInfo", e.target.value.slice(0, 2000))}
          placeholder="Ejemplo: Hotel recomendado: … Código descuento: …"
          rows={4}
        />
        <p className="setup-help">Hoteles, códigos de descuento y opciones para los invitados.</p>

        <label className="setup-label" htmlFor={id("transportInfo")}>
          Transporte
        </label>
        <textarea
          id={id("transportInfo")}
          className="setup-textarea"
          value={formData.transportInfo}
          onChange={(e) => updateFormField("transportInfo", e.target.value.slice(0, 2000))}
          placeholder="Ejemplo: Autobús desde la Plaza Mayor a las 17:00. Parking gratuito en el recinto."
          rows={4}
        />
        <p className="setup-help">Opciones de transporte, horarios de autobús, parking, etc.</p>
      </CollapsibleSection>
      ) : null}

      {!hiddenSet.has("info") ? (
      <CollapsibleSection
        title="Sobre los invitados"
        hint="Niños, restricciones"
      >
        <label className="setup-label">Sobre los niños</label>
        <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {[
            { value: "Bienvenidos con zona de juegos", label: "Bienvenidos con zona de juegos" },
            { value: "Bienvenidos bajo supervisión", label: "Bienvenidos bajo supervisión" },
            { value: "Solo para adultos", label: "Solo para adultos" },
          ].map((opt) => (
            <label key={opt.value} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
              <input type="checkbox" checked={formData.kidsPolicy === opt.value} onChange={() => updateFormField("kidsPolicy", formData.kidsPolicy === opt.value ? "" : opt.value)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
              {opt.label}
            </label>
          ))}
        </div>
        <p className="setup-help">Selecciona la política sobre niños para la celebración.</p>
      </CollapsibleSection>
      ) : null}

      {!hiddenSet.has("story") ? (
      <CollapsibleSection
        title="Nuestra historia"
        hint="Texto libre sobre la pareja"
      >
        <label className="setup-label" htmlFor={id("storyText")}>
          Nuestra historia
        </label>
        <textarea
          id={id("storyText")}
          className="setup-textarea"
          value={formData.storyText}
          onChange={(e) => updateFormField("storyText", e.target.value.slice(0, 2000))}
          placeholder="Ejemplo: Nos conocimos en…"
          rows={4}
        />
        <p className="setup-help">Un texto libre sobre vuestra historia de amor.</p>
      </CollapsibleSection>
      ) : null}

      {!hiddenSet.has("gifts") ? (
      <CollapsibleSection
        title="Regalos"
        hint="Preferencias y datos bancarios"
      >
        <label className="setup-label" htmlFor={id("giftsInfo")}>
          Información de regalos
        </label>
        <textarea
          id={id("giftsInfo")}
          className="setup-textarea"
          value={formData.giftsInfo}
          onChange={(e) => updateFormField("giftsInfo", e.target.value.slice(0, 2000))}
          placeholder="Ejemplo: Preferimos un detalle en efectivo…"
          rows={4}
        />
        <p className="setup-help">Indica si preferís una lluvia de sobres, número de cuenta, etc.</p>

        <label className="setup-label" htmlFor={id("bankInfo")}>
          Datos bancarios (IBAN)
        </label>
        <input
          id={id("bankInfo")}
          className="setup-input"
          value={formData.bankInfo}
          onChange={(e) => updateFormField("bankInfo", e.target.value.slice(0, 100))}
          placeholder="Ejemplo: ES00 0000 0000 00 0000000000"
          autoComplete="off"
        />
        <p className="setup-help">Número de cuenta para transferencias, si procede.</p>
      </CollapsibleSection>
      ) : null}




      {!hiddenSet.has("gallery") ? (
      <CollapsibleSection
        title="Galería"
        hint="Fotos de la pareja"
      >
        <label className="setup-upload" htmlFor={id("galleryUpload")}>
          <span className="setup-upload__title">Subir fotos</span>
          <span className="setup-upload__subtitle">Máximo 20 MB cada una. Puedes seleccionar varias.</span>
        </label>
        <input ref={galleryRef} id={id("galleryUpload")} className="setup-upload__input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleGalleryUpload} />
        {(() => {
          try {
            const images = JSON.parse(formData.galleryImages || "[]");
            if (!images.length) return null;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "0.4rem", marginTop: "0.5rem" }}>
                {images.map((src, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "0.5rem" }} />
                    <button type="button" onClick={() => {
                      const arr = JSON.parse(formData.galleryImages || "[]");
                      arr.splice(i, 1);
                      updateFormField("galleryImages", JSON.stringify(arr));
                    }} style={{ position: "absolute", top: "2px", right: "2px", width: "1.2rem", height: "1.2rem", borderRadius: "999px", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "0.7rem", cursor: "pointer", display: "grid", placeItems: "center" }}>×</button>
                  </div>
                ))}
              </div>
            );
          } catch { return null; }
        })()}
      </CollapsibleSection>
      ) : null}

      {!hasStoredConfig ? (
        <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.85rem", cursor: "pointer" }}>
          <input type="checkbox" checked={formData._privacyConsent === "true"} onChange={(e) => updateFormField("_privacyConsent", e.target.checked ? "true" : "false")} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
          <span>He leído y acepto la <button type="button" onClick={() => setLegalModal("privacy")} style={{ color: "var(--setup-accent)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>Política de Privacidad</button></span>
        </label>
      ) : null}

      <div className="setup-actions" style={{ padding: "0.25rem 0" }}>
        <button className="setup-button" type="submit">
          Guardar cambios
        </button>
      </div>
    </form>
  );
}