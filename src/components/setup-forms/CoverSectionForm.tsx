import { useCallback } from "react";
import CharacterCounter from "../../components/CharacterCounter";
import { useTranslation } from "react-i18next";
import { useConfig } from "../../contexts";
import { useToast } from "../../hooks/useToast";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES } from "../../lib/constants";
import { compressImageTransparent, HIGH_QUALITY_MAX_DIMENSION, HIGH_QUALITY_TARGET_BYTES } from "../../lib/image-utils";
import { useConfigImage } from "../../hooks/useConfigImage";
import ThemePicker from "../ThemePicker";
import MusicArrayEditor from "../MusicArrayEditor";
import SetupToggleField from "../SetupToggleField";

export default function CoverSectionForm({ prefix = "" }) {
  const { formData, updateFormField, inviteToken } = useConfig();
  const { t } = useTranslation();
  const { addToast, startUploadToast } = useToast();

  const couplePhotoUrl = useConfigImage(inviteToken, formData.couplePhoto);
  const customSealUrl = useConfigImage(inviteToken, formData.customSeal);
  const backgroundImageUrl = useConfigImage(inviteToken, formData.backgroundImage);
  const cornerDecorationUrl = useConfigImage(
    inviteToken,
    (formData as Record<string, unknown>).cornerDecoration as string,
  );

  const id = (name: string) => `${prefix}${name}`;
  /** src seguro para las imÃ¡genes de config: si la URL resuelta no estÃ¡
   *  disponible y el valor crudo es una referencia __cfgimg: (aÃºn sin
   *  descifrar), no se usa como src (antes mostraba un icono roto). */
  const safeSrc = (url: string | undefined, raw: string | undefined) =>
    url || (raw && !raw.startsWith("__cfgimg:") ? raw : undefined) || "";

  const uploadConfigImage = useCallback(
    async (imageId: string, file: File, onProgress?: (p: number) => void) => {
      // image-store se importa aquí para no arrastrarlo al bundle inicial.
      const { uploadImage, saveConfigImage } = await import("../../lib/image-store");
      // couplePhoto es una imagen protagonista: se comprime en alta calidad.
      const { dataUrl } = await uploadImage(
        inviteToken,
        file,
        onProgress,
        HIGH_QUALITY_MAX_DIMENSION,
        HIGH_QUALITY_TARGET_BYTES,
      );
      return await saveConfigImage(inviteToken, imageId, dataUrl);
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
      if (file.size === 0) {
        addToast("error", t("setup.errorEmptyFile"));
        return null;
      }
      const validateType = options.validateType ?? true;
      if (validateType && !ALLOWED_UPLOAD_TYPES.has(file.type)) {
        addToast("error", t("setup.errorFileFormat"));
        return null;
      }
      const maxBytes = options.maxBytes ?? MAX_UPLOAD_SIZE_BYTES;
      if (file.size > maxBytes) {
        addToast("error", t("setup.errorFileSize"));
        return null;
      }
      try {
        const { saveConfigImage } = await import("../../lib/image-store");
        const dataUrl = await compressImageTransparent(file);
        const ref = await saveConfigImage(inviteToken, imageId, dataUrl);
        updateFormField(imageId, ref);
        return ref;
      } catch (err) {
        console.error("[app]", "[CoverSectionForm]", `${imageId} upload error:`, err);
        addToast("error", t("setup.photoUploadFailed"));
        return null;
      }
    },
    [inviteToken, updateFormField, addToast, t],
  );

  /** Elimina una imagen de configuración (subcolección) y limpia el campo. */
  const removeConfigImage = useCallback(
    async (imageId: string) => {
      const { deleteConfigImage } = await import("../../lib/image-store");
      deleteConfigImage(inviteToken, imageId).catch(() => {});
      updateFormField(imageId, "");
    },
    [inviteToken, updateFormField],
  );

  const handleCouplePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const input = e.target;
      if (!file) return;

      if (file.size === 0) {
        addToast("error", t("setup.errorEmptyFile"));
        return;
      }
      if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
        addToast("error", t("setup.errorFileFormat"));
        return;
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        addToast("error", t("setup.errorFileSize"));
        return;
      }
      const upload = startUploadToast(t("setup.photoUploading"));
      try {
        const ref = await uploadConfigImage("couplePhoto", file, (p: number) => upload.update(p));
        upload.update(90);
        updateFormField("couplePhoto", ref);
        upload.complete(t("setup.photoUploaded"));
      } catch (err) {
        console.error("[app]", "[CoverSectionForm]", "couplePhoto upload error:", err);
        upload.error(t("setup.photoUploadFailed"));
      }
      if (input) input.value = "";
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
          <div className="setup-name-col">
            <label className="setup-label setup-label--required" htmlFor={id("firstName")}>
              {t("setup.firstNameLabel")}
            </label>
            <p className="setup-help" style={{ marginTop: "0.1rem", fontSize: "0.75rem" }} id={id("firstNameHint")}>
              {t("setup.nameOnlyHint")}
            </p>
            <input
              id={id("firstName")}
              className="setup-input"
              value={formData.firstName}
              onChange={handleFirstNameChange}
              onBlur={() => updateFormField("firstName", formData.firstName.trim())}
              placeholder={t("setup.namePlaceholder")}
              autoComplete="off"
              required
              aria-required="true"
              aria-describedby={id("firstNameHint")}
            />
          </div>
          <div className="setup-name-col">
            <label className="setup-label setup-label--required" htmlFor={id("secondName")}>
              {t("setup.secondNameLabel")}
            </label>
            <p className="setup-help" style={{ marginTop: "0.1rem", fontSize: "0.75rem" }} id={id("secondNameHint")}>
              {t("setup.nameOnlyHint")}
            </p>
            <input
              id={id("secondName")}
              className="setup-input"
              value={formData.secondName}
              onChange={handleSecondNameChange}
              onBlur={() => updateFormField("secondName", formData.secondName.trim())}
              placeholder={t("setup.namePlaceholder")}
              autoComplete="off"
              required
              aria-required="true"
              aria-describedby={id("secondNameHint")}
            />
          </div>
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
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("godparent1")}>
                {t("setup.godparent1Label")}
              </label>
              <p className="setup-help" style={{ marginTop: "0.1rem", fontSize: "0.75rem" }} id={id("godparent1Hint")}>
                {t("setup.nameOnlyHint")}
              </p>
              <input
                id={id("godparent1")}
                className="setup-input"
                value={formData.godparent1}
                onChange={(e) => updateFormField("godparent1", e.target.value.slice(0, 40))}
                placeholder={t("setup.namePlaceholder")}
                autoComplete="off"
                maxLength={40}
                aria-describedby={id("godparent1Hint")}
              />
            </div>
            <div className="setup-name-col">
              <label className="setup-label" htmlFor={id("godparent2")}>
                {t("setup.godparent2Label")}
              </label>
              <p className="setup-help" style={{ marginTop: "0.1rem", fontSize: "0.75rem" }} id={id("godparent2Hint")}>
                {t("setup.nameOnlyHint")}
              </p>
              <input
                id={id("godparent2")}
                className="setup-input"
                value={formData.godparent2}
                onChange={(e) => updateFormField("godparent2", e.target.value.slice(0, 40))}
                placeholder={t("setup.namePlaceholder")}
                autoComplete="off"
                maxLength={40}
                aria-describedby={id("godparent2Hint")}
              />
            </div>
          </div>
        </fieldset>
      </SetupToggleField>

      <SetupToggleField
        enabledField="inviteMessageEnabled"
        label={t("setup.messageLabel")}
        hint={t("setup.messageHint")}
        id={id}
      >
        <p className="setup-help setup-help--tight" style={{ textAlign: "right" }}>
          <CharacterCounter value={formData.inviteMessage || ""} max={500} />
        </p>
        <textarea
          id={id("inviteMessage")}
          className="setup-textarea"
          value={formData.inviteMessage}
          onChange={(e) => updateFormField("inviteMessage", e.target.value.slice(0, 500))}
          placeholder={t("setup.messagePlaceholder")}
          aria-describedby={id("messageHint")}
        />
      </SetupToggleField>

      <SetupToggleField enabledField="instagramEnabled" label={t("setup.instagramLabel")} id={id}>
        <input
          id={id("instagramUrl")}
          className="setup-input"
          value={formData.instagramUrl}
          onChange={(e) => updateFormField("instagramUrl", e.target.value.slice(0, 1000))}
          placeholder="https://www.instagram.com/tunombre"
          inputMode="url"
          autoComplete="url"
        />
      </SetupToggleField>
      <SetupToggleField enabledField="facebookEnabled" label={t("setup.facebookLabel")} id={id}>
        <input
          id={id("facebookUrl")}
          className="setup-input"
          value={formData.facebookUrl}
          onChange={(e) => updateFormField("facebookUrl", e.target.value.slice(0, 1000))}
          placeholder="https://www.facebook.com/tunombre"
          inputMode="url"
          autoComplete="url"
        />
      </SetupToggleField>

      <p className="setup-label">{t("setup.themeLabel")}</p>
      <ThemePicker value={formData.theme} onChange={handleThemeChange} />
      <p className="setup-help" id={id("themeHint")}>
        {t("setup.themeHint")}
      </p>

      <SetupToggleField
        enabledField="couplePhotoEnabled"
        label={t("setup.couplePhotoLabel")}
        hint={t("setup.couplePhotoHint")}
        id={id}
      >
        <div className="setup-background-panel">
          {formData.couplePhoto ? (
            <div className="setup-selected-background">
              <img
                src={safeSrc(couplePhotoUrl, formData.couplePhoto)}
                alt={t("setup.couplePhotoLabel")}
                className="setup-selected-background__image"
                style={{ borderRadius: "50%", aspectRatio: "1", width: "5rem" }}
              />
              <div>
                <p className="setup-selected-background__title">{t("setup.currentPhoto")}</p>
                <button
                  className="setup-button setup-button--ghost setup-button--compact"
                  type="button"
                  onClick={handleRemovePhoto}
                >
                  {t("setup.remove")}
                </button>
              </div>
            </div>
          ) : (
            <label className="setup-upload" htmlFor={id("couplePhoto")}>
              <span className="setup-upload__title">{t("setup.couplePhotoUpload")}</span>
              <span className="setup-upload__subtitle">{t("setup.couplePhotoUploadHint")}</span>
            </label>
          )}
          <input
            id={id("couplePhoto")}
            className="setup-upload__input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCouplePhotoUpload}
          />
          {formData.couplePhoto ? (
            /* El label "Reemplazar" apunta al input Ãºnico (htmlFor); no se
               anida un segundo input para no duplicar el id. */
            <label className="setup-upload" htmlFor={id("couplePhoto")}>
              {t("setup.replaceImage")}
            </label>
          ) : null}
        </div>
      </SetupToggleField>

      <div className="story-divider" />

      <SetupToggleField
        enabledField="customSealEnabled"
        label={t("setup.customSealLabel")}
        hint={t("setup.customSealHint")}
        id={id}
      >
        <div className="setup-background-panel">
          {formData.customSeal ? (
            <div className="setup-selected-background">
              <img
                src={safeSrc(customSealUrl, formData.customSeal)}
                alt=""
                className="setup-selected-background__image"
                style={{ width: "3rem", height: "3rem", objectFit: "contain" }}
              />
              <div>
                <p className="setup-selected-background__title">{t("setup.currentSeal")}</p>
                <button
                  className="setup-button setup-button--ghost setup-button--compact"
                  type="button"
                  onClick={() => {
                    void removeConfigImage("customSeal");
                  }}
                >
                  {t("setup.remove")}
                </button>
              </div>
            </div>
          ) : (
            <label className="setup-upload" htmlFor={id("customSeal")}>
              <span className="setup-upload__title">{t("setup.uploadSeal")}</span>
              <span className="setup-upload__subtitle">{t("setup.uploadSealHint")}</span>
            </label>
          )}
          <input
            className="setup-upload__input"
            id={id("customSeal")}
            type="file"
            accept="image/jpeg,image/png,image/svg+xml"
            onChange={async (e) => {
              await handleConfigImageUpload("customSeal", e.target.files?.[0], {
                maxBytes: 1024 * 1024,
                validateType: false,
              });
              e.target.value = "";
            }}
          />
        </div>
      </SetupToggleField>

      <div className="story-divider" />

      <SetupToggleField
        enabledField="backgroundImageEnabled"
        label={t("setup.backgroundLabel")}
        hint={t("setup.backgroundHint")}
        id={id}
      >
        <div className="setup-background-panel">
          {formData.backgroundImage ? (
            <div className="setup-selected-background">
              <img
                src={safeSrc(backgroundImageUrl, formData.backgroundImage)}
                alt=""
                className="setup-selected-background__image"
                style={{ width: "100%", maxHeight: "100px", objectFit: "cover", borderRadius: "0.35rem" }}
              />
              <button
                className="setup-button setup-button--ghost setup-button--compact"
                type="button"
                onClick={() => {
                  void removeConfigImage("backgroundImage");
                }}
              >
                {t("setup.remove")}
              </button>
            </div>
          ) : (
            <label className="setup-upload" htmlFor={id("backgroundImage")}>
              <span className="setup-upload__title">{t("setup.backgroundUpload")}</span>
              <span className="setup-upload__subtitle">{t("setup.backgroundUploadHint")}</span>
            </label>
          )}
          <input
            className="setup-upload__input"
            id={id("backgroundImage")}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              await handleConfigImageUpload("backgroundImage", e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </SetupToggleField>

      <SetupToggleField
        enabledField="cornerDecorationEnabled"
        label={t("setup.cornerDecorationsLabel")}
        hint={t("setup.cornerDecorationsHint")}
        id={id}
      >
        <div className="setup-background-panel" style={{ marginBottom: "0.5rem" }}>
          <div className="setup-background-panel__header">
            <span className="setup-label setup-label--tight" style={{ fontSize: "0.8rem" }}>
              {t("setup.cornerDecorationLabel")}
            </span>
            {(formData as Record<string, unknown>).cornerDecoration ? (
              <button
                className="setup-button setup-button--ghost setup-button--compact"
                type="button"
                onClick={() => {
                  void removeConfigImage("cornerDecoration");
                }}
                style={{ fontSize: "0.7rem" }}
              >
                {t("setup.remove")}
              </button>
            ) : null}
          </div>
          {(formData as Record<string, unknown>).cornerDecoration ? (
            <div>
              <img
                src={safeSrc(cornerDecorationUrl, (formData as Record<string, unknown>).cornerDecoration as string)}
                alt=""
                style={{ width: "2.5rem", height: "2.5rem", objectFit: "contain" }}
              />
            </div>
          ) : (
            <label className="setup-upload" htmlFor={id("cornerDecoration")}>
              <span className="setup-upload__title">{t("setup.uploadCorner")}</span>
              <span className="setup-upload__subtitle">{t("setup.cornerDecorationUploadHint")}</span>
            </label>
          )}
          <input
            className="setup-upload__input"
            id={id("cornerDecoration")}
            type="file"
            accept="image/png,image/svg+xml"
            onChange={async (e) => {
              await handleConfigImageUpload("cornerDecoration", e.target.files?.[0], {
                maxBytes: 1024 * 1024,
                validateType: false,
              });
              e.target.value = "";
            }}
          />
        </div>
      </SetupToggleField>

      <SetupToggleField enabledField="musicFileEnabled" label={t("setup.musicLabel")} id={id}>
        <MusicArrayEditor inviteToken={inviteToken} value={formData.musicFile} onChange={handleMusicChange} />
      </SetupToggleField>
    </>
  );
}
