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

import { lazy, Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { useConfig, useRsvpContext, useAuth, useAnimations } from "../contexts";
import { useStoryNavigation } from "../hooks/useStoryNavigation";
import { usePlatformSettings, tokenIsBlocked, isFeatureDisabled } from "../lib/platform-settings";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useFocusTrap } from "../hooks/useFocusTrap";

import { MONTH_VALUE_TO_NUMBER } from "../lib/constants";
import { parseSectionOrder, sectionHasContent } from "../lib/section-utils";
import { SITE_URL, applySocialMeta, resetSocialMeta } from "../lib/seo";
import { trackEvent } from "../lib/analytics";

// ─── Componentes de sección (visibles al inicio, carga directa) ────
import HeroSection from "./sections/HeroSection";
import DetailsSection from "./sections/DetailsSection";

// ─── Componentes globales ─────────────────────────────────────────
import EnvelopeOverlay from "../components/EnvelopeOverlay";
import ErrorBoundary from "../components/ErrorBoundary";
import Confetti, { CONF_TOTAL_MS } from "../components/Confetti";
import WeddingDecorations from "../components/WeddingDecorations";

// ─── Secciones secundarias (carga diferida) ────────────────────────
const TransportSection = lazy(() => import("./sections/TransportSection"));
const InfoSection = lazy(() => import("./sections/InfoSection"));
const StorySection = lazy(() => import("./sections/StorySection"));
const GiftsSection = lazy(() => import("./sections/GiftsSection"));
const AccommodationSection = lazy(() => import("./sections/AccommodationSection"));
const GallerySection = lazy(() => import("./sections/GallerySection"));
const RsvpSection = lazy(() => import("./sections/RsvpSection"));
const ReactionsSection = lazy(() => import("./sections/ReactionsSection"));
const NotesSection = lazy(() => import("./sections/NotesSection"));
const MusicPollSection = lazy(() => import("./sections/MusicPollSection"));
const TriviaSection = lazy(() => import("./sections/TriviaSection"));
const VoiceNotesSection = lazy(() => import("./sections/VoiceNotesSection"));
const DayPhotosSection = lazy(() => import("./sections/DayPhotosSection"));
const MailboxSection = lazy(() => import("./sections/MailboxSection"));
const ToastsSection = lazy(() => import("./sections/ToastsSection"));
const VenueMapSection = lazy(() => import("./sections/VenueMapSection"));
const GiftListSection = lazy(() => import("./sections/GiftListSection"));
const RideShareSection = lazy(() => import("./sections/RideShareSection"));
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

