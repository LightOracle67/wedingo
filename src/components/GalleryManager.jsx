import { memo, useCallback } from "react";

const GalleryManager = memo(function GalleryManager({ images, onChange, inviteToken, t }) {
  const handleDelete = useCallback(async (index, item) => {
    const arr = JSON.parse(images || "[]");
    const removed = arr.splice(index, 1)[0];
    onChange(JSON.stringify(arr));
    const docId = removed?.id || item?.id;
    if (docId) {
      try {
        const { deleteGalleryImage } = await import("../lib/image-store");
        await deleteGalleryImage(inviteToken, docId);
      } catch {}
    }
  }, [images, onChange, inviteToken]);

  const handleDescriptionChange = useCallback(async (index, val) => {
    const arr = JSON.parse(images || "[]");
    arr[index] = typeof arr[index] === "string" ? { url: arr[index], description: val } : { ...arr[index], description: val };
    onChange(JSON.stringify(arr));
  }, [images, onChange]);

  const handleBlur = useCallback(async (docId, description) => {
    if (!docId) return;
    try {
      const { updateGalleryDescription } = await import("../lib/image-store");
      await updateGalleryDescription(inviteToken, docId, description);
    } catch {}
  }, [inviteToken]);

  let parsed;
  try { parsed = JSON.parse(images || "[]"); } catch { parsed = []; }
  if (!parsed.length) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.6rem", marginTop: "0.6rem" }}>
      {parsed.map((item, i) => {
        const src = typeof item === "string" ? item : item.url || "";
        const desc = typeof item === "string" ? "" : item.description || "";
        const docId = typeof item === "string" ? null : item.id || null;
        return (
          <div key={docId || i} style={{ background: "color-mix(in srgb, var(--setup-field-bg) 40%, transparent)", borderRadius: "0.5rem", padding: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={src} alt={desc || t("setup.galleryUploadLabel")} style={{ width: "5rem", height: "5rem", objectFit: "cover", borderRadius: "0.4rem" }} />
                <button type="button" onClick={() => handleDelete(i, item)} style={{ position: "absolute", top: "-4px", right: "-4px", width: "1.2rem", height: "1.2rem", borderRadius: "999px", border: "none", background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: "0.7rem", cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1 }}>×</button>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--setup-muted)", fontWeight: 600, marginTop: "0.2rem" }}>#{i + 1}</span>
            </div>
            <input
              type="text"
              className="setup-input"
              value={desc}
              onChange={(e) => handleDescriptionChange(i, e.target.value.slice(0, 200))}
              onBlur={(e) => handleBlur(docId, e.target.value.slice(0, 200))}
              placeholder={t("setup.galleryDescriptionPlaceholder")}
              style={{ width: "100%", marginTop: "0.35rem", fontSize: "0.82rem", padding: "0.35rem 0.5rem", boxSizing: "border-box" }}
            />
          </div>
        );
      })}
    </div>
  );
});

export default GalleryManager;
