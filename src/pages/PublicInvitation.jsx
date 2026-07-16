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
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useApp } from "../contexts/AppContext";
import { useStoryNavigation } from "../hooks/useStoryNavigation";
import {
  getValidCoordinates,
  resolveLocationTarget,
} from "../lib/utils";
import { MONTH_VALUE_TO_NUMBER } from "../lib/constants";
import { parseSectionOrder } from "../lib/section-utils";

// ─── Assets ──────────────────────────────────────────────
import eucalyptusSrc from "../assets/eucalyptus.webp";

// ─── Componentes de sección (visibles al inicio, carga directa) ────
import HeroSection from "./sections/HeroSection";
import DetailsSection from "./sections/DetailsSection";
import InfoSection from "./sections/InfoSection";
import StorySection from "./sections/StorySection";

// ─── Componentes globales ─────────────────────────────────────────
import EnvelopeOverlay from "../components/EnvelopeOverlay";

// ─── Secciones secundarias (carga diferida) ────────────────────────
const GiftsSection = lazy(() => import("./sections/GiftsSection"));
const AccommodationSection = lazy(() => import("./sections/AccommodationSection"));
const GallerySection = lazy(() => import("./sections/GallerySection"));
import RsvpSection from "./sections/RsvpSection";

/**
 * Mapa de claves de sección a sus componentes React.
 * Permite renderizado dinámico según el orden configurado.
 */
