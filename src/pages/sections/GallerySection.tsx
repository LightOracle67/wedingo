import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import "../../styles/gallery.css";
import LoadingOverlay from "../../components/LoadingOverlay";
import CornerDecorations from "../../components/CornerDecorations";
import type { GalleryImage } from "../../types";

interface GallerySectionProps {
  style?: React.CSSProperties;
  className?: string;
  inviteToken?: string;
  cornerDecoration?: string;
  [key: string]: unknown;
}

/**
 * GallerySection — Sección de galería de imágenes en la invitación.
 * 
 * Muestra un carrusel de imágenes con navegación, miniaturas, lightbox
 * y descripciones. Soporta auto-avance, transiciones con blur y
 * precarga con spinner.
 */
const GallerySection = memo(function GallerySection({ style, className, inviteToken, cornerDecoration }: GallerySectionProps) {
  const { t } = useTranslation();

  const reducedMotion = useReducedMotion();

  /** Lista de imágenes con metadatos: { id, url, description }. */
  const [images, setImages] = useState<GalleryImage[]>([]);
  /** Indica si la galería está cargando. */
  const [loading, setLoading] = useState(true);

  /** Índice de la imagen abierta en lightbox, o null si cerrado. */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  /** ¿Está en curso una animación de fade? */
  const [fading, setFading] = useState(false);
  /** ¿Está pausado el carrusel automático? */
  const [paused, setPaused] = useState(false);
  /** Controla qué imágenes han terminado de cargar (principal). */
  const [mainLoaded, setMainLoaded] = useState<Record<number, boolean>>({});
  /** Controla qué miniaturas han terminado de cargar. */
  const [thumbLoaded, setThumbLoaded] = useState<Record<number, boolean>>({});

  /** Timer del fade. */
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAdvanceRef = useRef(Date.now());
  /** Timer del auto-avance (setInterval, pausado en pestaña oculta). */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── Auto-avance del carrusel con setInterval (ahorra CPU vs rAF) ──

  const handleNextImage = useCallback(() => {
    if (images.length <= 1) return;
    setPrevIdx((prev: number | null) => {
      setFading(true);
      setIdx((i: number) => {
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

  useEffect(() => {
    if (reducedMotion) return;
    const start = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Avanza cada 5s solo si no está en pausa ni hay una sola imagen.
      intervalRef.current = setInterval(() => {
        if (!paused && images.length > 1) {
          lastAdvanceRef.current = Date.now();
          handleNextImage();
        }
      }, 5000);
    };
    start();
    // Pausa el auto-avance cuando la pestaña está oculta (ahorra batería).
    const onVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [paused, reducedMotion, images.length, handleNextImage]);

  // Pausa el carrusel al hacer hover sobre la galería
  const pause = useCallback(() => { if (!reducedMotion) setPaused(true); }, [reducedMotion]);
  const resume = useCallback(() => { if (!reducedMotion) { setPaused(false); lastAdvanceRef.current = Date.now(); } }, [reducedMotion]);

  // ── Lightbox ───────────────────────────────────────

  const openLightbox = useCallback((i: number) => {
    setPaused(true);
    setLightboxIndex(i);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((i: number | null) => (i !== null ? (i - 1 + images.length) % images.length : images.length - 1));
  }, [images.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((i: number | null) => (i !== null ? (i + 1) % images.length : 0));
  }, [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
      if (e.key === "Home") setLightboxIndex(0);
      if (e.key === "End") setLightboxIndex(images.length - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, closeLightbox, lightboxPrev, lightboxNext, images.length]);

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

  const goTo = useCallback((i: number) => {
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

  /** Apertura del lightbox con teclado (Enter/Espacio) para WCAG 2.1.1. */
  const handleMainImageKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLightbox(clamped);
    }
  }, [openLightbox, clamped]);

  // Focus trap del lightbox: mantiene el foco dentro y lo restaura al cerrar.
  const lightboxRef = useFocusTrap<HTMLDivElement>(lightboxIndex !== null);

  const handleThumbClick = useCallback((e: React.MouseEvent) => {
    const idx = (e.currentTarget as HTMLElement)?.dataset?.index;
    if (idx != null) goTo(parseInt(idx, 10));
  }, [goTo]);

  const handleThumbLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const idx = e.currentTarget?.dataset?.index;
    if (idx != null) setThumbLoaded((p: Record<number, boolean>) => ({ ...p, [parseInt(idx, 10)]: true }));
  }, []);

  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
  }, [prev, next]);

  const handleOuterKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    else if (e.key === "ArrowRight") next();
  }, [prev, next]);

  // ═══════════════════════════════════════════════════════
  // ESTADOS DE CARGA / VACÍO
  // ═══════════════════════════════════════════════════════

  if (loading) {
    return (
      <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style} role="region" aria-label={t("gallery.title")}>
        <div className="story-card-wrap" style={{ width: "min(90%, 56rem)" }}>
          <CornerDecorations src={cornerDecoration} />
          <div className="story-card story-panel story-card--info w-full text-center" style={{ maxWidth: "min(100%, 56rem)" }} aria-live="polite" aria-busy="true">
            <p className="story-eyebrow">{t("gallery.sectionLabel")}</p>
            <h2 className="story-title">{t("gallery.title")}</h2>
            <div className="gallery-main-container" style={{ minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--invite-shell-bg, rgba(255,255,255,0.45)) 90%, transparent)" }}>
              <div className="page-loading" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!images.length) {
    // Sin imágenes: se oculta la sección completa en la invitación.
    return null;
  }

  // ═══════════════════════════════════════════════════════
  // RENDERIZADO PRINCIPAL
  // ═══════════════════════════════════════════════════════

  return (
    <section data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style} role="region" aria-label={t("gallery.title")}>
      <div className="story-card-wrap" style={{ width: "min(90%, 56rem)" }}>
        <CornerDecorations src={cornerDecoration} />
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

        {/* ── Contador de imagen (anunciado a lectores de pantalla) ── */}
        {images.length > 1 && (
          <p className="gallery-counter" aria-live="polite" aria-atomic="true">{clamped + 1} / {images.length}</p>
        )}

        {/* ── Imagen principal con contenedor de fade ── */}
        <div className="mt-3" style={{ position: "relative", userSelect: "none" }}>
          <div
            className="gallery-main-container"
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            aria-label={t("gallery.carouselLabel")}
            onKeyDown={handleContainerKeyDown}
          >
            <div className="gallery-main-image-wrap">
              {fading && prevClamped !== null && (
                <img
                  src={images[prevClamped]?.url || ""}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="gallery-blur-out gallery-main-img"
                />
              )}

              <LoadingOverlay visible={!mainLoaded[clamped]} zIndex={1} />
              <img
                src={currentImage?.url}
                alt={currentImage?.description || t("gallery.imageAlt")}
                loading="lazy"
                decoding="async"
                onLoad={() => setMainLoaded((p: Record<number, boolean>) => ({ ...p, [clamped]: true }))}
                onError={() => setMainLoaded((p: Record<number, boolean>) => ({ ...p, [clamped]: true }))}
                onClick={handleMainImageClick}
                onKeyDown={handleMainImageKeyDown}
                role="button"
                tabIndex={0}
                aria-label={t("gallery.openLightbox")}
                className={`gallery-main-img${!mainLoaded[clamped] ? " gallery-main-img--loading" : ""}${fading ? " gallery-blur-in" : ""}`}
                style={{ cursor: "pointer" }}
              />
            </div>

            {/* ── Descripción de la imagen actual ── */}
            {currentImage?.description && (
              <div className="gallery-caption-wrap" aria-live="polite">
                <p className="gallery-caption">{currentImage.description}</p>
              </div>
            )}

            {/* ── Controles de navegación ── */}
            {images.length > 1 && (
              <>
                <button type="button" onClick={prev} aria-label={t("gallery.prev")} title={t("gallery.prev")} className="gallery-nav gallery-nav--prev" disabled={fading}>
                  ‹
                </button>
                <button type="button" onClick={next} aria-label={t("gallery.next")} title={t("gallery.next")} className="gallery-nav gallery-nav--next" disabled={fading}>
                  ›
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Miniaturas ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          {images.map((img, i) => {
            const src = img.url || "";
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
                  loading="lazy"
                  className="gallery-thumb__img"
                  style={{ opacity: thumbLoaded[i] ? 1 : 0, transition: "opacity 0.3s ease" }}
                />
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="gallery-lightbox"
          ref={lightboxRef}
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
            src={images[lightboxIndex].url}
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
