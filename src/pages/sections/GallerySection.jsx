import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const GallerySection = memo(function GallerySection({ style, className, inviteToken }) {
  const { t } = useTranslation();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      const { loadGallery } = await import("../../lib/image-store");
      const result = await loadGallery(inviteToken);
      if (!cancelled) { setImages(result); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [inviteToken]);

  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState({});
  const clamped = Math.max(0, Math.min(idx, images.length - 1));

  const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);

  if (loading) {
    return (
      <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
        <div className="story-card story-panel story-card--info w-full text-center">
          <p className="story-eyebrow">{t("gallery:sectionLabel")}</p>
          <h2 className="story-title">{t("gallery:title")}</h2>
          <div className="page-loading" style={{ marginTop: "2rem" }} />
        </div>
      </section>
    );
  }
  if (!images.length) {
    return (
      <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
        <div className="story-card story-panel story-card--info w-full text-center">
          <p className="story-eyebrow">{t("gallery:sectionLabel")}</p>
          <h2 className="story-title">{t("gallery:title")}</h2>
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>{t("gallery:empty")}</p>
        </div>
      </section>
    );
  }

  return (
    <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">{t("gallery:sectionLabel")}</p>
        <h2 className="story-title">{t("gallery:title")}</h2>

        <div className="mt-4" style={{ position: "relative", userSelect: "none" }}>
          {!loaded[clamped] ? (
            <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: "0.9rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)", display: "grid", placeItems: "center" }}>
              <div className="page-loading" />
            </div>
          ) : null}
          <img src={images[clamped]} alt={t("gallery:imageAlt")} onLoad={() => setLoaded((p) => ({ ...p, [clamped]: true }))} style={{
            width: "100%", aspectRatio: "16/10", objectFit: "cover",
            borderRadius: "0.9rem", display: loaded[clamped] ? "block" : "none",
            border: "1px solid color-mix(in srgb, var(--invite-shell-border) 70%, transparent)",
          }} />

          {images.length > 1 && (
            <>
              <button type="button" onClick={prev} aria-label={t("gallery:prev")} style={{
                position: "absolute", left: "0.5rem", top: "50%", translate: "0 -50%",
                width: "2.2rem", height: "2.2rem", borderRadius: "999px", border: "none",
                background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: "1.2rem",
                cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1,
              }}>‹</button>
              <button type="button" onClick={next} aria-label={t("gallery:next")} style={{
                position: "absolute", right: "0.5rem", top: "50%", translate: "0 -50%",
                width: "2.2rem", height: "2.2rem", borderRadius: "999px", border: "none",
                background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: "1.2rem",
                cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1,
              }}>›</button>
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          {images.map((src, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)} aria-label={t("gallery:thumbnailAria", { number: i + 1 })} style={{
              width: "2.5rem", height: "2.5rem", borderRadius: "0.4rem", overflow: "hidden", cursor: "pointer", padding: 0,
              border: i === clamped ? "2px solid var(--setup-accent)" : "2px solid transparent",
              opacity: i === clamped ? 1 : 0.55, transition: "opacity 200ms, border-color 200ms", background: "color-mix(in srgb, var(--setup-field-bg) 50%, transparent)",
            }}>
              {!loaded[i] ? <div className="page-loading" style={{ width: "100%", height: "100%", minHeight: 0 }} /> : null}
              <img src={src} alt={t("gallery:thumbnailAlt")} onLoad={() => setLoaded((p) => ({ ...p, [i]: true }))} style={{ width: "100%", height: "100%", objectFit: "cover", display: loaded[i] ? "block" : "none" }} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
});

export default GallerySection;
