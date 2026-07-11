import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Galería de imágenes de la invitación con carrusel automático y efecto fade.
 * Carga las imágenes descifradas desde Firestore, muestra una imagen
 * principal con descripción, controles de navegación y miniaturas.
 *
 * El carrusel avanza automáticamente cada 1.5s y se pausa al
 * interactuar (hover, clic en navegación o miniatura).
 *
 * @param {{ style: object, className: string, inviteToken: string }} props
 * @returns {JSX.Element} Sección de galería.
 */
const GallerySection = memo(function GallerySection({ style, className, inviteToken }) {
  const { t } = useTranslation();

  /** Lista de imágenes con metadatos: { id, url, description }. */
  const [images, setImages] = useState([]);
  /** Indica si la galería está cargando. */
  const [loading, setLoading] = useState(true);

  // ── Carga de imágenes desde Firestore ─────────────────

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

  // ── Estado de navegación ──────────────────────────────

  /** Índice de la imagen activa. */
  const [idx, setIdx] = useState(0);
  /** Índice anterior (para animación de salida). */
  const [prevIdx, setPrevIdx] = useState(null);
  /** ¿Está en curso una animación de fade? */
  const [fading, setFading] = useState(false);
  /** ¿Está pausado el carrusel automático? */
  const [paused, setPaused] = useState(false);
  /** Controla qué imágenes han terminado de cargar (principal). */
  const [mainLoaded, setMainLoaded] = useState({});
  /** Controla qué miniaturas han terminado de cargar. */
  const [thumbLoaded, setThumbLoaded] = useState({});

  /** Timer del fade y del auto-avance. */
  const fadeTimerRef = useRef(null);
  const autoTimerRef = useRef(null);

  /** Índice actual limitado al rango válido. */
  const clamped = Math.max(0, Math.min(idx, images.length - 1));
  /** Índice anterior limitado. */
  const prevClamped = prevIdx !== null ? Math.max(0, Math.min(prevIdx, images.length - 1)) : null;
  /** Imagen activa actual con metadatos. */
  const currentImage = images[clamped] || null;

  // ── Limpieza de timers al desmontar ───────────────────

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, []);

  // ── Auto-avance del carrusel (1.5s) ──────────────────

  useEffect(() => {
    if (images.length <= 1 || paused) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      return;
    }
    autoTimerRef.current = setInterval(() => {
      setPrevIdx((prev) => {
        setFading(true);
        setIdx((i) => {
          fadeTimerRef.current = setTimeout(() => {
            setFading(false);
            setPrevIdx(null);
          }, 350);
          return (i + 1) % images.length;
        });
        // Devolvemos el valor actual para que setPrevIdx lo capture
        const curIdx = typeof prev === "number" ? prev : 0;
        return curIdx;
      });
    }, 3000);
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [images.length, paused]);

  // Pausa el carrusel al hacer hover sobre la galería
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  // ── Navegación manual con fade ────────────────────────

  const prev = useCallback(() => {
    if (fading || images.length <= 1) return;
    setPaused(true);
    setPrevIdx(idx);
    setFading(true);
    setIdx((i) => (i - 1 + images.length) % images.length);
    fadeTimerRef.current = setTimeout(() => {
      setFading(false);
      setPrevIdx(null);
    }, 350);
  }, [fading, idx, images.length]);

  const next = useCallback(() => {
    if (fading || images.length <= 1) return;
    setPaused(true);
    setPrevIdx(idx);
    setFading(true);
    setIdx((i) => (i + 1) % images.length);
    fadeTimerRef.current = setTimeout(() => {
      setFading(false);
      setPrevIdx(null);
    }, 350);
  }, [fading, idx, images.length]);

  const goTo = useCallback((i) => {
    if (fading || i === idx || images.length <= 1) return;
    setPaused(true);
    setPrevIdx(idx);
    setFading(true);
    setIdx(i);
    fadeTimerRef.current = setTimeout(() => {
      setFading(false);
      setPrevIdx(null);
    }, 350);
  }, [fading, idx, images.length]);

  // ═══════════════════════════════════════════════════════
  // ESTADOS DE CARGA / VACÍO
  // ═══════════════════════════════════════════════════════

  if (loading) {
    return (
      <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
        <div className="story-card story-panel story-card--info w-full text-center" style={{ maxWidth: "min(100%, 56rem)" }}>
          <p className="story-eyebrow">{t("gallery.sectionLabel")}</p>
          <h2 className="story-title">{t("gallery.title")}</h2>
          <div className="page-loading" style={{ marginTop: "2rem" }} />
        </div>
      </section>
    );
  }

  if (!images.length) {
    return (
      <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
        <div className="story-card story-panel story-card--info w-full text-center" style={{ maxWidth: "min(100%, 56rem)" }}>
          <p className="story-eyebrow">{t("gallery.sectionLabel")}</p>
          <h2 className="story-title">{t("gallery.title")}</h2>
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>{t("gallery.empty")}</p>
        </div>
      </section>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDERIZADO PRINCIPAL
  // ═══════════════════════════════════════════════════════

  return (
    <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
      <div
        className="story-card story-panel story-card--info w-full text-center"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") prev(); else if (e.key === "ArrowRight") next(); }}
        style={{ maxWidth: "min(100%, 56rem)" }}
      >
        <p className="story-eyebrow">{t("gallery.sectionLabel")}</p>
        <h2 className="story-title">{t("gallery.title")}</h2>

        {/* ── Contador de imagen ── */}
        {images.length > 1 && (
          <p className="gallery-counter">{clamped + 1} / {images.length}</p>
        )}

        {/* ── Imagen principal con contenedor de fade ── */}
        <div className="mt-3" style={{ position: "relative", userSelect: "none" }}>
          {!mainLoaded[clamped] ? (
            <div className="gallery-main-skeleton">
              <div className="page-loading" />
            </div>
          ) : null}

          <div className="gallery-main-container" style={{ display: mainLoaded[clamped] ? "flex" : "none" }}>
            {fading && prevClamped !== null && mainLoaded[prevClamped] && (
              <img
                src={images[prevClamped].url || images[prevClamped]}
                alt=""
                aria-hidden="true"
                className="gallery-fade gallery-fade--out gallery-main-img"
              />
            )}

            <img
              src={currentImage?.url || currentImage}
              alt={currentImage?.description || t("gallery.imageAlt")}
              onLoad={() => setMainLoaded((p) => ({ ...p, [clamped]: true }))}
              className={`gallery-main-img${fading ? " gallery-fade gallery-fade--in" : ""}`}
              style={{ position: fading ? "absolute" : "relative" }}
            />
          </div>

          {/* ── Controles de navegación ── */}
          {images.length > 1 && (
            <>
              <button type="button" onClick={prev} aria-label={t("gallery.prev")} className="gallery-nav gallery-nav--prev" disabled={fading}>
                ‹
              </button>
              <button type="button" onClick={next} aria-label={t("gallery.next")} className="gallery-nav gallery-nav--next" disabled={fading}>
                ›
              </button>
            </>
          )}
        </div>

        {/* ── Descripción de la imagen actual ── */}
        {currentImage?.description && (
          <p className="gallery-caption">{currentImage.description}</p>
        )}

        {/* ── Miniaturas ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          {images.map((img, i) => {
            const src = img.url || img;
            return (
              <button
                key={img.id || i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("gallery.thumbnailAria", { number: i + 1 })}
                className="gallery-thumb"
                style={{
                  border: i === clamped ? "2px solid var(--setup-accent)" : "2px solid transparent",
                  opacity: i === clamped ? 1 : 0.55,
                }}
              >
                {!thumbLoaded[i] ? <div className="page-loading" style={{ width: "100%", height: "100%", minHeight: 0 }} /> : null}
                <img
                  src={src}
                  alt={img.description || t("gallery.thumbnailAlt")}
                  onLoad={() => setThumbLoaded((p) => ({ ...p, [i]: true }))}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: thumbLoaded[i] ? "block" : "none" }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
});

export default GallerySection;
