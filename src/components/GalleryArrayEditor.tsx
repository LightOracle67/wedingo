/**
 * GalleryArrayEditor — Editor de galería de imágenes.
 * 
 * Proporciona 10 slots para subir imágenes con compresión y cifrado.
 * Cada slot permite: subir, reemplazar, eliminar y añadir descripción.
 * Las imágenes se almacenan en la subcolección invitations/{token}/gallery.
 *
 * @param {string} inviteToken - Token de la invitación
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES } from "../lib/constants";
import { useToast } from "../hooks/useToast";
import { withTimeout } from "../lib/async-utils";
import { SlotState } from "../types";

const SLOT_COUNT = 10;

const galleryItemStyle: React.CSSProperties = {
  border: "1px solid var(--setup-border)",
  borderRadius: "0.5rem",
  padding: "0.5rem",
  background: "color-mix(in srgb, var(--setup-field-bg) 30%, transparent)",
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
};

interface GalleryArrayEditorProps {
  inviteToken?: string;
}

const GalleryArrayEditor = memo(function GalleryArrayEditor({ inviteToken }: GalleryArrayEditorProps) {
  const { t } = useTranslation();
  const { addToast, startUploadToast } = useToast();
  const [slots, setSlots] = useState<(SlotState | null)[]>(Array.from({ length: SLOT_COUNT }, () => null));
  const [loading, setLoading] = useState(true);
  const [uploadingSlots, setUploadingSlots] = useState<Set<number>>(new Set<number>());
  const slotsRef = useRef<(SlotState | null)[]>(slots);
  slotsRef.current = slots;

  const loadGallery = useCallback(async () => {

    if (!inviteToken) { ; return; }
    setLoading(true);
    try {
      const { loadGallery: loadFn } = await import("../lib/image-store");
      const images = await loadFn(inviteToken);

      const newSlots: (SlotState | null)[] = Array.from({ length: SLOT_COUNT }, () => null);
      for (const img of images) {
        if (img.position !== undefined && img.position < SLOT_COUNT) {
          newSlots[img.position] = { id: img.id, url: img.url, description: img.description || "", originalName: img.originalName || "", originalSize: img.originalSize || 0 };
        }
      }
      setSlots(newSlots);

    } catch (err) {
      console.error("[app]", "[GalleryArrayEditor]", "loadGallery error", { error: err });
      addToast("error", t("errors.galleryLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [inviteToken, addToast, t]);

  useEffect(() => { ; loadGallery(); }, [loadGallery]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {

    if (!inviteToken) return;
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;

    if (file.size === 0) { ; addToast("error", t("setup.errorEmptyFile")); if (input) input.value = ""; return; }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) { ; addToast("error", t("setup.errorFileFormat")); if (input) input.value = ""; return; }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) { ; addToast("error", t("setup.errorFileSize")); if (input) input.value = ""; return; }

    const duplicate = slots.some((s: SlotState | null) => s && s.originalName === file.name && s.originalSize === file.size);
    if (duplicate) { ; addToast("warning", t("setup.duplicateFileWarning")); if (input) input.value = ""; return; }

    setUploadingSlots((prev: Set<number>) => new Set(prev).add(slotIndex));
    const upload = startUploadToast(t("setup.galleryUploading", { total: 1 }));
    try {
      const { uploadImage, addGalleryImage, deleteGalleryImage } = await import("../lib/image-store");
      const { encrypted, dataUrl } = await withTimeout(uploadImage(inviteToken, file, (p: number) => upload.update(p)), 30000, "Image upload timed out");

      // Añadir primero y borrar la anterior después: si el alta falla, la
      // foto previa no se pierde (antes se borraba primero).
      const saved = await addGalleryImage(inviteToken, encrypted, dataUrl, slotIndex, (p: number) => upload.update(85 + Math.round(p * 0.1)), file.name, file.size);
      const existing = slots[slotIndex];
      if (existing?.id && existing.id !== saved.id) {
        try { await deleteGalleryImage(inviteToken, existing.id); } catch { /* huérfana tolerable */ }
      }

      setSlots((prev: (SlotState | null)[]) => {
        const next = [...prev];
        next[slotIndex] = { id: saved.id, url: saved.dataUrl, description: "", originalName: file.name, originalSize: file.size };
        return next;
      });
      upload.complete(t("setup.galleryUploadSuccess", { count: 1 }));

    } catch (err) {
      console.error("[app]", "[GalleryArrayEditor]", "upload error", { slotIndex, error: err });
      upload.error(t("setup.galleryUploadFailed"));
    } finally {
      setUploadingSlots((prev: Set<number>) => { const n = new Set(prev); n.delete(slotIndex); return n; });
    }
    if (input) input.value = "";
  }, [inviteToken, slots, startUploadToast, addToast, t]);

  const handleDelete = useCallback(async (slotIndex: number) => {

    if (!inviteToken) return;
    const existing = slots[slotIndex];
    if (!existing?.id) { ; return; }
    if (!window.confirm(t("setup.deleteImageConfirm"))) { ; return; }
    try {
      const { deleteGalleryImage } = await import("../lib/image-store");
      await deleteGalleryImage(inviteToken, existing.id);
      setSlots((prev: (SlotState | null)[]) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });

    } catch (err) {
      console.error("[app]", "[GalleryArrayEditor]", "delete error", { error: err });
      addToast("error", t("errors.galleryDeleteFailed"));
    }
  }, [inviteToken, slots, t, addToast]);

  const handleDescriptionChange = useCallback((slotIndex: number, val: string) => {
    setSlots((prev: (SlotState | null)[]) => {
      const next = [...prev];
      if (next[slotIndex]) {
        next[slotIndex] = { ...next[slotIndex], description: val };
      }
      return next;
    });
  }, []);

  const handleDescriptionBlur = useCallback(async (slotIndex: number, currentValue: string) => {

    if (!inviteToken) return;
    const item = slotsRef.current[slotIndex];
    if (!item?.id) {

      addToast("error", t("errors.imageIdNotFound"));
      return;
    }
    const safe = String(currentValue ?? "").slice(0, 200).trim();
    try {
      const { updateGalleryDescription } = await import("../lib/image-store");
      await updateGalleryDescription(inviteToken, item.id, safe);

      addToast("success", t("setup.galleryDescriptionSaved"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[app]", "[GalleryArrayEditor]", "description save error", { error: msg });
      addToast("error", `${t("setup.galleryDescriptionSaveFailed")}: ${msg}`);
    }
  }, [inviteToken, addToast, t]);

  /** Mueve una imagen una posición (reorden visible en la invitación). */
  const handleMove = useCallback(async (slotIndex: number, dir: -1 | 1) => {
    if (!inviteToken) return;
    const target = slotIndex + dir;
    if (target < 0 || target >= SLOT_COUNT) return;
    const current = slots[slotIndex];
    const other = slots[target];
    if (!current) return;
    try {
      const next = [...slots];
      next[slotIndex] = other ?? null;
      next[target] = current;
      setSlots(next);
      const { updateGalleryOrder } = await import("../lib/image-store");
      await updateGalleryOrder(
        inviteToken,
        next.map((s, i) => ({ id: s?.id ?? "", position: i })).filter((x) => x.id !== ""),
      );
    } catch (err) {
      console.error("[app]", "[GalleryArrayEditor]", "reorder error", { error: err });
      addToast("error", t("errors.generic"));
      // Revertir al estado previo si falla la persistencia.
      setSlots(slots);
    }
  }, [inviteToken, slots, addToast, t]);

  if (loading) {
    return <div className="page-loading" />;
  }

  return (
    <div>
      <p className="setup-help" style={{ marginBottom: "0.5rem" }}>{t("setup.galleryHint")}</p>
      <div className="gallery-array-editor__grid">
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const item = slots[i];
          const isUploading = uploadingSlots.has(i);
          return (
            <div key={i} style={galleryItemStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--setup-muted)" }}>
                  #{i + 1}
                </span>
                {item ? (
                  <span style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      type="button"
                      onClick={() => handleMove(i, -1)}
                      disabled={isUploading || i === 0}
                      aria-label={t("setup.galleryMoveLeft")}
                      title={t("setup.galleryMoveLeft")}
                      style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", cursor: "pointer", border: "1px solid var(--setup-border)", borderRadius: "4px", background: "transparent", color: "var(--setup-title)" }}
                    >←</button>
                    <button
                      type="button"
                      onClick={() => handleMove(i, 1)}
                      disabled={isUploading || i >= SLOT_COUNT - 1}
                      aria-label={t("setup.galleryMoveRight")}
                      title={t("setup.galleryMoveRight")}
                      style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", cursor: "pointer", border: "1px solid var(--setup-border)", borderRadius: "4px", background: "transparent", color: "var(--setup-title)" }}
                    >→</button>
                  </span>
                ) : null}
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
                    id={`gallery-desc-${i}`}
                    type="text"
                    value={item.description}
                    onChange={(e) => handleDescriptionChange(i, e.target.value)}
                    onBlur={(e) => handleDescriptionBlur(i, e.target.value)}
                    placeholder={t("setup.galleryDescriptionPlaceholder")}
                    aria-label={t("setup.galleryDescriptionPlaceholder")}
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