const SECTION_COMPONENTS = {
  hero: HeroSection,
  details: DetailsSection,
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
  const { t } = useTranslation();
  const location = useLocation();
  const { inviteToken } = useParams();
  const searchParams = new URLSearchParams(location.search);
  /** Modo "invitar": muestra la invitación completa incluyendo RSVP. */
  const isInviteMode = searchParams.has("invitar");

  // ─── Estado global del contexto ────────────────────────
  const {
    config, isConfigLoading, configLoadError, formattedDate, formattedTime, calendarLink,
    rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted, alreadySubmittedEntry,
    locationMapContainerRef, locationMapError, setLocationMapError,
    locationMapLoading, setLocationMapLoading, locationMapTarget, setLocationMapTarget,
    handleRsvpSubmit, updateRsvpField, handleDeleteRsvp,
    isAdminTokenLoggedIn,
    handleDietaryToggle, DIETARY_OPTIONS, computeAge,
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
      let filtered = showRsvp ? sectionOrder : sectionOrder.filter((s) => s !== "rsvp");
      if (!isInviteMode) {
        filtered = filtered.filter((s) => !hiddenSet.has(s));
      }
      return filtered;
    },
    [sectionOrder, showRsvp, hiddenSet, isInviteMode],
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
  const [countdown, setCountdown] = useState(null);

  /**
   * Construye el objeto Date de la boda a partir de los campos de configuración.
   * Retorna null si algún campo no es válido.
   */
  const weddingDate = useMemo(() => {
    const day = Number.parseInt(config.weddingDay, 10);
    const month = MONTH_VALUE_TO_NUMBER[config.weddingMonth];
    const year = Number.parseInt(config.weddingYear, 10);
    const hour = Number.parseInt(config.weddingHour, 10);
    const minute = Number.parseInt(config.weddingMinute, 10);
    if (!day || !month || !year || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return new Date(year, month - 1, day, hour, minute);
  }, [config]);

  /**
   * Actualiza la cuenta regresiva cada segundo.
   * Calcula años, meses, días, horas y minutos restantes.
   */
  useEffect(() => {
    if (!weddingDate) return;
    const tick = () => {
      const diff = weddingDate.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, expired: true });
        return;
      }
      setCountdown({
        years: Math.floor(diff / (1000 * 60 * 60 * 24 * 365)),
        months: Math.floor((diff / (1000 * 60 * 60 * 24 * 30.44)) % 12),
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [weddingDate]);

  // ═══════════════════════════════════════════════════════
  // MAPA INTERACTIVO (Leaflet)
  // ═══════════════════════════════════════════════════════

  /**
   * Inicializa el mapa de Leaflet cuando cambia la ubicación.
   * Carga Leaflet dinámicamente (code splitting) para reducir el bundle inicial.
   * Resuelve coordenadas mediante geocodificación si no hay coordenadas exactas.
   */
  useEffect(() => {
    const place = (config.weddingPlace || "").trim();
    const container = locationMapContainerRef.current;
    const hasExactCoordinates = Boolean(getValidCoordinates(config.weddingLatitude, config.weddingLongitude));
    // No hace nada si no hay lugar ni coordenadas, o si no hay contenedor
    if ((!place && !hasExactCoordinates) || !container) {
      setLocationMapError("");
      setLocationMapLoading(false);
      setLocationMapTarget(null);
      return undefined;
    }

    let isCancelled = false;
    let mapInstance = null;
    setLocationMapError("");
    setLocationMapLoading(true);
    setLocationMapTarget(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        // Importación dinámica de Leaflet (solo cuando se necesita)
        await import("leaflet/dist/leaflet.css");
        const L = (await import("leaflet")).default;
        const geocodedLocation = await resolveLocationTarget({
          place,
          latitudeValue: config.weddingLatitude,
          longitudeValue: config.weddingLongitude,
        });
        if (isCancelled || !container.isConnected) return;

        if (!geocodedLocation) {
          setLocationMapError(t("public.locationNotFound"));
          setLocationMapLoading(false);
          return;
        }

        setLocationMapTarget(geocodedLocation);

        // Inicializa el mapa con opciones de solo lectura
        mapInstance = L.map(container, {
          center: [geocodedLocation.latitude, geocodedLocation.longitude],
          zoom: 15,
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: false,
          dragging: false,
        });

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapInstance);

        // Marcador circular en la ubicación
        L.circleMarker([geocodedLocation.latitude, geocodedLocation.longitude], {
          radius: 10,
          color: "#d8b24a",
          fillColor: "#d8b24a",
          fillOpacity: 0.9,
          weight: 3,
          opacity: 0.8,
        }).addTo(mapInstance);

        mapInstance.whenReady(() => {
          mapInstance.invalidateSize();
          if (!isCancelled) setLocationMapLoading(false);
        });
      } catch {
        if (!isCancelled) {
          setLocationMapError(t("public.locationMapError"));
          setLocationMapLoading(false);
        }
      }
    }, 0);

    // ── Limpieza del mapa al desmontar o cambiar ubicación ──
    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
      setLocationMapTarget(null);
      if (mapInstance) mapInstance.remove();
    };
  }, [config.weddingPlace, config.weddingLatitude, config.weddingLongitude,
      locationMapContainerRef, setLocationMapError, setLocationMapLoading, setLocationMapTarget, t]);

  // ─── Datos de ubicación derivados ──────────────────────
  const configuredCoordinates = getValidCoordinates(config.weddingLatitude, config.weddingLongitude);
  const hasLocationData = Boolean(config.weddingPlace || configuredCoordinates);
  const locationDescription = config.weddingPlace
    ? config.weddingPlace
    : configuredCoordinates
      ? t("public.locationCoordinates", { lat: configuredCoordinates.latitude, lng: configuredCoordinates.longitude })
      : "";

  // ═══════════════════════════════════════════════════════
  // PROPS PARA CADA SECCIÓN (MEMOIZADOS)
  // ═══════════════════════════════════════════════════════

  /**
   * Props pre-calculadas para cada componente de sección.
   * Se memoiza para evitar re-renders innecesarios.
   */
  const sectionProps = useMemo(() => ({
    hero: {
      firstName: config.firstName,
      secondName: config.secondName,
      inviteMessage: config.inviteMessage,
      countdown,
      couplePhoto: config.couplePhoto,
      godparent1: config.godparent1,
      godparent2: config.godparent2,
    },
    details: {
      formattedDate,
      formattedTime,
      hasLocationData,
      locationDescription,
      calendarLink,
      locationMapContainerRef,
      locationMapLoading,
      locationMapError,
      locationMapTarget,
      configWeddingPlace: config.weddingPlace,
      transportInfo: config.transportInfo,
    },
    info: {
      weddingSchedule: config.weddingSchedule,
      weddingDressCode: config.weddingDressCode,
      kidsPolicy: config.kidsPolicy,
    },
    story: {
      storyText: config.storyText,
    },
    gifts: {
      giftsInfo: config.giftsInfo,
      bankInfo: config.bankInfo,
    },
    accommodation: {
      accommodationInfo: config.accommodationInfo,
    },
    gallery: {
      inviteToken,
    },
    rsvp: {
      rsvpForm,
      rsvpEntries,
      rsvpMessage,
      isRsvpSubmitting,
      hasSubmitted,
      alreadySubmittedEntry,
      updateRsvpField,
      handleRsvpSubmit,
      handleDeleteRsvp,
      handleDietaryToggle,
      DIETARY_OPTIONS,
      computeAge,
      menuEnabled: config.menuEnabled === "true",
      menuCarne: config.menuCarne,
      menuPescado: config.menuPescado,
      menuVegano: config.menuVegano,
      menuPostre: config.menuPostre,
      menuTexto: config.menuTexto,
    },
  }), [
    config.firstName, config.secondName, config.inviteMessage,
    config.weddingPlace, config.weddingSchedule, config.weddingDressCode,
    config.kidsPolicy, config.storyText, config.giftsInfo, config.accommodationInfo,
    config.transportInfo, config.godparent1, config.godparent2, inviteToken,
    config.couplePhoto, config.bankInfo, config.menuEnabled,
    config.menuCarne, config.menuPescado, config.menuVegano, config.menuPostre, config.menuTexto,
    countdown, formattedDate, formattedTime,
    hasLocationData, locationDescription, calendarLink,
    locationMapContainerRef, locationMapLoading, locationMapError, locationMapTarget,
    rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted, alreadySubmittedEntry,
    updateRsvpField, handleRsvpSubmit, handleDeleteRsvp, handleDietaryToggle, DIETARY_OPTIONS, computeAge,
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
    <div className={`app-scene ${isStoryTransitioning ? "app-scene--transitioning" : ""}`}>
      {showEnvelope ? <EnvelopeOverlay onOpen={() => setEnvelopeOpen(true)} /> : null}

      {/* ── Decoraciones laterales (eucalipto) ── */}
      <div className="fixed top-0 z-0 pointer-events-none left-2 wedding-decoration--left wedding-decoration">
        <img src={eucalyptusSrc} alt="" aria-hidden="true" loading="lazy" className="wedding-decoration__image" />
      </div>
      <div className="fixed z-0 pointer-events-none right-2 bottom-2 wedding-decoration--right wedding-decoration">
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
        <>
          {visibleOrder.map((sectionKey) => {
            const Component = SECTION_COMPONENTS[sectionKey];
            if (!Component) return null;
            return (
              <Component
                key={sectionKey}
                style={getStorySectionStyle(sectionKey)}
                className={getStorySectionClassName(sectionKey)}
                // Propaga las props específicas de cada sección
                {...sectionProps[sectionKey]}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
