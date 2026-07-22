import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import "../../styles/gallery.css";

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
const GallerySection = memo(function GallerySection({ style, className, inviteToken }: any) {
  const { t } = useTranslation();

  const reducedMotion = useReducedMotion();

  /** Lista de imágenes con metadatos: { id, url, description }. */
  const [images, setImages] = useState<any[]>([]);
  /** Indica si la galería está cargando. */
  const [loading, setLoading] = useState(true);

  /** Índice de la imagen abierta en lightbox, o null si cerrado. */
  const [lightboxIndex, setLightboxIndex] = useState<any>(null);

  // ── Carga de imágenes desde Firestore ──

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      const { loadGallery } = await import("../../lib/image-store");
      const result = await loadGallery(inviteToken);
      if (!cancelled) { setImages(result.slice(0, 10)); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [inviteToken]);

  // ── Estado de navegación ──────────────────────────────

  /** Índice de la imagen activa. */
  const [idx, setIdx] = useState(0);
  /** Índice anterior (para animación de salida). */
  const [prevIdx, setPrevIdx] = useState<any>(null);
  /** ¿Está en curso una animación de fade? */
  const [fading, setFading] = useState(false);
  /** ¿Está pausado el carrusel automático? */
  const [paused, setPaused] = useState(false);
  /** Controla qué imágenes han terminado de cargar (principal). */
  const [mainLoaded, setMainLoaded] = useState<any>({});
  /** Controla qué miniaturas han terminado de cargar. */
  const [thumbLoaded, setThumbLoaded] = useState<any>({});

  /** Timer del fade. */
  const fadeTimerRef = useRef<any>(null);
  const lastAdvanceRef = useRef(Date.now());
  const rafRef = useRef<any>(null);

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
    };
  }, []);

  // ── Auto-avance del carrusel con requestAnimationFrame ──

  const handleNextImage = useCallback(() => {
    if (images.length <= 1) return;
    setPrevIdx((prev: any) => {
      setFading(true);
      setIdx((i: any) => {
        fadeTimerRef.current = setTimeout(() => {
          setFading(false);
          setPrevIdx(null);
        }, 550);
        return (i + 1) % images.length;
      });
      const curIdx = typeof prev === "number" ? prev : 0;
      return curIdx;
    });
  }, [images.length]);

  const tick = useCallback(() => {
    if (!paused && !reducedMotion && images.length > 1 && Date.now() - lastAdvanceRef.current >= 5000) {
      lastAdvanceRef.current = Date.now();
      handleNextImage();
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [paused, reducedMotion, images.length, handleNextImage]);

  useEffect(() => {
    if (!reducedMotion) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick, reducedMotion]);

  // Pausa el carrusel al hacer hover sobre la galería
  const pause = useCallback(() => { if (!reducedMotion) setPaused(true); }, [reducedMotion]);
  const resume = useCallback(() => { if (!reducedMotion) { setPaused(false); lastAdvanceRef.current = Date.now(); } }, [reducedMotion]);

  // ── Lightbox ───────────────────────────────────────

  const openLightbox = useCallback((i: any) => {
    setPaused(true);
    setLightboxIndex(i);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((i: any) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((i: any) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: any) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, closeLightbox, lightboxPrev, lightboxNext]);

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
    }, 550);
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
    }, 550);
  }, [fading, idx, images.length]);

  const goTo = useCallback((i: any) => {
    if (fading || i === idx || images.length <= 1) return;
    setPaused(true);
    setPrevIdx(idx);
    setFading(true);
    setIdx(i);
    fadeTimerRef.current = setTimeout(() => {
      setFading(false);
      setPrevIdx(null);
    }, 550);
  }, [fading, idx, images.length]);

  // ── Handlers extraídos (P-1 A) ───────────────────────

  const handleMainImageClick = useCallback(() => {
    openLightbox(clamped);
  }, [openLightbox, clamped]);

  const handleThumbClick = useCallback((e: any) => {
    const idx = e.currentTarget?.dataset?.index;
    if (idx != null) goTo(parseInt(idx, 10));
  }, [goTo]);

  const handleThumbLoad = useCallback((e: any) => {
    const idx = e.currentTarget?.dataset?.index;
    if (idx != null) setThumbLoaded((p: any) => ({ ...p, [parseInt(idx, 10)]: true }));
  }, []);

  const handleContainerKeyDown = useCallback((e: any) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
  }, [prev, next]);

  const handleOuterKeyDown = useCallback((e: any) => {
    if (e.key === "ArrowLeft") prev();
    else if (e.key === "ArrowRight") next();
  }, [prev, next]);

  // ═══════════════════════════════════════════════════════
  // ESTADOS DE CARGA / VACÍO
  // ═══════════════════════════════════════════════════════

  if (loading) {
    return (
      <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
        <div className="story-card story-panel story-card--info w-full text-center" style={{ maxWidth: "min(100%, 56rem)" }} aria-live="polite" aria-busy="true">
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
        onFocus={pause}
        onBlur={resume}
        onKeyDown={handleOuterKeyDown}
        style={{ maxWidth: "min(100%, 56rem)", touchAction: "none" }}
      >
        <p className="story-eyebrow">{t("gallery.sectionLabel")}</p>
        <h2 className="story-title">{t("gallery.title")}</h2>

        {/* ── Contador de imagen ── */}
        {images.length > 1 && (
          <p className="gallery-counter">{clamped + 1} / {images.length}</p>
        )}

        {/* ── Imagen principal con contenedor de fade ── */}
        <div className="mt-3" style={{ position: "relative", userSelect: "none" }}>
          <div
            className="gallery-main-container"
            tabIndex={0}
            role="group"
            aria-label={t("gallery.carouselLabel")}
            onKeyDown={handleContainerKeyDown}
          >
            <div className="gallery-main-image-wrap">
              {fading && prevClamped !== null && (
                <img
                  src={images[prevClamped].url || images[prevClamped]}
                  alt=""
                  aria-hidden="true"
                  className="gallery-blur-out gallery-main-img"
                />
              )}

              {!mainLoaded[clamped] ? (
                <div className="page-loading" style={{ position: "absolute", inset: 0, zIndex: 1 }} />
              ) : null}
              <img
                src={currentImage?.url || currentImage}
                alt={currentImage?.description || t("gallery.imageAlt")}
                onLoad={() => setMainLoaded((p: any) => ({ ...p, [clamped]: true }))}
                onError={() => setMainLoaded((p: any) => ({ ...p, [clamped]: true }))}
                onClick={handleMainImageClick}
                className={`gallery-main-img${!mainLoaded[clamped] ? " gallery-main-img--loading" : ""}${fading ? " gallery-blur-in" : ""}`}
                style={{ cursor: "pointer" }}
              />
            </div>

            {/* ── Descripción de la imagen actual ── */}
            {currentImage?.description && (
              <div className="gallery-caption-wrap">
                <p className="gallery-caption">{currentImage.description}</p>
              </div>
            )}

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
        </div>

        {/* ── Miniaturas ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          {images.map((img, i) => {
            const src = img.url || img;
            return (
              <button
                key={img.id || i}
                type="button"
                onClick={handleThumbClick}
                data-index={i}
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
                  onLoad={handleThumbLoad}
                  onError={handleThumbLoad}
                  data-index={i}
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: thumbLoaded[i] ? 1 : 0 }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="gallery-lightbox"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={t("gallery.lightboxLabel")}
        >
          <button
            type="button"
            className="gallery-lightbox__close"
            onClick={closeLightbox}
            aria-label={t("common.close")}
          >×</button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="gallery-lightbox__nav gallery-lightbox__nav--prev"
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                aria-label={t("gallery.prev")}
              >‹</button>
              <button
                type="button"
                className="gallery-lightbox__nav gallery-lightbox__nav--next"
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                aria-label={t("gallery.next")}
              >›</button>
            </>
          )}

          <img
            className="gallery-lightbox__img"
            src={images[lightboxIndex].url || images[lightboxIndex]}
            alt={images[lightboxIndex].description || t("gallery.imageAlt")}
            loading="lazy"
            onClick={(e) => e.stopPropagation()}
          />

          {images[lightboxIndex].description && (
            <p className="gallery-lightbox__caption">{images[lightboxIndex].description}</p>
          )}
        </div>
      )}
    </section>
  );
});

export default GallerySection;
