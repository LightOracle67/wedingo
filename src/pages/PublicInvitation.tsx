/**
 * PublicInvitation.jsx
 * ─────────────────────────────────────────────────────────────
 * Página pública de la invitación de boda.
 *
 * Renderiza las secciones de la invitación (héroe, detalles,
 * historia, regalos, RSVP, etc.) con navegación por scroll,
 * teclado y touch. Gestiona:
 *
 * - Transiciones animadas entre secciones (scroll snap-like).
 * - Cuenta regresiva hasta la fecha de la boda.
 * - Mapa interactivo con Leaflet para la ubicación.
 * - Decoraciones laterales (eucalipto) con animación.
 * - Estados de carga, error, vacío y token inválido.
 *
 * @module PublicInvitation
 */

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { useApp } from "../contexts";
import { useStoryNavigation } from "../hooks/useStoryNavigation";
import { useReducedMotion } from "../hooks/useReducedMotion";

import { MONTH_VALUE_TO_NUMBER } from "../lib/constants";
import { parseSectionOrder, sectionHasContent } from "../lib/section-utils";
import { SITE_URL, applySocialMeta, clearSocialMeta } from "../lib/seo";

// ─── Assets ──────────────────────────────────────────────
import eucalyptusSrc from "../assets/eucalyptus.webp";

// ─── Componentes de sección (visibles al inicio, carga directa) ────
import HeroSection from "./sections/HeroSection";
import DetailsSection from "./sections/DetailsSection";

// ─── Componentes globales ─────────────────────────────────────────
import EnvelopeOverlay from "../components/EnvelopeOverlay";
import ErrorBoundary from "../components/ErrorBoundary";

// ─── Secciones secundarias (carga diferida) ────────────────────────
const TransportSection = lazy(() => import("./sections/TransportSection"));
const InfoSection = lazy(() => import("./sections/InfoSection"));
const StorySection = lazy(() => import("./sections/StorySection"));
const GiftsSection = lazy(() => import("./sections/GiftsSection"));
const AccommodationSection = lazy(() => import("./sections/AccommodationSection"));
const GallerySection = lazy(() => import("./sections/GallerySection"));
const RsvpSection = lazy(() => import("./sections/RsvpSection"));
import "../styles/decorations.css";
import "../styles/admin.css";
import "../styles/landing.css";

/**
 * Mapa de claves de sección a sus componentes React.
 * Permite renderizado dinámico según el orden configurado.
 */
const SECTION_COMPONENTS = {
  hero: HeroSection,
  details: DetailsSection,
  transport: TransportSection,
  info: InfoSection,
  story: StorySection,
  gifts: GiftsSection,
  accommodation: AccommodationSection,
  gallery: GallerySection,
  rsvp: RsvpSection,
};

/**
 * Página principal de la invitación pública.
 * Muestra las secciones configuradas con navegación animada.
 *
 * @returns {JSX.Element} Página de invitación.
 */
