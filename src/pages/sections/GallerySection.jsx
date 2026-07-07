import { memo, useCallback, useEffect, useMemo, useState } from "react";

const GallerySection = memo(function GallerySection({ style, className, inviteToken }) {
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
  const clamped = Math.max(0, Math.min(idx, images.length - 1));

  const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);

  if (loading) return null;
  if (!images.length) {
    return (
      <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
        <div className="story-card story-panel story-card--info w-full text-center">
          <p className="story-eyebrow">Galería</p>
          <h2 className="story-title">Nuestros momentos</h2>
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>Pronto compartiremos nuestras fotos.</p>
        </div>
      </section>
    );
  }

  return (
    <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Galería</p>
        <h2 className="story-title">Nuestros momentos</h2>

        <div className="mt-4" style={{ position: "relative", userSelect: "none" }}>
          <img src={images[clamped]} alt="" style={{
            width: "100%", aspectRatio: "16/10", objectFit: "cover",
            borderRadius: "0.9rem", display: "block",
            border: "1px solid color-mix(in srgb, var(--invite-shell-border) 70%, transparent)",
          }} />

          {images.length > 1 && (
            <>
              <button type="button" onClick={prev} aria-label="Anterior" style={{
                position: "absolute", left: "0.5rem", top: "50%", translate: "0 -50%",
                width: "2.2rem", height: "2.2rem", borderRadius: "999px", border: "none",
                background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: "1.2rem",
                cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1,
              }}>‹</button>
              <button type="button" onClick={next} aria-label="Siguiente" style={{
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
            <button key={i} type="button" onClick={() => setIdx(i)} aria-label={`Foto ${i + 1}`} style={{
              width: "2.5rem", height: "2.5rem", borderRadius: "0.4rem", overflow: "hidden", cursor: "pointer", padding: 0,
              border: i === clamped ? "2px solid var(--setup-accent)" : "2px solid transparent",
              opacity: i === clamped ? 1 : 0.55, transition: "opacity 200ms, border-color 200ms", background: "none",
            }}>
              <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
});

export default GallerySection;
