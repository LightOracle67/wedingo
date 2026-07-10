import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Galería de imágenes de la invitación con navegación y efecto fade.
 * Carga las imágenes descifradas desde Firestore, muestra una imagen
 * principal con controles de navegación y miniaturas inferiores.
 *
 * @param {{ style: object, className: string, inviteToken: string }} props
 * @returns {JSX.Element} Sección de galería.
 */
const GallerySection = memo(function GallerySection({ style, className, inviteToken }) {
  const { t } = useTranslation();

  /** Lista de imágenes (data URLs descifradas). */
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

  /** Índice de la imagen activa en el array de imágenes. */
  const [idx, setIdx] = useState(0);
  /** Índice de la imagen anterior (para animación de salida). */
  const [prevIdx, setPrevIdx] = useState(null);
  /** ¿Está en curso una animación de fade? */
  const [fading, setFading] = useState(false);
  /** Controla qué imágenes han terminado de cargar (principal). */
  const [mainLoaded, setMainLoaded] = useState({});
  /** Controla qué miniaturas han terminado de cargar. */
  const [thumbLoaded, setThumbLoaded] = useState({});

  /** Referencia al timer de la animación para limpiarlo al desmontar. */
  const fadeTimerRef = useRef(null);

  /** Índice actual limitado al rango válido. */
  const clamped = Math.max(0, Math.min(idx, images.length - 1));
  /** Índice anterior limitado (null si no hay transición). */
  const prevClamped = prevIdx !== null ? Math.max(0, Math.min(prevIdx, images.length - 1)) : null;

  // ── Limpieza del timer al desmontar ───────────────────

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  // ── Navegación con fade ───────────────────────────────

  /**
   * Cambia a la imagen anterior con animación de fade.
   * Guarda el índice actual como previo, activa la transición,
   * cambia al nuevo índice y tras 350ms limpia el estado de fade.
   */
  const prev = useCallback(() => {
    if (fading || images.length <= 1) return;
    setPrevIdx(idx);
    setFading(true);
    setIdx((i) => (i - 1 + images.length) % images.length);
    fadeTimerRef.current = setTimeout(() => {
      setFading(false);
      setPrevIdx(null);
    }, 350);
  }, [fading, idx, images.length]);

  /**
   * Cambia a la imagen siguiente con animación de fade.
   * Misma lógica que prev pero en dirección opuesta.
   */
  const next = useCallback(() => {
    if (fading || images.length <= 1) return;
    setPrevIdx(idx);
    setFading(true);
    setIdx((i) => (i + 1) % images.length);
    fadeTimerRef.current = setTimeout(() => {
      setFading(false);
      setPrevIdx(null);
    }, 350);
  }, [fading, idx, images.length]);

  /**
   * Salta directamente a una miniatura con fade.
   *
   * @param {number} i - Índice de la imagen a mostrar.
   */
  const goTo = useCallback((i) => {
    if (fading || i === idx || images.length <= 1) return;
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
        <div className="story-card story-panel story-card--info w-full text-center">
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
        <div className="story-card story-panel story-card--info w-full text-center">
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
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">{t("gallery.sectionLabel")}</p>
        <h2 className="story-title">{t("gallery.title")}</h2>

        {/* ── Imagen principal con contenedor de fade ── */}
        <div className="mt-4" style={{ position: "relative", userSelect: "none" }}>
          {/* Skeleton de carga mientras la imagen no está lista. */}
          {!mainLoaded[clamped] ? (
            <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: "0.9rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)", display: "grid", placeItems: "center" }}>
              <div className="page-loading" />
            </div>
          ) : null}

          {/* Capa de fondo (siempre presente para evitar parpadeo). */}
          <div style={{
            width: "100%", aspectRatio: "16/10", borderRadius: "0.9rem", overflow: "hidden",
            position: "relative", display: mainLoaded[clamped] ? "block" : "none",
          }}>
            {/* Imagen saliente (fade out). */}
            {fading && prevClamped !== null && mainLoaded[prevClamped] && (
              <img
                src={images[prevClamped]}
                alt=""
                aria-hidden="true"
                className="gallery-fade gallery-fade--out"
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  position: "absolute", inset: 0,
                }}
              />
            )}

            {/* Imagen entrante (fade in). */}
            <img
              src={images[clamped]}
              alt={t("gallery.imageAlt")}
              onLoad={() => setMainLoaded((p) => ({ ...p, [clamped]: true }))}
              className={fading ? "gallery-fade gallery-fade--in" : ""}
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                display: "block",
                border: "1px solid color-mix(in srgb, var(--invite-shell-border) 70%, transparent)",
              }}
            />
          </div>

          {/* ── Controles de navegación (solo si hay más de una imagen) ── */}
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

        {/* ── Miniaturas ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          {images.map((src, i) => (
            <button
              key={i}
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
              <img src={src} alt={t("gallery.thumbnailAlt")} onLoad={() => setThumbLoaded((p) => ({ ...p, [i]: true }))} style={{ width: "100%", height: "100%", objectFit: "cover", display: thumbLoaded[i] ? "block" : "none" }} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
});

export default GallerySection;
