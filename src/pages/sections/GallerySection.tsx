import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import "../../styles/gallery.css";
import LoadingOverlay from "../../components/LoadingOverlay";
import CornerDecorations from "../../components/CornerDecorations";
import type { GalleryImage } from "../../types";
import type { GalleryMeta } from "../../lib/image-store";
import { getGalleryImageUrl } from "../../lib/image-store";

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
const TRANSPARENT_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const GallerySection = memo(function GallerySection({ style, className, inviteToken, cornerDecoration }: GallerySectionProps) {
  const { t } = useTranslation();

  const reducedMotion = useReducedMotion();

  /** Metadatos de la galería (sin descifrar): carga instantánea. */
  const [metas, setMetas] = useState<GalleryMeta[]>([]);
  /** URLs descifradas por id (descifrado bajo demanda). */
  const [urls, setUrls] = useState<Record<string, string>>({});
  /** Indica si la galería está cargando (solo espera los METADATOS). */
  const [loading, setLoading] = useState(true);
  /** Ids ya solicitados (evita re-descifrar por re-render). */
  const requestedRef = useRef<Set<string>>(new Set());
  /** Índice de la imagen abierta en lightbox, o null si cerrado. */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // La lista derivada mantiene SIEMPRE la longitud de metas: el fallo de
  // descifrado no borra fotos ni desplaza los índices del carrusel.
  const images = useMemo<GalleryImage[]>(() =>
    metas.map((m) => ({
      id: m.id,
      url: urls[m.id] || "",
      description: m.description,
      ...(m.position !== undefined ? { position: m.position } : {}),
      ...(m.originalName !== undefined ? { originalName: m.originalName } : {}),
      ...(m.originalSize !== undefined ? { originalSize: m.originalSize } : {}),
    })),
  [metas, urls]);

  /** Pide el descifrado de una imagen (deduplicado por id). */
  const requestDecrypt = useCallback((meta: GalleryMeta) => {
    if (!inviteToken || requestedRef.current.has(meta.id)) return;
    requestedRef.current.add(meta.id);
    void getGalleryImageUrl(inviteToken, meta).then((url) => {
      setUrls((p) => (url ? { ...p, [meta.id]: url } : p));
    });
  }, [inviteToken]);

  // ── Carga de metadatos desde Firestore (sin descifrar nada) ──

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      const { loadGalleryMeta } = await import("../../lib/image-store");
      const result = await loadGalleryMeta(inviteToken);
      if (!cancelled) { setMetas(result); setLoading(false); }
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
  /** Referencia al <section> de la galería (para pausar el auto-avance fuera de pantalla). */
  const sectionRef = useRef<HTMLElement | null>(null);
  /** Timer del auto-avance (setInterval, pausado en pestaña oculta). */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Índice actual limitado al rango válido. */
  const clamped = Math.max(0, Math.min(idx, images.length - 1));
  /** Índice anterior limitado. */
  const prevClamped = prevIdx !== null ? Math.max(0, Math.min(prevIdx, images.length - 1)) : null;
  /** Imagen activa actual con metadatos. */
  const currentImage = images[clamped] || null;

  // ── Descifrado bajo demanda: activa + vecinas + lightbox ──

  useEffect(() => {
    if (!metas.length) return;
    const wanted = new Set<number>([
      clamped,
      (clamped - 1 + metas.length) % metas.length,
      (clamped + 1) % metas.length,
    ]);
    if (lightboxIndex !== null) {
      wanted.add(lightboxIndex);
      wanted.add((lightboxIndex - 1 + metas.length) % metas.length);
      wanted.add((lightboxIndex + 1) % metas.length);
    }
    for (const i of wanted) {
      const m = metas[i];
      if (m) requestDecrypt(m);
    }
  }, [clamped, lightboxIndex, metas, requestDecrypt]);

  // ── Miniaturas: descifrado perezoso según visibilidad ──

  useEffect(() => {
    if (!metas.length) return;
    if (typeof IntersectionObserver === "undefined") {
      // Sin IO: se descifran las primeras 4 y el resto en idle.
      for (let i = 0; i < Math.min(4, metas.length); i++) requestDecrypt(metas[i]!);
      const idle = window.requestIdleCallback?.((deadline) => {
        let n = 4;
        while (n < metas.length && deadline.timeRemaining() > 8) { requestDecrypt(metas[n]!); n++; }
      });
      if (idle !== undefined) return;
      for (let i = 4; i < metas.length; i++) requestDecrypt(metas[i]!);
      return;
    }
    const els = Array.from(sectionRef.current?.querySelectorAll<HTMLElement>(".gallery-thumb") ?? []);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const i = Number((e.target as HTMLElement).dataset.index);
          const m = metas[i];
          if (m) requestDecrypt(m);
        }
      }
    }, { rootMargin: "120px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [metas, requestDecrypt]);

  // ── Limpieza de timers al desmontar ───────────────────

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  // ── Auto-avance del carrusel con setInterval (ahorra CPU vs rAF) ──

  const handleNextImage = useCallback(() => {
    if (images.length <= 1 || fading) return;
    // Los updaters de estado deben ser puros (React 19 los invoca 2× en
    // StrictMode): el índice anterior se toma del estado (idx) y el timer se
    // limpia antes de crear uno nuevo.
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setPrevIdx(idx);
    setFading(true);
    setIdx((i: number) => (i + 1) % images.length);
    fadeTimerRef.current = setTimeout(() => {
      setFading(false);
      setPrevIdx(null);
    }, 550);
  }, [images.length, idx, fading]);

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
    // Pausa el auto-avance cuando la galería no está en pantalla (la sección
    // puede estar 3 pantallas más abajo y no debe consumir CPU ni avanzar
    // sin que el invitado lo vea).
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) start();
        else if (intervalRef.current) clearInterval(intervalRef.current);
      }, { threshold: 0.2 });
      if (sectionRef.current) io.observe(sectionRef.current);
    } else {
      start();
    }
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
      io?.disconnect();
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
    // Bloquea el scroll de fondo mientras el lightbox está abierto.
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); lightboxPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); lightboxNext(); }
      else if (e.key === "Home") { e.preventDefault(); setLightboxIndex(0); }
      else if (e.key === "End") { e.preventDefault(); setLightboxIndex(images.length - 1); }
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
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
    <section ref={sectionRef} data-story-section="gallery" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style} role="region" aria-label={t("gallery.title")}>
      <div className="story-card-wrap" style={{ width: "min(90%, 56rem)" }}>
        <CornerDecorations src={cornerDecoration} />
        <div
          className="story-card story-panel story-card--info w-full text-center"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
          onKeyDown={handleOuterKeyDown}
          style={{ maxWidth: "min(100%, 56rem)" }}
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
                  src={images[prevClamped]?.url || TRANSPARENT_GIF}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="gallery-blur-out gallery-main-img"
                />
              )}

              <LoadingOverlay visible={!mainLoaded[clamped] || !currentImage?.url} zIndex={1} />
              <img
                src={currentImage?.url || TRANSPARENT_GIF}
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
            const src = img.url || TRANSPARENT_GIF;
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
                {(!thumbLoaded[i] || !img.url) ? <div className="page-loading" style={{ width: "100%", height: "100%", minHeight: 0 }} /> : null}
                <img
                  src={src}
                  alt={img.description || t("gallery.thumbnailAlt")}
                  onLoad={handleThumbLoad}
                  onError={handleThumbLoad}
                  data-index={i}
                  loading="lazy"
                  className="gallery-thumb__img"
                  style={{ opacity: (thumbLoaded[i] && img.url) ? 1 : 0, transition: "opacity 0.3s ease" }}
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
            src={images[lightboxIndex].url || TRANSPARENT_GIF}
            alt={images[lightboxIndex].description || t("gallery.imageAlt")}
            loading="lazy"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            className="gallery-lightbox__download"
            onClick={(e) => {
              e.stopPropagation();
              const current = images[lightboxIndex];
              const url = current?.url;
              if (!url) return;
              // Extensión según el MIME del data URL (PNG/WebP/JPEG).
              const mimeMatch = url.match(/^data:image\/(\w+)/);
              const ext = mimeMatch?.[1] && mimeMatch[1] !== "jpeg" ? mimeMatch[1] : "jpg";
              const a = document.createElement("a");
              a.href = url;
              a.download = `wedingo-foto-${lightboxIndex + 1}.${ext}`;
              document.body.appendChild(a);
              a.click();
              a.remove();
            }}
            aria-label={t("gallery.download")}
            title={t("gallery.download")}
          >⤓</button>

          <p className="gallery-lightbox__counter" aria-live="polite">{lightboxIndex + 1} / {images.length}</p>

          {images[lightboxIndex].description && (
            <p className="gallery-lightbox__caption">{images[lightboxIndex].description}</p>
          )}
        </div>
      )}
    </section>
  );
});

export default GallerySection;
