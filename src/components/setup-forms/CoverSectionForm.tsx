import { useCallback, useRef } from "react";
import CharacterCounter from "../../components/CharacterCounter";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";
import { useToast } from "../../hooks/useToast";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES } from "../../lib/constants";
import { uploadImage, saveConfigImage, deleteConfigImage } from "../../lib/image-store";
import { compressImageTransparent } from "../../lib/image-utils";
import { useConfigImage } from "../../hooks/useConfigImage";
import ThemePicker from "../ThemePicker";
import MusicArrayEditor from "../MusicArrayEditor";

export default function CoverSectionForm({ prefix = "" }) {
  ;
  const {
    formData, updateFormField,
    inviteToken,
  } = useApp();
  const { t } = useTranslation();
  const { addToast, startUploadToast } = useToast();

  const couplePhotoUrl = useConfigImage(inviteToken, formData.couplePhoto);
  const customSealUrl = useConfigImage(inviteToken, formData.customSeal);
  const backgroundImageUrl = useConfigImage(inviteToken, formData.backgroundImage);
  const cornerDecorationUrl = useConfigImage(inviteToken, (formData as Record<string, unknown>).cornerDecoration as string);

  const photoRef = useRef<HTMLInputElement>(null);
  const id = (name: string) => `${prefix}${name}`;

  const uploadConfigImage = useCallback(async (imageId: string, file: File, onProgress?: (p: number) => void) => {
    const { dataUrl } = await uploadImage(inviteToken, file, onProgress);
    return await saveConfigImage(inviteToken, imageId, dataUrl);
  }, [inviteToken]);

  const handleCouplePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    ;
    if (file.size === 0) { ; addToast("error", t("setup.errorEmptyFile")); return; }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) { ; addToast("error", t("setup.errorFileFormat")); return; }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) { ; addToast("error", t("setup.errorFileSize")); return; }
    const upload = startUploadToast(t("setup.photoUploading"));
    try {
      ;
      const ref = await uploadConfigImage("couplePhoto", file, (p: number) => upload.update(p));
      upload.update(90);
      updateFormField("couplePhoto", ref);
      upload.complete(t("setup.photoUploaded"));
      ;
    } catch (err) {
      console.error("[app]", "[CoverSectionForm]", "couplePhoto upload error:", err);
      upload.error(t("setup.photoUploadFailed"));
    }
    if (input) input.value = "";
  }, [updateFormField, startUploadToast, addToast, t, uploadConfigImage]);

  const handleRemovePhoto = useCallback(() => {
    deleteConfigImage(inviteToken, "couplePhoto").catch(() => {});
    updateFormField("couplePhoto", "");
  }, [inviteToken, updateFormField]);

  const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    ;
    updateFormField("firstName", e.target.value.slice(0, 20));
  }, [updateFormField]);

  const handleSecondNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    ;
    updateFormField("secondName", e.target.value.slice(0, 20));
  }, [updateFormField]);

  const handleThemeChange = useCallback((val: string) => {
    ;
    updateFormField("theme", val);
  }, [updateFormField]);

  return (
    <>
      <fieldset className="setup-name-group">
        <legend className="setup-label">{t("setup.namesLegend")}</legend>
        <div className="setup-name-grid">
          <div className="setup-name-col">
            <label className="setup-label setup-label--required" htmlFor={id("firstName")}>{t("setup.firstNameLabel")}</label>
            <p className="setup-help" style={{ marginTop: "0.1rem", fontSize: "0.75rem" }} id={id("firstNameHint")}>{t("setup.nameOnlyHint")}</p>
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
            <label className="setup-label setup-label--required" htmlFor={id("secondName")}>{t("setup.secondNameLabel")}</label>
            <p className="setup-help" style={{ marginTop: "0.1rem", fontSize: "0.75rem" }} id={id("secondNameHint")}>{t("setup.nameOnlyHint")}</p>
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

      <fieldset className="setup-name-group">
        <legend className="setup-label">{t("setup.godparentsLegend")}</legend>
        <div className="setup-name-grid">
          <div className="setup-name-col">
            <label className="setup-label" htmlFor={id("godparent1")}>{t("setup.godparent1Label")}</label>
            <p className="setup-help" style={{ marginTop: "0.1rem", fontSize: "0.75rem" }} id={id("godparent1Hint")}>{t("setup.nameOnlyHint")}</p>
            <input id={id("godparent1")} className="setup-input" value={formData.godparent1} onChange={(e) => updateFormField("godparent1", e.target.value.slice(0, 40))} placeholder={t("setup.namePlaceholder")} autoComplete="off" maxLength={40} aria-describedby={id("godparent1Hint")} />
          </div>
          <div className="setup-name-col">
            <label className="setup-label" htmlFor={id("godparent2")}>{t("setup.godparent2Label")}</label>
            <p className="setup-help" style={{ marginTop: "0.1rem", fontSize: "0.75rem" }} id={id("godparent2Hint")}>{t("setup.nameOnlyHint")}</p>
            <input id={id("godparent2")} className="setup-input" value={formData.godparent2} onChange={(e) => updateFormField("godparent2", e.target.value.slice(0, 40))} placeholder={t("setup.namePlaceholder")} autoComplete="off" maxLength={40} aria-describedby={id("godparent2Hint")} />
          </div>
        </div>
        <p className="setup-help">{t("setup.godparentsHint")}</p>
      </fieldset>

      <label className="setup-label" htmlFor={id("inviteMessage")}>
        {t("setup.messageLabel")} <CharacterCounter current={(formData.inviteMessage || "").length} max={500} />
      </label>
      <textarea
        id={id("inviteMessage")}
        className="setup-textarea"
        value={formData.inviteMessage}
        onChange={(e) => updateFormField("inviteMessage", e.target.value.slice(0, 500))}
        placeholder={t("setup.messagePlaceholder")}
        aria-describedby={id("messageHint")}
      />
      <p className="setup-help" id={id("messageHint")}>{t("setup.messageHint")}</p>

      <p className="setup-label">{t("setup.themeLabel")}</p>
      <ThemePicker value={formData.theme} onChange={handleThemeChange} t={t as (key: string, options?: Record<string, unknown>) => string} />
      <p className="setup-help" id={id("themeHint")}>{t("setup.themeHint")}</p>

      <div className="setup-background-panel">
        <div className="setup-background-panel__header">
          <div>
            <p className="setup-label setup-label--tight">{t("setup.couplePhotoLabel")}</p>
            <p className="setup-help setup-help--tight">{t("setup.couplePhotoHint")}</p>
          </div>
          {formData.couplePhoto ? (
            <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleRemovePhoto}>{t("setup.remove")}</button>
          ) : null}
        </div>

        {formData.couplePhoto ? (
          <div className="setup-selected-background">
            <img src={couplePhotoUrl || formData.couplePhoto} alt={t("setup.couplePhotoLabel")} className="setup-selected-background__image" style={{ borderRadius: "50%", aspectRatio: "1", width: "5rem" }} />
            <div>
              <p className="setup-selected-background__title">{t("setup.currentPhoto")}</p>
            </div>
          </div>
        ) : (
          <label className="setup-upload" htmlFor={id("couplePhoto")}>
            <span className="setup-upload__title">{t("setup.couplePhotoUpload")}</span>
            <span className="setup-upload__subtitle">{t("setup.couplePhotoUploadHint")}</span>
          </label>
        )}
        <input ref={photoRef} id={id("couplePhoto")} className="setup-upload__input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCouplePhotoUpload} />
        {formData.couplePhoto ? (
          <label className="setup-upload" htmlFor={id("couplePhoto")}>
            {t("setup.replaceImage")}
            <input id={id("couplePhoto")} className="setup-upload__input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCouplePhotoUpload} />
          </label>
        ) : null}
      </div>

      <div className="story-divider" />

      <div className="setup-background-panel">
        <div className="setup-background-panel__header">
          <div>
            <p className="setup-label setup-label--tight">{t("setup.customSealLabel")}</p>
            <p className="setup-help setup-help--tight">{t("setup.customSealHint")}</p>
          </div>
          {formData.customSeal ? (
            <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => { deleteConfigImage(inviteToken, "customSeal").catch(() => {}); updateFormField("customSeal", ""); }}>{t("setup.remove")}</button>
          ) : null}
        </div>
        {formData.customSeal ? (
          <div className="setup-selected-background">
            <img src={customSealUrl || formData.customSeal} alt="" className="setup-selected-background__image" style={{ width: "3rem", height: "3rem", objectFit: "contain" }} />
            <div>
              <p className="setup-selected-background__title">{t("setup.currentSeal")}</p>
            </div>
          </div>
        ) : (
          <label className="setup-upload" htmlFor={id("customSeal")}>
            <span className="setup-upload__title">{t("setup.uploadSeal")}</span>
            <span className="setup-upload__subtitle">{t("setup.uploadSealHint")}</span>
          </label>
        )}
        <input className="setup-upload__input" id={id("customSeal")} type="file" accept="image/jpeg,image/png,image/svg+xml" onChange={async (e) => {
          const file = e.target.files?.[0]; if (!file) return;
          ;
          if (file.size > 1024 * 1024) { ; addToast("error", t("setup.errorFileSize")); return; }
          try {
            const dataUrl = await compressImageTransparent(file);
            const ref = await saveConfigImage(inviteToken, "customSeal", dataUrl);
            updateFormField("customSeal", ref);
            ;
          } catch (err) { console.error("[app]", "[CoverSectionForm]", "customSeal error:", err); addToast("error", t("setup.photoUploadFailed")); }
          e.target.value = "";
        }} />
      </div>

      <div className="story-divider" />

      <div className="setup-background-panel">
        <div className="setup-background-panel__header">
          <div>
            <p className="setup-label setup-label--tight">{t("setup.backgroundLabel")}</p>
            <p className="setup-help setup-help--tight">{t("setup.backgroundHint")}</p>
          </div>
          {formData.backgroundImage ? (
            <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => { deleteConfigImage(inviteToken, "backgroundImage").catch(() => {}); updateFormField("backgroundImage", ""); }}>{t("setup.remove")}</button>
          ) : null}
        </div>

        {formData.backgroundImage ? (
          <div className="setup-selected-background">
            <img src={backgroundImageUrl || formData.backgroundImage} alt="" className="setup-selected-background__image" style={{ width: "100%", maxHeight: "100px", objectFit: "cover", borderRadius: "0.35rem" }} />
          </div>
        ) : (
          <label className="setup-upload" htmlFor={id("backgroundImage")}>
            <span className="setup-upload__title">{t("setup.backgroundUpload")}</span>
            <span className="setup-upload__subtitle">{t("setup.backgroundUploadHint")}</span>
          </label>
        )}
        <input className="setup-upload__input" id={id("backgroundImage")} type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          ;
          if (!ALLOWED_UPLOAD_TYPES.has(file.type)) { ; addToast("error", t("setup.errorFileFormat")); return; }
          if (file.size > MAX_UPLOAD_SIZE_BYTES) { ; addToast("error", t("setup.errorFileSize")); return; }
          try {
            const dataUrl = await compressImageTransparent(file);
            const ref = await saveConfigImage(inviteToken, "backgroundImage", dataUrl);
            updateFormField("backgroundImage", ref);
            ;
          } catch (err) { console.error("[app]", "[CoverSectionForm]", "backgroundImage error:", err); addToast("error", t("setup.photoUploadFailed")); }
          e.target.value = "";
        }} />
      </div>

      <div className="story-divider" style={{ margin: "0.75rem 0" }} />

      <p className="setup-label">{t("setup.cornerDecorationsLabel")}</p>
      <p className="setup-help">{t("setup.cornerDecorationsHint")}</p>
      <div className="setup-background-panel" style={{ marginBottom: "0.5rem" }}>
        <div className="setup-background-panel__header">
          <span className="setup-label setup-label--tight" style={{ fontSize: "0.8rem" }}>{t("setup.cornerDecorationLabel")}</span>
          {(formData as Record<string, unknown>).cornerDecoration ? (
            <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => { deleteConfigImage(inviteToken, "cornerDecoration").catch(() => {}); updateFormField("cornerDecoration", ""); }} style={{ fontSize: "0.7rem" }}>{t("setup.remove")}</button>
          ) : null}
        </div>
        {(formData as Record<string, unknown>).cornerDecoration ? (
          <div>
            <img src={cornerDecorationUrl || (formData as Record<string, unknown>).cornerDecoration as string} alt="" style={{ width: "2.5rem", height: "2.5rem", objectFit: "contain" }} />
          </div>
        ) : (
          <label className="setup-upload" htmlFor={id("cornerDecoration")}>
            <span className="setup-upload__title">{t("setup.uploadCorner")}</span>
            <span className="setup-upload__subtitle">{t("setup.cornerDecorationUploadHint")}</span>
          </label>
        )}
        <input className="setup-upload__input" id={id("cornerDecoration")} type="file" accept="image/png,image/svg+xml" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          ;
          if (file.size > 1024 * 1024) { ; addToast("error", t("setup.errorFileSize")); return; }
          try {
            const dataUrl = await compressImageTransparent(file);
            const ref = await saveConfigImage(inviteToken, "cornerDecoration", dataUrl);
            updateFormField("cornerDecoration", ref);
            ;
          } catch (err) { console.error("[app]", "[CoverSectionForm]", "cornerDecoration error:", err); addToast("error", t("setup.photoUploadFailed")); }
          e.target.value = "";
        }} />
      </div>

      <MusicArrayEditor inviteToken={inviteToken} value={formData.musicFile || formData.musicUrl} onChange={(val: string) => updateFormField("musicFile", val)} t={t} />
    </>
  );
}
