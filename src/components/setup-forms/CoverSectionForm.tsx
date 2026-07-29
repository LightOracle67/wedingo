import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";
import { useToast } from "../../hooks/useToast";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES } from "../../lib/constants";
import { uploadImage } from "../../lib/image-store";
import ThemePicker from "../ThemePicker";
import MusicArrayEditor from "../MusicArrayEditor";

export default function CoverSectionForm({ prefix = "" }) {
  const {
    formData, updateFormField,
    inviteToken,
  } = useApp();
  const { t } = useTranslation();
  const { addToast, startUploadToast } = useToast();

  const photoRef = useRef<HTMLInputElement>(null);
  const id = (name: string) => `${prefix}${name}`;

  const handleCouplePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    if (file.size === 0) { addToast("error", t("setup.errorEmptyFile")); return; }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) { addToast("error", t("setup.errorFileFormat")); return; }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) { addToast("error", t("setup.errorFileSize")); return; }
    const upload = startUploadToast(t("setup.photoUploading"));
    try {
      const { dataUrl } = await uploadImage(inviteToken, file, (p: number) => upload.update(p));
      upload.update(90);
      updateFormField("couplePhoto", dataUrl);
      upload.complete(t("setup.photoUploaded"));
    } catch {
      upload.error(t("setup.photoUploadFailed"));
    }
    if (input) input.value = "";
  }, [inviteToken, updateFormField, startUploadToast, addToast, t]);

  const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField("firstName", e.target.value.slice(0, 20));
  }, [updateFormField]);

  const handleSecondNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField("secondName", e.target.value.slice(0, 20));
  }, [updateFormField]);

  const handleThemeChange = useCallback((val: string) => {
    updateFormField("theme", val);
  }, [updateFormField]);

  const handleRemovePhoto = useCallback(() => {
    updateFormField("couplePhoto", "");
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
              onBlur={() => updateFormField("firstName", formData.firstName.trim())}
              placeholder={t("setup.namePlaceholder")}
              autoComplete="off"
              required
              aria-required="true"
            />
          </div>
          <div className="setup-name-col">
            <label className="setup-label" htmlFor={id("secondName")}>{t("setup.secondNameLabel")}</label>
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
            <p className="setup-label setup-label--tight">{t("setup.couplePhotoLabel")}</p>
            <p className="setup-help setup-help--tight">{t("setup.couplePhotoHint")}</p>
          </div>
          {formData.couplePhoto ? (
            <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleRemovePhoto}>{t("setup.remove")}</button>
          ) : null}
        </div>

        {formData.couplePhoto ? (
          <div className="setup-selected-background">
            <img src={formData.couplePhoto} alt={t("setup.couplePhotoLabel")} className="setup-selected-background__image" style={{ borderRadius: "50%", aspectRatio: "1", width: "5rem" }} />
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
          <label className="setup-upload" htmlFor={id("couplePhoto")} style={{ textAlign: "center", cursor: "pointer", fontSize: "0.8rem", color: "var(--setup-accent)", textDecoration: "underline" }}>
            {t("setup.replaceImage")}
            <input id={id("couplePhoto")} className="setup-upload__input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCouplePhotoUpload} />
          </label>
        ) : null}
      </div>

      <div className="story-divider" style={{ margin: "0.75rem 0" }} />

      <div className="setup-background-panel">
        <div className="setup-background-panel__header">
          <div>
            <p className="setup-label setup-label--tight">{t("setup.backgroundLabel")}</p>
            <p className="setup-help setup-help--tight">{t("setup.backgroundHint")}</p>
          </div>
          {formData.backgroundImage ? (
            <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => updateFormField("backgroundImage", "")}>{t("setup.remove")}</button>
          ) : null}
        </div>

        {formData.backgroundImage ? (
          <div className="setup-selected-background">
            <img src={formData.backgroundImage} alt="" className="setup-selected-background__image" style={{ width: "100%", maxHeight: "100px", objectFit: "cover", borderRadius: "0.35rem" }} />
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
          if (!ALLOWED_UPLOAD_TYPES.has(file.type)) { addToast("error", t("setup.errorFileFormat")); return; }
          if (file.size > MAX_UPLOAD_SIZE_BYTES) { addToast("error", t("setup.errorFileSize")); return; }
          const { dataUrl } = await uploadImage(inviteToken, file, () => {});
          updateFormField("backgroundImage", dataUrl);
          e.target.value = "";
        }} />
      </div>

      <div className="story-divider" style={{ margin: "0.75rem 0" }} />

      <p className="setup-label">{t("setup.cornerDecorationsLabel")}</p>
      <p className="setup-help">{t("setup.cornerDecorationsHint")}</p>
      <div className="setup-name-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {(["TL", "TR", "BL", "BR"] as const).map((corner) => {
          const field = `cornerDecoration${corner}` as const;
          const hasValue = !!(formData as Record<string, unknown>)[field];
          return (
            <div key={corner} className="setup-background-panel" style={{ marginBottom: "0.5rem" }}>
              <div className="setup-background-panel__header">
                <span className="setup-label setup-label--tight" style={{ fontSize: "0.8rem" }}>{t(`setup.corner${corner}Label`)}</span>
                {hasValue ? (
                  <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => updateFormField(field, "")} style={{ fontSize: "0.7rem" }}>{t("setup.remove")}</button>
                ) : null}
              </div>
              {hasValue ? (
                <div>
                  <img src={(formData as Record<string, unknown>)[field] as string} alt="" style={{ width: "2.5rem", height: "2.5rem", objectFit: "contain" }} />
                </div>
              ) : (
                <label className="setup-upload" htmlFor={id(field)} style={{ padding: "0.3rem", minHeight: "2rem" }}>
                  <span className="setup-upload__title" style={{ fontSize: "0.75rem" }}>{t("setup.uploadCorner")}</span>
                </label>
              )}
              <input className="setup-upload__input" id={id(field)} type="file" accept="image/png,image/svg+xml" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1024 * 1024) { addToast("error", t("setup.errorFileSize")); return; }
                const { dataUrl } = await uploadImage(inviteToken, file, () => {});
                updateFormField(field, dataUrl);
                e.target.value = "";
              }} />
            </div>
          );
        })}
      </div>

      <MusicArrayEditor inviteToken={inviteToken} value={formData.musicFile || formData.musicUrl} onChange={(val: string) => updateFormField("musicFile", val)} t={t} />
    </>
  );
}
