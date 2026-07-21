import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";
import { useToast } from "../../hooks/useToast";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES } from "../../lib/constants";
import { uploadImage } from "../../lib/image-store";
import ThemePicker from "../ThemePicker";
import AudioUploadPicker from "../AudioUploadPicker";

export default function CoverSectionForm({ prefix = "" }) {
  const {
    formData, updateFormField,
    handleBackgroundUpload, handleClearBackground,
    handleSelectPreviewBackground, previewBackgrounds,
    inviteToken,
  } = useApp();
  const { t } = useTranslation();
  const { addToast, startUploadToast } = useToast();

  const photoRef = useRef<any>(null);
  const id = (name: any) => `${prefix}${name}`;

  const handleCouplePhotoUpload = useCallback(async (e: any) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    if (file.size === 0) { addToast("error", t("setup.errorEmptyFile")); return; }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) { addToast("error", t("setup.errorFileFormat")); return; }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) { addToast("error", t("setup.errorFileSize")); return; }
    const upload = startUploadToast(t("setup.photoUploading"));
    try {
      const { dataUrl } = await uploadImage(inviteToken, file, (p: any) => upload.update(p));
      upload.update(90);
      updateFormField("couplePhoto", dataUrl);
      upload.complete(t("setup.photoUploaded"));
    } catch {
      upload.error(t("setup.photoUploadFailed"));
    }
    if (input) input.value = "";
  }, [inviteToken, updateFormField, startUploadToast, addToast, t]);

  const handleFirstNameChange = useCallback((e: any) => {
    updateFormField("firstName", e.target.value.slice(0, 20));
  }, [updateFormField]);

  const handleSecondNameChange = useCallback((e: any) => {
    updateFormField("secondName", e.target.value.slice(0, 20));
  }, [updateFormField]);

  const handleThemeChange = useCallback((val: any) => {
    updateFormField("theme", val);
  }, [updateFormField]);

  const handleRemovePhoto = useCallback(() => {
    updateFormField("couplePhoto", "");
    updateFormField("couplePhotoStorage", "");
  }, [updateFormField]);

  return (
    <>
      <fieldset className="setup-name-group">
        <legend className="setup-label">{t("setup.namesLegend")}</legend>
        <div className="setup-name-grid">
          <div className="setup-name-col">
            <label className="setup-label" htmlFor={id("firstName")}>{t("setup.firstNameLabel")}</label>
            <input
              id={id("firstName")}
              className="setup-input"
              value={formData.firstName}
              onChange={handleFirstNameChange}
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
              onChange={handleSecondNameChange}
              placeholder={t("setup.namePlaceholder")}
              autoComplete="off"
            />
          </div>
        </div>
      </fieldset>

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

      <label className="setup-label" htmlFor={id("inviteMessage")}>
        {t("setup.messageLabel")}
      </label>
      <textarea
        id={id("inviteMessage")}
        className="setup-textarea"
        value={formData.inviteMessage}
        onChange={(e) => updateFormField("inviteMessage", e.target.value.slice(0, 500))}
        placeholder={t("setup.messagePlaceholder")}
      />

      <p className="setup-label">{t("setup.themeLabel")}</p>
      <ThemePicker value={formData.theme} onChange={handleThemeChange} t={t} />

      <div className="setup-background-panel">
        <div className="setup-background-panel__header">
          <div>
            <p className="setup-label setup-label--tight">{t("setup.backgroundLabel")}</p>
            <p className="setup-help setup-help--tight">
              {t("setup.backgroundText")}
            </p>
          </div>
          {formData.backgroundImage ? (
            <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClearBackground}>
              {t("setup.removeBackground")}
            </button>
          ) : null}
        </div>

        <label className="setup-upload" htmlFor={id("backgroundUpload")}>
          <span className="setup-upload__title">{t("setup.uploadTitle")}</span>
          <span className="setup-upload__subtitle">{t("setup.uploadSubtitle")}</span>
        </label>
        <input id={id("backgroundUpload")} className="setup-upload__input" type="file" accept={[...ALLOWED_UPLOAD_TYPES].join(",")} onChange={handleBackgroundUpload} />

        {formData.backgroundImage ? (
          <div className="setup-selected-background">
            <img src={formData.backgroundImage} alt={t("setup.currentBackground")} className="setup-selected-background__image" />
            <div>
              <p className="setup-selected-background__title">{t("setup.currentBackground")}</p>
              <p className="setup-help setup-help--tight">{formData.backgroundImageLabel || t("setup.selectedImage")}</p>
            </div>
          </div>
        ) : null}

        {previewBackgrounds.length ? (
          <div className="setup-background-grid">
            {previewBackgrounds.filter((bg: any) => bg.id !== "default").map((bg: any) => (
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
              <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={handleRemovePhoto}>{t("setup.remove")}</button>
            </div>
          </div>
        ) : null}
      </div>

      <AudioUploadPicker value={formData.musicFile || formData.musicUrl} onChange={(val: any) => updateFormField("musicFile", val)} t={t} />
    </>
  );
}