export default function PublicInvitation() {

  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { inviteToken } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const isInviteMode = searchParams.has("invitar");
  const reducedMotion = useReducedMotion();

  // ─── Estado global del contexto ────────────────────────
  const {
    config, isConfigLoading, configLoadError, formattedDate, formattedTime, calendarLink,
    rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted, alreadySubmittedEntry,

    handleRsvpSubmit, updateRsvpField, handleDeleteRsvp,
    isAdminTokenLoggedIn,
    DIETARY_OPTIONS, computeAge,
  } = useApp();

  // ─── Secciones ocultas derivadas de la configuración ───
  const hiddenSet = useMemo(() => {
    const raw = config.hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [config.hiddenSections]);

  // ─── Orden de secciones visible ────────────────────────
  /**
   * Calcula el orden de secciones a mostrar.
   * Si el usuario es admin o está en modo invitar, incluye siempre RSVP.
   */
  const sectionOrder = useMemo(() => {
    const parsed = parseSectionOrder(config.sectionOrder);
    if (isAdminTokenLoggedIn || isInviteMode) {
      return parsed.includes("rsvp") ? parsed : [...parsed, "rsvp"];
    }
    return parsed;
  }, [config.sectionOrder, isAdminTokenLoggedIn, isInviteMode]);

  /** Indica si se debe mostrar la sección RSVP. */
  const showRsvp = !!(config.firstName || config.secondName);

  /**
   * Orden final de secciones visibles, excluyendo las ocultas
   * (excepto en modo invitar, donde se muestran todas).
   */
  const visibleOrder = useMemo(
    () => {
      let filtered = showRsvp ? sectionOrder : sectionOrder.filter((s: string) => s !== "rsvp");
      if (!isInviteMode) {
        filtered = filtered.filter((s: string) => !hiddenSet.has(s));
      }
      // Oculta las secciones sin contenido configurado (aunque estén en el
      // orden) para no mostrar secciones vacías al invitado.
      filtered = filtered.filter((s: string) => sectionHasContent(s, config));
      return filtered;
    },
    [sectionOrder, showRsvp, hiddenSet, isInviteMode, config],
  );

  // ─── Navegación entre secciones (hook extraído) ─────────
  /**
   * Hook que gestiona la navegación por scroll, teclado y touch
   * entre las secciones de la invitación. Controla el estado activo,
   * las transiciones animadas y los estilos CSS dinámicos.
   *
   * Se usan alias para mantener compatibilidad con el resto del componente.
   */
  const {
    activeSection: _activeStorySection,
    isTransitioning: isStoryTransitioning,
    getSectionStyle: getStorySectionStyle,
    getSectionClassName: getStorySectionClassName,
  } = useStoryNavigation(visibleOrder);

  // ─── Cuenta regresiva ──────────────────────────────────
  const [countdown, setCountdown] = useState<{ years?: number; months?: number; days: number; expired: boolean } | null>(null);

  /**
   * Construye el objeto Date de la boda a partir de los campos de configuración.
   * Retorna null si algún campo no es válido.
   */
  const weddingDate = useMemo(() => {
    const day = Number.parseInt(config.weddingDay, 10);
    const month = MONTH_VALUE_TO_NUMBER[config.weddingMonth as keyof typeof MONTH_VALUE_TO_NUMBER];
    const year = Number.parseInt(config.weddingYear, 10);
    const hour = Number.parseInt(config.weddingHour, 10);
    const minute = Number.parseInt(config.weddingMinute, 10);
    if (!day || !month || !year || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return new Date(year, month - 1, day, hour, minute);
  }, [config]);

  /**
   * Actualiza la cuenta regresiva cada segundo, descomponiendo la diferencia
   * de forma calendárica. Se pausa al ocultar la pestaña, se detiene al
   * expirar y no itera si el usuario prefiere menos movimiento.
   */
  useEffect(() => {
    if (!weddingDate) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      const now = new Date();
      if (weddingDate.getTime() <= now.getTime()) {
        setCountdown({ days: 0, expired: true });
        if (id) clearInterval(id);
        return;
      }
      let years = weddingDate.getFullYear() - now.getFullYear();
      let months = weddingDate.getMonth() - now.getMonth();
      let days = weddingDate.getDate() - now.getDate();
      if (days < 0) {
        months -= 1;
        days += new Date(weddingDate.getFullYear(), weddingDate.getMonth(), 0).getDate();
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }
      setCountdown({ years, months, days, expired: false });
    };
    tick();
    if (reducedMotion) return;
    id = setInterval(tick, 1000);
    const onVisibility = () => {
      if (document.hidden && id) { clearInterval(id); id = null; }
      else if (!document.hidden && !id) { tick(); id = setInterval(tick, 1000); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [weddingDate, reducedMotion]);

  // ─── Schema.org JSON-LD ─────────────────────────────
  useEffect(() => {
    if (!config.firstName || !config.weddingYear) return;
    const coupleName = `${config.firstName} & ${config.secondName || ""}`.trim();
    const schema = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": coupleName,
      "description": config.inviteMessage || coupleName,
      "startDate": `${config.weddingYear}-${config.weddingMonth}-${config.weddingDay}T${config.weddingHour}:${config.weddingMinute}:00`,
      "location": {
        "@type": "Place",
        "name": config.weddingPlace || undefined,
      },
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [config.firstName, config.secondName, config.inviteMessage, config.weddingYear, config.weddingMonth, config.weddingDay, config.weddingHour, config.weddingMinute, config.weddingPlace]);

  // ─── Metadatos sociales Open Graph / Twitter (SEO) ─────
  useEffect(() => {
    if (!config.firstName) return;
    const coupleName = `${config.firstName} ${config.secondName || ""}`.trim();
    applySocialMeta({
      title: `${coupleName} — Wedingo`,
      description: config.inviteMessage || `${config.firstName} & ${config.secondName || ""} te invitan a su boda.`.trim(),
      url: `${SITE_URL}/${inviteToken}`,
      image: config.couplePhoto,
      locale: i18n?.language,
    });
    return () => clearSocialMeta();
  }, [config.firstName, config.secondName, config.inviteMessage, config.couplePhoto, inviteToken, i18n]);

  // ─── Datos de ubicación derivados ──────────────────────
  const hasLocationData = Boolean(config.weddingPlace || config.weddingSiteURL);
  const locationDescription = config.weddingPlace || "";

  // ═══════════════════════════════════════════════════════
  // PROPS PARA CADA SECCIÓN (MEMOIZADOS)
  // ═══════════════════════════════════════════════════════

  /**
   * Props derivadas SOLO de la configuración. Se memoizan de forma que no
   * cambien con cada tick del countdown ni con cada tecla del formulario RSVP.
   */
  const configSectionProps = useMemo(() => ({
    hero: {
      firstName: config.firstName,
      secondName: config.secondName,
      inviteMessage: config.inviteMessage,
      couplePhoto: config.couplePhoto,
      godparent1: config.godparent1,
      godparent2: config.godparent2,
      cornerDecoration: config.cornerDecoration,
    },
    details: {
      formattedDate,
      formattedTime,
      hasLocationData,
      locationDescription,
      calendarLink,
      weddingSiteURL: config.weddingSiteURL,
      mapView: config.weddingMapView,
      staticMap: config.weddingMapStatic === "true",
      detailsMapMode: config.detailsMapMode,
      cornerDecoration: config.cornerDecoration,
    },
    transport: {
      transportEnabled: config.transportEnabled,
      transportDepartures: config.transportDepartures,
      mapView: config.weddingMapView,
      staticMap: config.weddingMapStatic === "true",
      transportMapMode: config.transportMapMode,
      cornerDecoration: config.cornerDecoration,
    },
    info: {
      weddingScheduleEvents: config.weddingScheduleEvents,
      weddingDressCode: config.weddingDressCode,
      weddingDressCodeCustom: config.weddingDressCodeCustom,
      kidsPolicy: config.kidsPolicy,
      cornerDecoration: config.cornerDecoration,
    },
    story: {
      storyText: config.storyText,
      cornerDecoration: config.cornerDecoration,
    },
    gifts: {
      giftsInfo: config.giftsInfo,
      bankInfo: config.bankInfo,
      cornerDecoration: config.cornerDecoration,
    },
    accommodation: {
      accommodationURL: config.accommodationURL,
      mapView: config.weddingMapView,
      staticMap: config.weddingMapStatic === "true",
      accommodationMapMode: config.accommodationMapMode,
      cornerDecoration: config.cornerDecoration,
    },
    gallery: {
      inviteToken,
      cornerDecoration: config.cornerDecoration,
    },
    rsvp: {
      menuEnabled: config.menuEnabled === "true",
      menuCarneDishes: config.menuCarneDishes,
      menuPescadoDishes: config.menuPescadoDishes,
      menuVeganoDishes: config.menuVeganoDishes,
      menuTextoDishes: config.menuTextoDishes,
      transportEnabled: config.transportEnabled,
      transportDepartures: config.transportDepartures,
      cornerDecoration: config.cornerDecoration,
    },
  }), [
    config.firstName, config.secondName, config.inviteMessage,
    config.weddingScheduleEvents, config.weddingDressCode, config.weddingDressCodeCustom,
    config.kidsPolicy, config.storyText, config.giftsInfo, config.accommodationURL,
    config.godparent1, config.godparent2, inviteToken,
    config.couplePhoto, config.bankInfo, config.menuEnabled,
    config.menuCarneDishes, config.menuPescadoDishes, config.menuVeganoDishes, config.menuTextoDishes,
    config.cornerDecoration,
    formattedDate, formattedTime,
    hasLocationData, locationDescription, calendarLink, config.weddingSiteURL,
    config.weddingMapView, config.weddingMapStatic,
    config.detailsMapMode, config.transportMapMode, config.accommodationMapMode,
    config.transportEnabled, config.transportDepartures,
  ]);

  /**
   * Props del countdown: solo afectan a HeroSection (cambian cada segundo).
   */
  const heroProps = useMemo(() => ({ countdown }), [countdown]);

  /**
   * Props del estado RSVP: solo afectan a RsvpSection. Cambian al editar el
   * formulario RSVP, sin re-renderizar el resto de secciones.
   */
  const rsvpSectionProps = useMemo(() => ({
    rsvpForm,
    rsvpEntries,
    rsvpMessage,
    isRsvpSubmitting,
    hasSubmitted,
    alreadySubmittedEntry,
    updateRsvpField,
    handleRsvpSubmit,
    handleDeleteRsvp,
    DIETARY_OPTIONS,
    computeAge,
  }), [
    rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted, alreadySubmittedEntry,
    updateRsvpField, handleRsvpSubmit, handleDeleteRsvp, DIETARY_OPTIONS, computeAge,
  ]);

  // ─── Estados de UI condicionales ───────────────────────
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const isEmpty = !config.firstName && !config.secondName && !isInviteMode;
  const hasHash = location.hash.length > 1;

  // ═══════════════════════════════════════════════════════
  // RENDERIZADO CONDICIONAL
  // ═══════════════════════════════════════════════════════

   // ── Estado de carga ──
  if (isConfigLoading) {
    return (
      <div className="app-scene">
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="polite" aria-busy="true">
            <p className="font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/60 leading-relaxed">
              {t("public.loadingInvitation")}
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ── Error de carga ──
  if (configLoadError) {
    return (
      <div className="app-scene">
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="assertive">
            <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
              {t("public.emptyTitle")}
            </h1>
            <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
              {t("setup.errorTitle")}
            </p>
            <div className="my-6 story-divider" />
            <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">
              {configLoadError}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <button className="text-sm setup-button" type="button" onClick={() => window.location.reload()}>
                {t("common.retry")}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /** ¿Mostrar pantalla de token no encontrado o invitación vacía? */
  const showMissingToken = isEmpty && !hasHash && (Boolean(inviteToken) || isInviteMode);

  // ═══════════════════════════════════════════════════════
  // RENDERIZADO PRINCIPAL
  // ═══════════════════════════════════════════════════════
  const showEnvelope = !isAdminTokenLoggedIn && !isConfigLoading && !configLoadError && !isEmpty && !showMissingToken && !envelopeOpen;

  return (
    <div className={`app-scene ${isStoryTransitioning ? "app-scene--transitioning" : ""}`}
      style={{ "--story-card-user-bg": config.backgroundImage ? `url(${config.backgroundImage})` : undefined } as React.CSSProperties}>
      {showEnvelope ? <EnvelopeOverlay onOpen={() => { ; setEnvelopeOpen(true); }} firstName={config.firstName} secondName={config.secondName} customSeal={config.customSeal} /> : null}

      {/* Mientras el sobre está cerrado, el contenido trasero queda inerte e
          invisible para lectores de pantalla (WCAG 1.3.2 / 2.4.3). display:
          contents no altera el layout. */}
      <div style={{ display: "contents" }} aria-hidden={showEnvelope || undefined} inert={showEnvelope || undefined}>
      {/* ── Decoraciones laterales (eucalipto) ── */}
      <div className="fixed top-0 pointer-events-none left-2 wedding-decoration--left wedding-decoration" style={{ zIndex: 0 }}>
        <img src={eucalyptusSrc} alt="" aria-hidden="true" loading="lazy" className="wedding-decoration__image" />
      </div>
      <div className="fixed pointer-events-none right-2 bottom-2 wedding-decoration--right wedding-decoration" style={{ zIndex: 0 }}>
        <img src={eucalyptusSrc} alt="" aria-hidden="true" loading="lazy" className="wedding-decoration__image" />
      </div>

      {/* ── Token no encontrado (invitación no configurada) ── */}
      {showMissingToken ? (
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="assertive">
            <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
              {t("public.emptyTitle")}
            </h1>
            <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
              {t("public.notFoundTitle")}
            </p>
            <div className="my-6 story-divider" />
            <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">
              {t("public.notFoundText")}
            </p>
          </div>
        </section>
      ) : isEmpty ? (
        /* ── Invitación vacía (sin configurar) ── */
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="assertive">
            <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
              {t("public.emptyTitle")}
            </h1>
            <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
              {t("public.emptyText")}
            </p>
            <div className="my-6 story-divider" />
            <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">
              {t("public.emptyDescription")}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <a href="/setup" className="text-sm setup-button">
                {t("public.createLink")}
              </a>
            </div>
          </div>
        </section>
      ) : (
        /* ── Invitación completa: renderiza cada sección en orden ── */
        <Suspense fallback={null}>
          
          {visibleOrder.map((sectionKey: string) => {
            const Component = (SECTION_COMPONENTS as unknown as Record<string, React.ComponentType<Record<string, unknown>>>)[sectionKey];
            if (!Component) { ; return null; }
            const baseProps = (configSectionProps as Record<string, Record<string, unknown>>)[sectionKey] || {};
            const extraProps = sectionKey === "hero" ? heroProps : sectionKey === "rsvp" ? rsvpSectionProps : {};
            return (
              <ErrorBoundary key={sectionKey}>
                <Component
                  style={getStorySectionStyle(sectionKey)}
                  className={getStorySectionClassName(sectionKey)}
                  {...baseProps}
                  {...extraProps}
                />
              </ErrorBoundary>
            );
          })}
        </Suspense>
      )}
      </div>
    </div>
  );
}
