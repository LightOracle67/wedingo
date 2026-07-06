import { memo, useMemo } from "react";

const GallerySection = memo(function GallerySection({ style, className, galleryImages }) {
  const images = useMemo(() => {
    try { return JSON.parse(galleryImages || "[]"); } catch { return []; }
  }, [galleryImages]);

  return (
    <section
      data-story-section="gallery"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Galería</p>
        <h2 className="story-title">Nuestros momentos</h2>
        {images.length > 0 ? (
          <div className="gallery-grid mt-4" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.5rem",
          }}>
            {images.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noreferrer">
                <img src={src} alt="" loading="lazy" style={{
                  width: "100%", aspectRatio: "1", objectFit: "cover",
                  borderRadius: "0.75rem",
                  border: "1px solid color-mix(in srgb, var(--invite-shell-border) 70%, transparent)",
                }} />
              </a>
            ))}
          </div>
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            Pronto compartiremos nuestras fotos.
          </p>
        )}
      </div>
    </section>
  );
});

export default GallerySection;
