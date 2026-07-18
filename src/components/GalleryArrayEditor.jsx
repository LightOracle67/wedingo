import { memo, useCallback, useRef } from "react";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES } from "../lib/constants";
import { useToast } from "../hooks/useToast";

const MAX_GALLERY = 10;

const btnBase = {
  width: "1.5rem",
  height: "1.5rem",
  borderRadius: "0.25rem",
  border: "1px solid var(--setup-field-border)",
  background: "var(--setup-field-bg)",
  color: "var(--setup-title)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: "0.8rem",
  lineHeight: 1,
  padding: 0,
};

const GalleryArrayEditor = memo(function GalleryArrayEditor({ images, onChange, inviteToken, t }) {
  const { addToast, startUploadToast } = useToast();
  const galleryRef = useRef(null);

  let parsed;
  try { parsed = JSON.parse(images || "[]"); } catch { parsed = []; }

  const persistOrder = useCallback(async (arr) => {
    const items = arr.map((item, i) => ({ id: item.id, position: i })).filter(item => item.id);
    if (!items.length) return;
    try {
      const { updateGalleryOrder } = await import("../lib/image-store");
      await updateGalleryOrder(inviteToken, items);
    } catch {}
  }, [inviteToken]);

  const handleUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    const input = e.target;
    if (!files.length) return;
    const valid = files.filter(f => ALLOWED_UPLOAD_TYPES.has(f.type) && f.size <= MAX_UPLOAD_SIZE_BYTES);
    if (!valid.length) { addToast("error", t("setup.noValidFiles")); return; }
    let current;
    try { current = JSON.parse(images || "[]"); } catch { current = []; }
    if (current.length >= MAX_GALLERY) {
      addToast("error", t("setup.galleryMaxReached", { max: MAX_GALLERY }));
      if (input) input.value = "";
      return;
    }
    const remaining = MAX_GALLERY - current.length;
    const toUpload = valid.slice(0, remaining);
    if (valid.length > remaining) {
      addToast("warning", t("setup.galleryTrimmed", { selected: valid.length, max: MAX_GALLERY }));
    }
    const upload = startUploadToast(t("setup.galleryUploading", { total: toUpload.length }));
    try {
      const { uploadImage, addGalleryImage } = await import("../lib/image-store");
      const newImages = [...current];
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        const fileBase = Math.round((i / toUpload.length) * 100);
        const fileSpan = Math.round(100 / toUpload.length);
        const onFileProgress = (p) => {
          upload.update(fileBase + Math.round((p / 100) * fileSpan));
        };
        const { encrypted, dataUrl } = await uploadImage(inviteToken, file, onFileProgress);
        const saved = await addGalleryImage(inviteToken, encrypted, dataUrl, newImages.length, onFileProgress);
        newImages.push({ id: saved.id, url: saved.dataUrl, description: "" });
      }
      onChange(JSON.stringify(newImages));
      upload.complete(t("setup.galleryUploadSuccess", { count: toUpload.length }));
    } catch {
      upload.error(t("setup.galleryUploadFailed"));
    }
    if (input) input.value = "";
  }, [images, onChange, inviteToken, startUploadToast, addToast, t]);

  const handleDelete = useCallback(async (index) => {
    const arr = [...parsed];
    const removed = arr.splice(index, 1)[0];
    onChange(JSON.stringify(arr));
    persistOrder(arr);
    if (removed?.id) {
      try {
        const { deleteGalleryImage } = await import("../lib/image-store");
        await deleteGalleryImage(inviteToken, removed.id);
      } catch {}
    }
  }, [parsed, onChange, inviteToken, persistOrder]);

  const handleMoveUp = useCallback((index) => {
    if (index <= 0) return;
    const arr = [...parsed];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    onChange(JSON.stringify(arr));
    persistOrder(arr);
  }, [parsed, onChange, persistOrder]);

  const handleMoveDown = useCallback((index) => {
    if (index >= parsed.length - 1) return;
    const arr = [...parsed];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    onChange(JSON.stringify(arr));
    persistOrder(arr);
  }, [parsed, onChange, persistOrder]);

  const handleDescriptionChange = useCallback((index, val) => {
    const arr = [...parsed];
    arr[index] = { ...arr[index], description: val };
    onChange(JSON.stringify(arr));
  }, [parsed, onChange]);

  const handleBlur = useCallback(async (index) => {
    const item = parsed[index];
    if (!item?.id) return;
    try {
      const { updateGalleryDescription } = await import("../lib/image-store");
      await updateGalleryDescription(inviteToken, item.id, item.description);
    } catch {}
  }, [parsed, inviteToken]);

  return (
    <div>
      <label className="setup-upload" htmlFor="galleryUpload">
        <span className="setup-upload__title">{t("setup.galleryUploadLabel")}</span>
        <span className="setup-upload__subtitle">{t("setup.galleryUploadHint")}</span>
      </label>
      <input ref={galleryRef} id="galleryUpload" className="setup-upload__input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleUpload} />

      {parsed.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.6rem", marginTop: "0.6rem" }}>
          {parsed.map((item, i) => (
            <div key={item.id || i} style={{ background: "color-mix(in srgb, var(--setup-field-bg) 40%, transparent)", borderRadius: "0.5rem", padding: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img src={item.url} alt={item.description || t("setup.galleryUploadLabel")} style={{ width: "5rem", height: "5rem", objectFit: "cover", borderRadius: "0.4rem" }} />
                  <button type="button" onClick={() => handleDelete(i)} style={{ position: "absolute", top: "-4px", right: "-4px", width: "1.2rem", height: "1.2rem", borderRadius: "999px", border: "none", background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: "0.7rem", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--setup-muted)", fontWeight: 600 }}>#{i + 1}</span>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button type="button" onClick={() => handleMoveUp(i)} disabled={i === 0} style={{ ...btnBase, opacity: i === 0 ? 0.3 : 1 }} aria-label={t("setup.galleryMoveUp")}>↑</button>
                    <button type="button" onClick={() => handleMoveDown(i)} disabled={i >= parsed.length - 1} style={{ ...btnBase, opacity: i >= parsed.length - 1 ? 0.3 : 1 }} aria-label={t("setup.galleryMoveDown")}>↓</button>
                  </div>
                </div>
              </div>
              <input
                type="text"
                className="setup-input"
                value={item.description || ""}
                onChange={(e) => handleDescriptionChange(i, e.target.value.slice(0, 200))}
                onBlur={() => handleBlur(i)}
                placeholder={t("setup.galleryDescriptionPlaceholder")}
                style={{ width: "100%", marginTop: "0.35rem", fontSize: "0.82rem", padding: "0.35rem 0.5rem", boxSizing: "border-box" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default GalleryArrayEditor;
