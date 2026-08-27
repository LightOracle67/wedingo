import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormField } from "../../contexts";
import { useToast } from "../../hooks/useToast";
import { compressImageTransparent, HIGH_QUALITY_MAX_DIMENSION, HIGH_QUALITY_TARGET_BYTES } from "../../lib/image-utils";
import { validateFile } from "../../lib/upload-validation";
import { useConfigImage } from "../../hooks/useConfigImage";
import { FONT_OPTIONS } from "../../lib/constants";
import ThemePicker from "../ThemePicker";
import MusicArrayEditor from "../MusicArrayEditor";
import SetupToggleField from "../SetupToggleField";
import SetupField from "../SetupField";
import ConfigImageField from "../ConfigImageField";
import { CountedTextarea } from "../CountedField";
import { safeLogError } from "../../lib/safe-error";

const CoverSectionForm = memo(function CoverSectionForm({ prefix = "" }: { prefix?: string }) {
  const { updateFormField, inviteToken } = useConfigActions();
  const backgroundImage = useFormField("backgroundImage");
  const couplePhoto = useFormField("couplePhoto");
  const customSeal = useFormField("customSeal");
  const firstName = useFormField("firstName");
  const godparent1 = useFormField("godparent1");
  const godparent2 = useFormField("godparent2");
  const instagramUrl = useFormField("instagramUrl");
  const inviteMessage = useFormField("inviteMessage");
  // Vídeo de bienvenida: overlay que se reproduce sobre la portada al abrir
  // la invitación (solo si el toggle welcomeVideoEnabled está activo).
  const welcomeVideo = useFormField("welcomeVideo");
  const musicFile = useFormField("musicFile");
  const secondName = useFormField("secondName");
  const theme = useFormField("theme");
  const cornerDecoration = useFormField("cornerDecoration");
  // Personalización de tipografía y colores del usuario.
  const fontHeading = useFormField("fontHeading");
  const fontBody = useFormField("fontBody");
  const colorAccent = useFormField("colorAccent");
  const colorTitle = useFormField("colorTitle");
  const colorCopy = useFormField("colorCopy");
  const colorBackground = useFormField("colorBackground");
  const { t } = useTranslation();
  const { addToast, startUploadToast } = useToast();

  const couplePhotoUrl = useConfigImage(inviteToken, couplePhoto);
  const customSealUrl = useConfigImage(inviteToken, customSeal);
  const backgroundImageUrl = useConfigImage(inviteToken, backgroundImage);
  const cornerDecorationUrl = useConfigImage(inviteToken, cornerDecoration as string);

  // Campo de imagen en subida: deshabilita su label y muestra "Subiendo..."
  // (antes las subidas de sello/fondo/esquinas no tenían estado de carga).
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const id = (name: string) => `${prefix}${name}`;
  /** src seguro para las imágenes de config: si la URL resuelta no está
   *  disponible y el valor crudo es una referencia __cfgimg: (aún sin
   *  descifrar), no se usa como src (antes mostraba un icono roto). */
  const safeSrc = (url: string | undefined, raw: string | undefined) =>
    url || (raw && !raw.startsWith("__cfgimg:") ? raw : undefined) || "";

  const uploadConfigImage = useCallback(
    async (imageId: string, file: File, onProgress?: (p: number) => void) => {
      // image-store se importa aquí para no arrastrarlo al bundle inicial.
      const { uploadImage, saveConfigImage } = await import("../../lib/image-store");
      // couplePhoto es una imagen protagonista: se comprime en alta calidad.
      const { encrypted, dataUrl } = await uploadImage(
        inviteToken,
        file,
        onProgress,
        HIGH_QUALITY_MAX_DIMENSION,
        HIGH_QUALITY_TARGET_BYTES,
      );
      // Reutiliza el cifrado de uploadImage (evita cifrar dos veces).
      return await saveConfigImage(inviteToken, imageId, dataUrl, encrypted);
    },
    [inviteToken],
  );

  /**
   * Sube una imagen de configuración con validación UNIFICADA:
   * archivo vacío, tipo (opcional) y tamaño (máx. personalizable).
   * Comprime con compressImageTransparent (transparencia) y guarda la
   * referencia __cfgimg: en el campo. Antes cada campo (couplePhoto,
   * customSeal, backgroundImage, cornerDecoration) duplicaba este flujo
   * con validaciones inconsistentes (unos chequeaban tipo, otros no).
   *
   * @returns la referencia __cfgimg: guardada, o null si se abortó/falló.
   */
  const handleConfigImageUpload = useCallback(
    async (
      imageId: string,
      file: File | undefined,
      options: { maxBytes?: number; validateType?: boolean; onProgress?: (p: number) => void } = {},
    ): Promise<string | null> => {
      if (!file) return null;
      const validation = validateFile(file, {
        ...(options.maxBytes !== undefined ? { maxBytes: options.maxBytes } : {}),
        ...(options.validateType !== undefined ? { validateType: options.validateType } : {}),
      });
      if (!validation.ok) {
        addToast("error", t(validation.errorKey));
        return null;
      }
      try {
        setUploadingId(imageId);
        const { saveConfigImage } = await import("../../lib/image-store");
        const dataUrl = await compressImageTransparent(file);
        const ref = await saveConfigImage(inviteToken, imageId, dataUrl);
        updateFormField(imageId, ref);
        return ref;
      } catch (err) {
        safeLogError(["[app]", "[CoverSectionForm]", `${imageId} upload error`], err);
        addToast("error", t("setup.photoUploadFailed"));
        return null;
      } finally {
        setUploadingId(null);
      }
    },
    [inviteToken, updateFormField, addToast, t],
  );

  /** Elimina una imagen de configuración (subcolección) y limpia el campo.
   *  Espera al borrado en Firestore: si falla, se informa y NO se limpia el
   *  campo (evita mostrar la imagen borrada cuando en realidad sigue en la
   *  subcolección — GDPR: no dejar huérfanos en silencio). */
  const removeConfigImage = useCallback(
    async (imageId: string) => {
      const { deleteConfigImage } = await import("../../lib/image-store");
      try {
        await deleteConfigImage(inviteToken, imageId);
        updateFormField(imageId, "");
      } catch {
        addToast("error", t("errors.deleteImageFailed"));
      }
    },
    [inviteToken, updateFormField, addToast, t],
  );

  const handleCouplePhotoUpload = useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      const validation = validateFile(file);
      if (!validation.ok) {
        addToast("error", t(validation.errorKey));
        return;
      }
      const upload = startUploadToast(t("setup.photoUploading"));
      try {
        setUploadingId("couplePhoto");
        const ref = await uploadConfigImage("couplePhoto", file, (p: number) => upload.update(p));
        upload.update(90);
        updateFormField("couplePhoto", ref);
        upload.complete(t("setup.photoUploaded"));
      } catch (err) {
        safeLogError(["[app]", "[CoverSectionForm]", "couplePhoto upload error"], err);
        upload.error(t("setup.photoUploadFailed"));
      } finally {
        setUploadingId(null);
      }
    },
    [updateFormField, startUploadToast, addToast, t, uploadConfigImage],
  );

  const handleRemovePhoto = useCallback(async () => {
    await removeConfigImage("couplePhoto");
  }, [removeConfigImage]);

  /** Memoizado: onChange inestable relanzaba el useEffect de MusicArrayEditor
   *  y re-descargaba el audio en cada render. */
  const handleMusicChange = useCallback((val: string) => updateFormField("musicFile", val), [updateFormField]);

  const handleFirstNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFormField("firstName", e.target.value.slice(0, 20));
    },
    [updateFormField],
  );

  const handleSecondNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFormField("secondName", e.target.value.slice(0, 20));
    },
    [updateFormField],
  );

  const handleThemeChange = useCallback(
    (val: string) => {
      updateFormField("theme", val);
    },
    [updateFormField],
  );

  return (
    <>
      <fieldset className="setup-name-group">
        <legend className="setup-label">{t("setup.namesLegend")}</legend>
        <div className="setup-name-grid">
          <SetupField
            id={id("firstName")}
            label={t("setup.firstNameLabel")}
            hint={t("setup.nameOnlyHint")}
            hintId={id("firstNameHint")}
            hintPosition="before"
            required
            className="setup-name-col"
          >
            <input
              id={id("firstName")}
              className="setup-input"
              value={firstName}
              onChange={handleFirstNameChange}
              onBlur={() => updateFormField("firstName", firstName.trim())}
              placeholder={t("setup.namePlaceholder")}
              autoComplete="off"
              required
              aria-required="true"
              aria-describedby={id("firstNameHint")}
            />
          </SetupField>
          <SetupField
            id={id("secondName")}
            label={t("setup.secondNameLabel")}
            hint={t("setup.nameOnlyHint")}
            hintId={id("secondNameHint")}
            hintPosition="before"
            required
            className="setup-name-col"
          >
            <input
              id={id("secondName")}
              className="setup-input"
              value={secondName}
              onChange={handleSecondNameChange}
              onBlur={() => updateFormField("secondName", secondName.trim())}
              placeholder={t("setup.namePlaceholder")}
              autoComplete="off"
              required
              aria-required="true"
              aria-describedby={id("secondNameHint")}
            />
          </SetupField>
        </div>
      </fieldset>

      <SetupToggleField
        enabledField="godparentsEnabled"
        label={t("setup.godparentsLegend")}
        hint={t("setup.godparentsHint")}
        id={id}
      >
        <fieldset className="setup-name-group">
          <div className="setup-name-grid">
            <SetupField
              id={id("godparent1")}
              label={t("setup.godparent1Label")}
              hint={t("setup.nameOnlyHint")}
              hintId={id("godparent1Hint")}
              hintPosition="before"
              className="setup-name-col"
            >
              <input
                id={id("godparent1")}
                className="setup-input"
                value={godparent1}
                onChange={(e) => updateFormField("godparent1", e.target.value.slice(0, 40))}
                placeholder={t("setup.namePlaceholder")}
                autoComplete="off"
                maxLength={40}
                aria-describedby={id("godparent1Hint")}
              />
            </SetupField>
            <SetupField
              id={id("godparent2")}
              label={t("setup.godparent2Label")}
              hint={t("setup.nameOnlyHint")}
              hintId={id("godparent2Hint")}
              hintPosition="before"
              className="setup-name-col"
            >
              <input
                id={id("godparent2")}
                className="setup-input"
                value={godparent2}
                onChange={(e) => updateFormField("godparent2", e.target.value.slice(0, 40))}
                placeholder={t("setup.namePlaceholder")}
                autoComplete="off"
                maxLength={40}
                aria-describedby={id("godparent2Hint")}
              />
            </SetupField>
          </div>
        </fieldset>
      </SetupToggleField>

      <SetupToggleField
        enabledField="inviteMessageEnabled"
        label={t("setup.messageLabel")}
        hint={t("setup.messageHint")}
        hintId={id("messageHint")}
        id={id}
      >
        <CountedTextarea
          id={id("inviteMessage")}
          value={inviteMessage}
          onChange={(v) => updateFormField("inviteMessage", v)}
          max={500}
          placeholder={t("setup.messagePlaceholder")}
          ariaDescribedBy={id("messageHint")}
        />
      </SetupToggleField>

      <SetupToggleField enabledField="instagramEnabled" label={t("setup.instagramLabel")} id={id}>
        <input
          id={id("instagramUrl")}
          className="setup-input"
          value={instagramUrl}
          onChange={(e) => updateFormField("instagramUrl", e.target.value.slice(0, 1000))}
          placeholder={t("setup.instagramPlaceholder")}
          inputMode="url"
          autoComplete="url"
        />
      </SetupToggleField>

      <p className="setup-label">{t("setup.themeLabel")}</p>
      <ThemePicker value={theme} onChange={handleThemeChange} />
      <p className="setup-help" id={id("themeHint")}>
        {t("setup.themeHint")}
      </p>

      {/* ── Personalización de tipografía ── */}
      <p className="setup-label">{t("setup.typographyLabel")}</p>
      <p className="setup-help" id={id("typographyHint")}>
        {t("setup.typographyHint")}
      </p>
      <div className="setup-fields-grid">
        <div>
          <label className="setup-label" htmlFor={id("fontHeading")}>
            {t("setup.fontHeadingLabel")}
          </label>
          <select
            id={id("fontHeading")}
            className="setup-input"
            value={fontHeading || ""}
            onChange={(e) => updateFormField("fontHeading", e.target.value)}
          >
            <option value="">{t("setup.fontDefault")}</option>
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="setup-label" htmlFor={id("fontBody")}>
            {t("setup.fontBodyLabel")}
          </label>
          <select
            id={id("fontBody")}
            className="setup-input"
            value={fontBody || ""}
            onChange={(e) => updateFormField("fontBody", e.target.value)}
          >
            <option value="">{t("setup.fontDefault")}</option>
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Personalización de colores ── */}
      <p className="setup-label">{t("setup.colorsLabel")}</p>
      <p className="setup-help" id={id("colorsHint")}>
        {t("setup.colorsHint")}
      </p>
      {[
        { field: "colorAccent" as const, label: t("setup.colorAccentLabel") },
        { field: "colorTitle" as const, label: t("setup.colorTitleLabel") },
        { field: "colorCopy" as const, label: t("setup.colorCopyLabel") },
        { field: "colorBackground" as const, label: t("setup.colorBackgroundLabel") },
      ].map(({ field, label }) => {
        const value =
          field === "colorAccent"
            ? colorAccent
            : field === "colorTitle"
              ? colorTitle
              : field === "colorCopy"
                ? colorCopy
                : colorBackground;
        return (
          <div
            key={field}
            className="setup-color-row"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}
          >
            <input
              type="color"
              id={id(field)}
              className="setup-color-input"
              value={/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : "#000000"}
              onChange={(e) => updateFormField(field, e.target.value)}
              aria-label={label}
              style={{
                width: "2.4rem",
                height: "2.4rem",
                padding: 0,
                border: "1px solid var(--setup-border)",
                background: "none",
                cursor: "pointer",
              }}
            />
            <label className="setup-label" htmlFor={id(field)} style={{ margin: 0, flex: 1 }}>
              {label}
            </label>
            {value ? (
              <button
                type="button"
                className="setup-button setup-button--ghost setup-button--compact"
                onClick={() => updateFormField(field, "")}
              >
                {t("setup.colorReset")}
              </button>
            ) : null}
          </div>
        );
      })}

      <SetupToggleField
        enabledField="couplePhotoEnabled"
        label={t("setup.couplePhotoLabel")}
        hint={t("setup.couplePhotoHint")}
        id={id}
      >
        <ConfigImageField
          id={id("couplePhoto")}
          value={couplePhoto}
          src={safeSrc(couplePhotoUrl, couplePhoto)}
          alt={t("setup.couplePhotoLabel")}
          previewStyle={{ borderRadius: "50%", aspectRatio: "1", width: "5rem" }}
          currentLabel={t("setup.currentPhoto")}
          uploadLabel={t("setup.couplePhotoUpload")}
          uploadHint={t("setup.couplePhotoUploadHint")}
          replaceLabel={t("setup.replaceImage")}
          accept="image/jpeg,image/png,image/webp"
          uploading={uploadingId === "couplePhoto"}
          uploadingLabel={t("setup.uploading")}
          removeLabel={t("setup.remove")}
          onUpload={(f) => void handleCouplePhotoUpload(f)}
          onRemove={() => void handleRemovePhoto()}
        />
      </SetupToggleField>

      <div className="story-divider" />

      <SetupToggleField
        enabledField="customSealEnabled"
        label={t("setup.customSealLabel")}
        hint={t("setup.customSealHint")}
        id={id}
      >
        <ConfigImageField
          id={id("customSeal")}
          value={customSeal}
          src={safeSrc(customSealUrl, customSeal)}
          previewStyle={{ width: "3rem", height: "3rem", objectFit: "contain" }}
          currentLabel={t("setup.currentSeal")}
          uploadLabel={t("setup.uploadSeal")}
          uploadHint={t("setup.uploadSealHint")}
          accept="image/jpeg,image/png,image/svg+xml"
          uploading={uploadingId === "customSeal"}
          uploadingLabel={t("setup.uploading")}
          removeLabel={t("setup.remove")}
          onUpload={(f) =>
            void handleConfigImageUpload("customSeal", f, { maxBytes: 1024 * 1024, validateType: false })
          }
          onRemove={() => void removeConfigImage("customSeal")}
        />
      </SetupToggleField>

      <div className="story-divider" />

      <SetupToggleField
        enabledField="backgroundImageEnabled"
        label={t("setup.backgroundLabel")}
        hint={t("setup.backgroundHint")}
        id={id}
      >
        <ConfigImageField
          id={id("backgroundImage")}
          value={backgroundImage}
          src={safeSrc(backgroundImageUrl, backgroundImage)}
          previewStyle={{ width: "100%", maxHeight: "100px", objectFit: "cover", borderRadius: "0.35rem" }}
          uploadLabel={t("setup.backgroundUpload")}
          uploadHint={t("setup.backgroundUploadHint")}
          accept="image/jpeg,image/png,image/webp"
          uploading={uploadingId === "backgroundImage"}
          uploadingLabel={t("setup.uploading")}
          removeLabel={t("setup.remove")}
          onUpload={(f) => void handleConfigImageUpload("backgroundImage", f)}
          onRemove={() => void removeConfigImage("backgroundImage")}
        />
      </SetupToggleField>

      <SetupToggleField
        enabledField="cornerDecorationEnabled"
        label={t("setup.cornerDecorationsLabel")}
        hint={t("setup.cornerDecorationsHint")}
        id={id}
      >
        <ConfigImageField
          id={id("cornerDecoration")}
          value={cornerDecoration as string}
          src={safeSrc(cornerDecorationUrl, cornerDecoration as string)}
          previewStyle={{ width: "2.5rem", height: "2.5rem", objectFit: "contain" }}
          headerLabel={t("setup.cornerDecorationLabel")}
          uploadLabel={t("setup.uploadCorner")}
          uploadHint={t("setup.cornerDecorationUploadHint")}
          accept="image/png,image/svg+xml"
          uploading={uploadingId === "cornerDecoration"}
          uploadingLabel={t("setup.uploading")}
          removeLabel={t("setup.remove")}
          style={{ marginBottom: "0.5rem" }}
          onUpload={(f) =>
            void handleConfigImageUpload("cornerDecoration", f, { maxBytes: 1024 * 1024, validateType: false })
          }
          onRemove={() => void removeConfigImage("cornerDecoration")}
        />
      </SetupToggleField>

      <SetupToggleField enabledField="musicFileEnabled" label={t("setup.musicLabel")} id={id}>
        <MusicArrayEditor inviteToken={inviteToken} value={musicFile} onChange={handleMusicChange} />
      </SetupToggleField>

      {/* Vídeo de bienvenida: al activarse muestra el input de URL; la
          invitación lo reproduce como overlay sobre la portada. Se limita a
          1000 caracteres igual que normalize-config hace al guardar. */}
      <SetupToggleField
        enabledField="welcomeVideoEnabled"
        label={t("setup.welcomeVideoLabel")}
        hint={t("setup.welcomeVideoHint")}
        hintId={id("welcomeVideoHint")}
        id={id}
      >
        <input
          id={id("welcomeVideo")}
          className="setup-input"
          value={welcomeVideo}
          onChange={(e) => updateFormField("welcomeVideo", e.target.value.slice(0, 1000))}
          placeholder={t("setup.welcomeVideoPlaceholder")}
          type="url"
          inputMode="url"
          autoComplete="url"
          aria-describedby={id("welcomeVideoHint")}
        />
      </SetupToggleField>
    </>
  );
});

export default CoverSectionForm;