/** Props vacías compartidas (referencia estable, no rompe React.memo). */
const EMPTY_PROPS: Record<string, unknown> = {};

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
  // Preferencias de animación: base del admin ∪ preferencias del invitado.
  // `isDisabled(id)` decide en runtime las animaciones gestionadas por JS
  // (sobre, confeti, navegación, hero, galería); las de CSS las aplica
  // AnimationPrefsApplier vía clases en <html>.
  const { isDisabled, effectiveDisabled } = useAnimations();

  // Ajustes globales de la plataforma (kill-switch por función, banner,
  // bloqueos, mantenimiento). Se carga aquí (arriba) porque `hasExtras` y
  // `extraBlocks` lo usan para el kill-switch por función.
  const { settings: platform } = usePlatformSettings();

  // ─── Estado global del contexto (hooks granulares por dominio) ──
  const { config, isConfigLoading, configLoadError, formattedDate, formattedTime, calendarLink } = useConfig();
  const {
    rsvpEntries,
    rsvpMessage,
    isRsvpSubmitting,
    hasSubmitted,
    alreadySubmittedEntry,
    rsvpLoadError,
    retryLoadRsvp,
    handleDeleteRsvp,
    DIETARY_OPTIONS,
  } = useRsvpContext();
  const { isAdminTokenLoggedIn } = useAuth();

  // ─── Secciones ocultas derivadas de la configuración ───
  const hiddenSet = useMemo(() => {
    const raw = config.hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [config.hiddenSections]);

  // ─── Galería: ¿tiene imágenes? ─────────────────────────
  // La galería se desactiva si no tiene ninguna imagen subida (filtro de
  // secciones sin contenido aplicado a todas). Se consultan los metadatos al
  // inicio para decidirlo antes de montar la sección.
  const [galleryImageCount, setGalleryImageCount] = useState<number | null>(null);
  const galleryHasImages = (galleryImageCount ?? 0) > 0;

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      try {
        const { loadGalleryMeta } = await import("../lib/image-store");
        const metas = await loadGalleryMeta(inviteToken);
        if (!cancelled) setGalleryImageCount(metas.length);
      } catch {
        if (!cancelled) setGalleryImageCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  /** ¿Hay alguna función social activa? Se agrupan en la sección conjunta
   *  "extras" (reordenable en el editor, siempre antes del RSVP). */
  // Kill-switch por función social: una función debe estar activa en la
  // invitación Y no desactivada globalmente por el superadmin.
  const socialEnabled = useCallback(
    (
      feature: "gifts" | "rides" | "reactions" | "notes" | "songs" | "trivia" | "voiceNotes" | "dayPhotos" | "mailbox" | "toasts" | "venueMap",
      flag?: string,
    ) => flag === "true" && !isFeatureDisabled(platform, feature),
    [platform],
  );

  const hasExtras =
    socialEnabled("gifts", config.giftsListEnabled) ||
    socialEnabled("rides", config.rideShareEnabled) ||
    socialEnabled("reactions", config.reactionsEnabled) ||
    socialEnabled("notes", config.notesEnabled) ||
    socialEnabled("songs", config.musicPollEnabled) ||
    socialEnabled("trivia", config.triviaEnabled) ||
    socialEnabled("voiceNotes", config.voiceNotesEnabled) ||
    socialEnabled("dayPhotos", config.dayPhotosEnabled) ||
    socialEnabled("mailbox", config.mailboxEnabled) ||
    socialEnabled("toasts", config.toastsEnabled) ||
    socialEnabled("venueMap", config.venueMapEnabled);

  // Bloques de las funciones sociales activas: se agrupan en la sección
  // conjunta "extras" (renderizados por config para no duplicar el JSX).
  const extraBlocks = useMemo<Array<{ title: string; node: React.JSX.Element }>>(
    () =>
      [
        socialEnabled("gifts", config.giftsListEnabled)
          ? { title: t("giftList.title"), node: <GiftListSection inviteToken={inviteToken ?? ""} gifts={config.giftList ?? "[]"} /> }
          : null,
        socialEnabled("rides", config.rideShareEnabled)
          ? { title: t("rideShare.title"), node: <RideShareSection inviteToken={inviteToken ?? ""} /> }
          : null,
        socialEnabled("reactions", config.reactionsEnabled)
          ? { title: t("reactions.title"), node: <ReactionsSection inviteToken={inviteToken ?? ""} /> }
          : null,
        socialEnabled("notes", config.notesEnabled)
          ? { title: t("notes.title"), node: <NotesSection inviteToken={inviteToken ?? ""} /> }
          : null,
        socialEnabled("songs", config.musicPollEnabled)
          ? { title: t("musicPoll.title"), node: <MusicPollSection inviteToken={inviteToken ?? ""} /> }
          : null,
        socialEnabled("trivia", config.triviaEnabled)
          ? { title: t("trivia.title"), node: <TriviaSection trivia={config.trivia ?? "[]"} /> }
          : null,
        socialEnabled("voiceNotes", config.voiceNotesEnabled)
          ? { title: t("voiceNotes.title"), node: <VoiceNotesSection inviteToken={inviteToken ?? ""} /> }
          : null,
        socialEnabled("dayPhotos", config.dayPhotosEnabled)
          ? { title: t("dayPhotos.title"), node: <DayPhotosSection inviteToken={inviteToken ?? ""} /> }
          : null,
        socialEnabled("mailbox", config.mailboxEnabled)
          ? { title: t("mailbox.title"), node: <MailboxSection inviteToken={inviteToken ?? ""} /> }
          : null,
        socialEnabled("toasts", config.toastsEnabled)
          ? { title: t("toasts.title"), node: <ToastsSection inviteToken={inviteToken ?? ""} /> }
          : null,
        socialEnabled("venueMap", config.venueMapEnabled)
          ? { title: t("venueMap.title"), node: <VenueMapSection inviteToken={inviteToken ?? ""} background={config.backgroundImage} /> }
          : null,
      ].filter((b): b is { title: string; node: React.JSX.Element } => b !== null),
    [config.giftsListEnabled, config.rideShareEnabled, config.reactionsEnabled, config.notesEnabled, config.musicPollEnabled, config.triviaEnabled, config.voiceNotesEnabled, config.dayPhotosEnabled, config.mailboxEnabled, config.toastsEnabled, config.venueMapEnabled, config.giftList, config.trivia, config.backgroundImage, t, inviteToken, socialEnabled],
  );

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
  const visibleOrder = useMemo(() => {
    let filtered = showRsvp ? sectionOrder : sectionOrder.filter((s: string) => s !== "rsvp");
    if (!isInviteMode) {
      filtered = filtered.filter((s: string) => !hiddenSet.has(s));
    }
    // Oculta las secciones sin contenido configurado (aunque estén en el
    // orden) para no mostrar secciones vacías al invitado. Se aplica a
    // TODAS: la galería se desactiva si no tiene imágenes y los extras si
    // no hay ninguna función social activa.
    filtered = filtered.filter((s: string) => sectionHasContent(s, config, galleryHasImages));
    filtered = filtered.filter((s: string) => s !== "extras" || hasExtras);
    return filtered;
  }, [sectionOrder, showRsvp, hiddenSet, isInviteMode, config, galleryHasImages, hasExtras]);

  // ─── Estados de UI condicionales ───────────────────────
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
  // Cierre animado del vídeo de bienvenida: la clase --closing se aplica y el
  // componente se desmonta tras la animación de salida (evita el corte).
  const [videoClosing, setVideoClosing] = useState(false);

  // Cierre animado del vídeo de bienvenida: la clase --closing se aplica y el
  // componente se desmonta tras la animación de salida (evita el corte).
  const videoClosingRef = useRef(false);
  // Los setTimeout de vídeo/confeti se limpian al desmontar: son idempotentes
  // pero no deben actualizar estado de un componente retirado de la pantalla.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timersRef.current.forEach((id) => clearTimeout(id)), []);
  const closeWelcomeVideo = useCallback(() => {
    if (videoClosingRef.current) return;
    videoClosingRef.current = true;
    setVideoClosing(true);
    const id = setTimeout(() => {
      setShowWelcomeVideo(false);
      setVideoClosing(false);
      videoClosingRef.current = false;
    }, 300);
    timersRef.current.push(id);
  }, []);
  // Apertura del sobre y confeti: handlers ESTABLES (useCallback) para no
  // romper el React.memo del EnvelopeOverlay.
  const handleEnvelopeOpen = useCallback(() => {
    setEnvelopeOpen(true);
    if (config.welcomeVideo && config.welcomeVideoEnabled !== "false") setShowWelcomeVideo(true);
    // Apertura del sobre: el gesto principal de la invitación.
    trackEvent("envelope_open", { method: "click" });
  }, [config.welcomeVideo, config.welcomeVideoEnabled]);
  const handleConfetti = useCallback(() => {
    // El confeti arranca justo al terminar el fade out del texto del sobre
    // (2.6s tras el segundo gesto) y cae una única vez detrás de la invitación.
    setShowConfetti(true);
    const id = setTimeout(() => setShowConfetti(false), CONF_TOTAL_MS);
    timersRef.current.push(id);
  }, []);
  // El vídeo de bienvenida es un diálogo modal: trampa de foco (WCAG 2.4.3) y
  // cierre con Escape mientras está abierto (incluida la animación de salida).
  const videoOpen = showWelcomeVideo || videoClosing;
  const welcomeVideoRef = useFocusTrap<HTMLDivElement>(videoOpen);
  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeWelcomeVideo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoOpen, closeWelcomeVideo]);
  // La invitación está "configurada" si tiene nombres. Con ?invitar y un
  // token vacío/borrado debe mostrarse el estado no encontrado (antes caía
  // al render completo con un hero sin nombres).
  const isConfigured = Boolean(config.firstName || config.secondName);
  const isEmpty = !isConfigured && !inviteToken && !isInviteMode;
  const hasHash = location.hash.length > 1;

  // ─── Navegación entre secciones (hook extraído) ─────────
  /**
   * Hook que gestiona la navegación por scroll, teclado y touch
   * entre las secciones de la invitación. Controla el estado activo,
   * las transiciones animadas y los estilos CSS dinámicos.
   *
   * `enabled` se desactiva mientras el sobre está cerrado: así el contenido
   * queda quieto detrás del sobre y el hero hace su animación de ENTRADA en
   * el momento en que se abre. Si la invitación se carga sin sobre (admin)
   * el arranque es "boot": la sección visible no se anima para no parpadear
   * al recargar.
   */
  const showMissingToken = !isConfigured && !hasHash && (Boolean(inviteToken) || isInviteMode);
  // F3-6: token bloqueado por el superadmin → la invitación no se muestra.
  const tokenBlocked = Boolean(inviteToken) && tokenIsBlocked(inviteToken || "", platform.blockedTokens);
  const showEnvelope =
    !isAdminTokenLoggedIn && !isConfigLoading && !configLoadError && !isEmpty && !showMissingToken && !envelopeOpen;
  const {
    getSectionStyle: getStorySectionStyle,
    getSectionClassName: getStorySectionClassName,
  } = useStoryNavigation(visibleOrder, {
    // `enabled` requiere que el sobre esté fuera Y que el vídeo de bienvenida
    // esté cerrado: así la animación de entrada del hero no se ejecuta detrás
    // del vídeo (el usuario la vería perdida y al cerrarlo el hero aparecería
    // ya renderizado). Sin vídeo, se activa justo al terminar el sobre.
    enabled: !showEnvelope && !videoOpen,
    reducedMotion,
    // Animaciones de navegación desactivadas (base ∪ invitado): el hook las
    // respeta por código (transiciones, snap y entrada 3D).
    animationsDisabled: effectiveDisabled,
  });

  // ─── Cuenta regresiva ──────────────────────────────────

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
    const date = new Date(year, month - 1, day, hour, minute);
    // Un "31 de febrero" normaliza a 3 de marzo en silencio: si la fecha no
    // coincide con los componentes, se descarta (no se muestra un countdown
    // a una fecha errónea).
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }, [config]);

  // ─── Schema.org JSON-LD ─────────────────────────────
  useEffect(() => {
    if (!config.firstName || !config.weddingYear) return;
    const coupleName = `${config.firstName} & ${config.secondName || ""}`.trim();
    // startDate en ISO 8601 estricto: weddingMonth es el nombre del mes en
    // español; sin convertirlo a número Google rechazaba el Event.
    const pad = (n: string) => n.padStart(2, "0");
    const monthNum = MONTH_VALUE_TO_NUMBER[config.weddingMonth as keyof typeof MONTH_VALUE_TO_NUMBER];
    const startDate = monthNum
      ? `${config.weddingYear}-${pad(String(monthNum))}-${pad(config.weddingDay)}T${pad(config.weddingHour)}:${pad(config.weddingMinute)}:00`
      : undefined;
    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: coupleName,
      description: config.inviteMessage || coupleName,
      url: `${SITE_URL}/${inviteToken}`,
      image:
        config.couplePhoto && /^https?:/.test(config.couplePhoto) ? config.couplePhoto : `${SITE_URL}/og-banner.png`,
      organizer: { "@type": "Person", name: coupleName },
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
    };
    if (startDate) schema.startDate = startDate;
    if (config.weddingPlace) {
      schema.location = { "@type": "Place", name: config.weddingPlace, address: config.weddingPlace };
    }
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [
    config.firstName,
    config.secondName,
    config.inviteMessage,
    config.weddingYear,
    config.weddingMonth,
    config.weddingDay,
    config.weddingHour,
    config.weddingMinute,
    config.weddingPlace,
    config.couplePhoto,
    inviteToken,
  ]);

  // ─── Metadatos sociales Open Graph / Twitter (SEO) ─────
  useEffect(() => {
    if (!config.firstName) return;
    const coupleName = `${config.firstName} ${config.secondName || ""}`.trim();
    applySocialMeta({
      title: `${coupleName} — Wedingo`,
      description:
        config.inviteMessage || t("seo.inviteFallback", { names: `${config.firstName} & ${config.secondName || ""}`.trim() }),
      url: `${SITE_URL}/${inviteToken}`,
      image: config.couplePhoto,
      locale: i18n?.language,
    });
    return () => resetSocialMeta();
  }, [config.firstName, config.secondName, config.inviteMessage, config.couplePhoto, inviteToken, i18n, t]);

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
  const configSectionProps = useMemo(
    () => ({
      hero: {
        firstName: config.firstName,
        secondName: config.secondName,
        inviteMessage: config.inviteMessage,
        couplePhoto: config.couplePhoto,
        godparent1: config.godparent1,
        godparent2: config.godparent2,
        cornerDecoration: config.cornerDecoration,
        verified: config.verified,
      },
      details: {
        formattedDate,
        formattedTime,
        hasLocationData,
        locationDescription,
        weddingPlace: config.weddingPlace,
        weddingDay: config.weddingDay,
        weddingMonth: config.weddingMonth,
        weddingYear: config.weddingYear,
        weddingHour: config.weddingHour,
        weddingMinute: config.weddingMinute,
        coupleFirstName: config.firstName,
        coupleSecondName: config.secondName,
        calendarLink,
        weddingSiteURL: config.weddingSiteURL,
        instagramUrl: config.instagramUrl,
        facebookUrl: config.facebookUrl,
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
        // Conjunto efectivo: GallerySection lo usa para el auto-avance (JS).
        disabledAnimations: effectiveDisabled,
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
    }),
    [
      config.firstName,
      config.secondName,
      config.inviteMessage,
      config.weddingScheduleEvents,
      config.weddingDressCode,
      config.weddingDressCodeCustom,
      config.kidsPolicy,
      config.storyText,
      config.giftsInfo,
      config.accommodationURL,
      config.godparent1,
      config.godparent2,
      inviteToken,
      config.couplePhoto,
      config.bankInfo,
      config.menuEnabled,
      config.menuCarneDishes,
      config.menuPescadoDishes,
      config.menuVeganoDishes,
      config.menuTextoDishes,
      config.cornerDecoration,
      config.verified,
      formattedDate,
      formattedTime,
      hasLocationData,
      locationDescription,
      config.weddingPlace,
      config.weddingDay,
      config.weddingMonth,
      config.weddingYear,
      config.weddingHour,
      config.weddingMinute,
      calendarLink,
      config.weddingSiteURL,
      config.instagramUrl,
      config.facebookUrl,
      config.weddingMapView,
      config.weddingMapStatic,
      config.detailsMapMode,
      config.transportMapMode,
      config.accommodationMapMode,
      config.transportEnabled,
      config.transportDepartures,
      effectiveDisabled,
    ],
  );

  /**
   * Props del hero: la fecha del evento es ESTABLE (solo cambia con la
   * config); el countdown se calcula dentro de HeroSection para no
   * re-renderizar la página cada segundo.
   */
  const heroProps = useMemo(
    () => ({
      weddingDate,
      inviteToken: inviteToken ?? "",
      schedule: config.weddingScheduleEvents ?? "[]",
      // Conjunto efectivo de animaciones desactivadas: HeroSection lo usa para
      // el countdown (tick), el anillo de la foto, el fundido y el resplandor.
      disabledAnimations: effectiveDisabled,
    }),
    [weddingDate, inviteToken, config.weddingScheduleEvents, effectiveDisabled],
  );

  /**
   * Props del estado RSVP: solo afectan a RsvpSection. Cambian al editar el
   * formulario RSVP, sin re-renderizar el resto de secciones.
   */
  const rsvpSectionProps = useMemo(
    () => ({
      rsvpEntries,
      rsvpMessage,
      isRsvpSubmitting,
      hasSubmitted,
      alreadySubmittedEntry,
      rsvpLoadError,
      retryLoadRsvp,
      handleDeleteRsvp,
      DIETARY_OPTIONS,
      // F3-7: confirmaciones "sí" actuales para el control de aforo.
      rsvpConfirmedCount: rsvpEntries.filter((e) => e.attendance === "yes").length,
      // Diferencial: token para localizar la mesa asignada al invitado.
      inviteToken: inviteToken ?? "",
    }),
    [
      rsvpEntries,
      rsvpMessage,
      isRsvpSubmitting,
      hasSubmitted,
      alreadySubmittedEntry,
      rsvpLoadError,
      retryLoadRsvp,
      handleDeleteRsvp,
      DIETARY_OPTIONS,
      inviteToken,
    ],
  );

  // ─── Estados de UI condicionales ───────────────────────

  /**
   * Comparte la invitación: navegador nativo si está disponible, si no,
   * enlace de WhatsApp. Registra el evento en analítica (con consentimiento).
   */
  const handleShare = async () => {
    const url = `${SITE_URL}/${inviteToken}`;
    // Texto traducido (antes estaba en español para toda la UI).
    const text = t("public.shareInvite", { firstName: config.firstName, secondName: config.secondName });
    const native = typeof navigator !== "undefined" && "share" in navigator;
    try {
      if (native) {
        await navigator.share({ title: "Wedingo", text, url });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
      }
      trackEvent("share_invite", { method: native ? "native" : "whatsapp" });
    } catch (err) {
      // El usuario canceló el panel nativo (AbortError): silencioso. Cualquier
      // otro fallo (HTTP no seguro, permiso) cae al enlace de WhatsApp para
      // que el invitado siempre tenga una vía de compartir.
      const name =
        typeof err === "object" && err !== null && "name" in err ? String((err as { name?: unknown }).name) : "";
      const isCancel = name === "AbortError";
      if (!isCancel && native) {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
        trackEvent("share_invite", { method: "whatsapp" });
      }
    }
  };

  // ═══════════════════════════════════════════════════════
  // RENDERIZADO CONDICIONAL
  // ═══════════════════════════════════════════════════════

  // ── Estado de carga ──
  if (isConfigLoading) {
    return (
      <div className="app-scene">
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div
            className="w-full max-w-md text-center story-panel story-panel--hero"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/60 leading-relaxed">
              {t("public.loadingInvitation")}
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ── Kill-switch global: mantenimiento de la plataforma ──
  // Con `platform.maintenance === "true"` la invitación no se muestra (ni el
  // sobre): se presenta una pantalla de mantenimiento al visitante. Es la
  // respuesta rápida del superadmin ante un incidente (sin Blaze).
  if (platform.maintenance === "true" && !isAdminTokenLoggedIn) {
    return (
      <div className="app-scene">
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div className="w-full max-w-md text-center story-panel story-panel--hero">
            <p className="story-eyebrow">{t("public.maintenanceEyebrow")}</p>
            <h1 className="story-title">{t("public.maintenanceTitle")}</h1>
            <p className="story-copy">{t("public.maintenanceText")}</p>
          </div>
        </section>
      </div>
    );
  }

  // ── Error de carga ──
  if (configLoadError) {
    // Un enlace corrupto no se arregla recargando: mostrar el inicio en vez
    // de un botón "Reintentar" que provoca un bucle infinito.
    const invalidLink = configLoadError === t("errors.invalidLink");
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
            <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">{configLoadError}</p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <button
                className="text-sm setup-button"
                type="button"
                onClick={() => {
                  if (invalidLink) {
                    window.location.assign("/");
                  } else {
                    window.location.reload();
                  }
                }}
              >
                {invalidLink ? t("common.goHome") : t("common.retry")}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /** ¿Mostrar pantalla de token no encontrado o invitación vacía? */
  // ═══════════════════════════════════════════════════════
  // RENDERIZADO PRINCIPAL
  // ═══════════════════════════════════════════════════════
  return (
    <div
      className="app-scene"
      style={
        {
          "--story-card-user-bg": config.backgroundImage ? `url(${config.backgroundImage})` : undefined,
        } as React.CSSProperties
      }
    >
      {/* F3-1: banner global de la plataforma (avisos de mantenimiento/legal). */}
      {platform.bannerEnabled === "true" && platform.bannerText ? (
        <div
          role="status"
          className="platform-banner"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9990,
            textAlign: "center",
            padding: "0.45rem 1rem",
            fontSize: "0.8rem",
            color: "#fff",
            background: "rgba(40,30,20,0.92)",
            borderBottom: "1px solid color-mix(in srgb, var(--setup-accent) 40%, transparent)",
          }}
        >
          {platform.bannerText}
        </div>
      ) : null}
      {showEnvelope ? (
        <EnvelopeOverlay
          onOpen={handleEnvelopeOpen}
          onConfetti={handleConfetti}
          firstName={config.firstName}
          secondName={config.secondName}
          customSeal={config.customSeal}
          inviteToken={inviteToken}
          disabledAnimations={effectiveDisabled}
        />
      ) : null}

      {/* Confeti al abrir el sobre (decoración, sin interacción). Si el confeti
          está desactivado (base o invitado) no se monta: evita el coste. */}
      {showConfetti && !isDisabled("confetti-fall") ? <Confetti /> : null}

      {/* Vídeo de bienvenida: entrada y salida animadas (el componente se
          mantiene montado durante la salida para que el fade no se corte). */}
      {envelopeOpen &&
      (showWelcomeVideo || videoClosing) &&
      config.welcomeVideo &&
      config.welcomeVideoEnabled !== "false" ? (
        <div
          ref={welcomeVideoRef}
          className={`welcome-video-overlay ${videoClosing ? "welcome-video-overlay--closing" : ""}`}
          onClick={closeWelcomeVideo}
          role="dialog"
          aria-modal="true"
          aria-label={t("welcomeVideo.title")}
        >
          <div
            className={`welcome-video-card ${videoClosing ? "welcome-video-card--closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeWelcomeVideo} aria-label={t("common.close")}>
              &times;
            </button>
            <video className="welcome-video" src={config.welcomeVideo} controls autoPlay playsInline />
          </div>
        </div>
      ) : null}

      {/* Mientras el sobre está cerrado, el contenido trasero queda inerte e
          invisible para lectores de pantalla (WCAG 1.3.2 / 2.4.3). display:
          contents no altera el layout. */}
      {/* Mientras el sobre está cerrado o el vídeo de bienvenida está abierto,
          el contenido trasero queda inerte e invisible para lectores de
          pantalla (WCAG 1.3.2 / 2.4.3). display: contents no altera el layout. */}
      <div style={{ display: "contents" }} aria-hidden={showEnvelope || videoOpen || undefined} inert={showEnvelope || videoOpen || undefined}>
        {/* ── Decoraciones laterales (eucalipto) ── */}
        <WeddingDecorations />

        {/* ── Token bloqueado por el superadmin (F3-6) ── */}
        {tokenBlocked ? (
          <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
            <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="assertive">
              <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
                {t("public.blockedTitle")}
              </h1>
              <div className="my-6 story-divider" />
              <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">{t("public.blockedText")}</p>
            </div>
          </section>
        ) : showMissingToken ? (
          <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
            <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="assertive">
              <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
                {t("public.emptyTitle")}
              </h1>
              <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
                {t("public.notFoundTitle")}
              </p>
              <div className="my-6 story-divider" />
              <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">{t("public.notFoundText")}</p>
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
              <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">{t("public.emptyDescription")}</p>
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                <a href="/" className="text-sm setup-button">
                  {t("public.createLink")}
                </a>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* ── Invitación completa: renderiza cada sección en orden ── */}
            <Suspense fallback={null}>
              {visibleOrder.map((sectionKey: string) => {
                // La sección "extras" (funciones sociales) se renderiza en el
                // orden configurado, agrupada en una única sección scrollable.
                if (sectionKey === "extras") {
                  return (
                    <section
                      key="extras"
                      data-story-section="extras"
                      className={getStorySectionClassName("extras")}
                      style={getStorySectionStyle("extras")}
                      aria-label={t("extras.ariaLabel")}
                    >
                      <div className="story-panel story-panel--extras w-full">
                        {extraBlocks.map((b, i) => (
                          <Fragment key={b.title}>
                            {i > 0 ? <div className="story-divider" /> : null}
                            <div className="story-extra-block">
                              <h2 className="story-title">{b.title}</h2>
                              <Suspense fallback={null}>{b.node}</Suspense>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                    </section>
                  );
                }
                const Component = (
                  SECTION_COMPONENTS as unknown as Record<string, React.ComponentType<Record<string, unknown>>>
                )[sectionKey];
                if (!Component) {
                  return null;
                }
                const baseProps = (configSectionProps as Record<string, Record<string, unknown>>)[sectionKey] || {};
                const extraProps =
                  sectionKey === "hero" ? heroProps : sectionKey === "rsvp" ? rsvpSectionProps : EMPTY_PROPS;
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
          </>
        )}
        {/* Botón de compartir de la invitación pública (aparece tras el sobre). */}
        {!isEmpty && !showMissingToken ? (
          <button
            type="button"
            className="invite-share"
            onClick={handleShare}
            aria-label={t("public.share")}
            title={t("public.share")}
          >
            <span aria-hidden="true">↗</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
