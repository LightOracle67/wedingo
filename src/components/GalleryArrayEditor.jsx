import { memo, useCallback, useEffect, useState } from "react";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES } from "../lib/constants";
import { useToast } from "../hooks/useToast";

const SLOT_COUNT = 10;

const galleryItemStyle = {
  border: "1px solid var(--setup-border)",
  borderRadius: "0.5rem",
  padding: "0.5rem",
  background: "color-mix(in srgb, var(--setup-field-bg) 30%, transparent)",
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
};

const GalleryArrayEditor = memo(function GalleryArrayEditor({ inviteToken, t }) {
  const { addToast, startUploadToast } = useToast();
  const [slots, setSlots] = useState(Array.from({ length: SLOT_COUNT }, () => null));
  const [loading, setLoading] = useState(true);
  const [uploadingSlots, setUploadingSlots] = useState(new Set());

  const loadGallery = useCallback(async () => {
    if (!inviteToken) return;
    setLoading(true);
    try {
      const { loadGallery: loadFn } = await import("../lib/image-store");
      const images = await loadFn(inviteToken);
      const newSlots = Array.from({ length: SLOT_COUNT }, () => null);
      for (const img of images) {
        if (img.position !== undefined && img.position < SLOT_COUNT) {
          newSlots[img.position] = { id: img.id, url: img.url, description: img.description || "" };
        }
      }
      setSlots(newSlots);
    } catch {} finally {
      setLoading(false);
    }
  }, [inviteToken]);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  const handleUpload = useCallback(async (e, slotIndex) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) { addToast("error", t("setup.errorFileFormat")); if (input) input.value = ""; return; }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) { addToast("error", t("setup.errorFileSize")); if (input) input.value = ""; return; }

    setUploadingSlots((prev) => new Set(prev).add(slotIndex));
    const upload = startUploadToast(t("setup.galleryUploading", { total: 1 }));
    try {
      const { uploadImage, addGalleryImage, deleteGalleryImage } = await import("../lib/image-store");
      const { encrypted, dataUrl } = await uploadImage(inviteToken, file, (p) => upload.update(p));
      const existing = slots[slotIndex];
      if (existing?.id) {
        await deleteGalleryImage(inviteToken, existing.id);
      }
      const saved = await addGalleryImage(inviteToken, encrypted, dataUrl, slotIndex, (p) => upload.update(85 + Math.round(p * 0.1)));
      setSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = { id: saved.id, url: saved.dataUrl, description: "" };
        return next;
      });
      upload.complete(t("setup.galleryUploadSuccess", { count: 1 }));
    } catch {
      upload.error(t("setup.galleryUploadFailed"));
    } finally {
      setUploadingSlots((prev) => { const n = new Set(prev); n.delete(slotIndex); return n; });
    }
    if (input) input.value = "";
  }, [inviteToken, slots, startUploadToast, addToast, t]);

  const handleDelete = useCallback(async (slotIndex) => {
    const existing = slots[slotIndex];
    if (!existing?.id) return;
    try {
      const { deleteGalleryImage } = await import("../lib/image-store");
      await deleteGalleryImage(inviteToken, existing.id);
      setSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
    } catch {}
  }, [inviteToken, slots]);

  const handleDescriptionChange = useCallback((slotIndex, val) => {
    setSlots((prev) => {
      const next = [...prev];
      if (next[slotIndex]) {
        next[slotIndex] = { ...next[slotIndex], description: val };
      }
      return next;
    });
  }, []);

  const handleDescriptionBlur = useCallback(async (slotIndex) => {
    const item = slots[slotIndex];
    if (!item?.id) return;
    try {
      const { updateGalleryDescription } = await import("../lib/image-store");
      await updateGalleryDescription(inviteToken, item.id, item.description);
    } catch {}
  }, [inviteToken, slots]);

  if (loading) {
    return <div className="page-loading" />;
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const item = slots[i];
          const isUploading = uploadingSlots.has(i);
          return (
            <div key={i} style={galleryItemStyle}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--setup-muted)", marginBottom: "0.15rem" }}>
                #{i + 1}
              </div>

              {item ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div style={{ position: "relative" }}>
                    <img
                      src={item.url}
                      alt={item.description || t("setup.galleryUploadLabel")}
                      style={{ width: "100%", aspectRatio: "1.5", objectFit: "cover", borderRadius: "0.35rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDelete(i)}
                      style={{ position: "absolute", top: "3px", right: "3px", width: "1.3rem", height: "1.3rem", borderRadius: "999px", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "0.75rem", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1 }}
                      disabled={isUploading}
                      aria-label={t("common.delete")}
                    >×</button>
                  </div>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleDescriptionChange(i, e.target.value)}
                    onBlur={() => handleDescriptionBlur(i)}
                    placeholder={t("setup.galleryDescriptionPlaceholder")}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "0.8rem", padding: "0.3rem 0.4rem", borderRadius: "0.25rem", border: "1px solid var(--setup-field-border)", background: "var(--setup-field-bg)", color: "var(--setup-title)" }}
                  />
                  <label
                    style={{ textAlign: "center", cursor: isUploading ? "not-allowed" : "pointer", fontSize: "0.75rem", color: "var(--setup-accent)", textDecoration: "underline", opacity: isUploading ? 0.5 : 1 }}
                  >
                    {isUploading ? t("setup.galleryUploading", { total: 1 }) : t("setup.replaceImage")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => handleUpload(e, i)}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              ) : (
                <label
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "140px", border: "2px dashed var(--setup-border)", borderRadius: "0.35rem", cursor: isUploading ? "not-allowed" : "pointer", color: "var(--setup-muted)", fontSize: "0.8rem", gap: "0.3rem", opacity: isUploading ? 0.5 : 1 }}
                >
                  <span style={{ fontSize: "1.5rem" }}>＋</span>
                  <span>{isUploading ? t("setup.galleryUploading", { total: 1 }) : t("setup.galleryUploadLabel")}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={(e) => handleUpload(e, i)}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default GalleryArrayEditor;
