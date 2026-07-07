import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "leaflet/dist/leaflet.css";

import { useApp } from "../contexts/AppContext";
import {
  getValidCoordinates,
  resolveLocationTarget,
} from "../lib/utils";
import { MONTH_VALUE_TO_NUMBER } from "../lib/constants";
import { parseSectionOrder } from "../lib/section-utils";

import eucalyptusSrc from "../assets/eucalyptus.png";
import HeroSection from "./sections/HeroSection";
import DetailsSection from "./sections/DetailsSection";
import InfoSection from "./sections/InfoSection";
import StorySection from "./sections/StorySection";
import GiftsSection from "./sections/GiftsSection";
import AccommodationSection from "./sections/AccommodationSection";
import GallerySection from "./sections/GallerySection";
import RsvpSection from "./sections/RsvpSection";

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

export default function PublicInvitation() {
  const location = useLocation();
  const { inviteToken } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const isInviteMode = searchParams.has("invitar");

  const {
    config, isConfigLoading, configLoadError, formattedDate, formattedTime, calendarLink,
    rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    locationMapContainerRef, locationMapError, setLocationMapError,
    locationMapLoading, setLocationMapLoading, locationMapTarget, setLocationMapTarget,
    handleRsvpSubmit, updateRsvpField,
    isAdminTokenLoggedIn,
    handleDietaryToggle, DIETARY_OPTIONS,
  } = useApp();

  const hiddenSet = useMemo(() => {
    const raw = config.hiddenSections || "";
    return new Set(raw.split(",").filter(Boolean));
  }, [config.hiddenSections]);

  const sectionOrder = useMemo(() => {
    const parsed = parseSectionOrder(config.sectionOrder);
    if (isAdminTokenLoggedIn || isInviteMode) {
      return parsed.includes("rsvp") ? parsed : [...parsed, "rsvp"];
    }
    return parsed;
  }, [config.sectionOrder, isAdminTokenLoggedIn, isInviteMode]);
  const showRsvp = isAdminTokenLoggedIn || isInviteMode;
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
  const visibleOrderRef = useRef(visibleOrder);
  useEffect(() => { visibleOrderRef.current = visibleOrder; }, [visibleOrder]);

  const [activeStorySection, setActiveStorySection] = useState("hero");
  useEffect(() => {
    if (!visibleOrder.includes(activeStorySection) && visibleOrder.length > 0) {
      setActiveStorySection(visibleOrder[0]);
    }
  }, [visibleOrder, activeStorySection]);
  const [storyTransition, setStoryTransition] = useState({
    fromIndex: 0,
    toIndex: null,
    direction: 1,
  });
  const activeStorySectionRef = useRef(activeStorySection);
  const storyTransitionRef = useRef({
    fromIndex: 0,
    toIndex: null,
    direction: 1,
  });

  const isStoryTransitioning = storyTransition.toIndex !== null;

  const [countdown, setCountdown] = useState(null);

  const weddingDate = useMemo(() => {
    const day = Number.parseInt(config.weddingDay, 10);
    const month = MONTH_VALUE_TO_NUMBER[config.weddingMonth];
    const year = Number.parseInt(config.weddingYear, 10);
    const hour = Number.parseInt(config.weddingHour, 10);
    const minute = Number.parseInt(config.weddingMinute, 10);
    if (!day || !month || !year || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return new Date(year, month - 1, day, hour, minute);
  }, [config]);

  useEffect(() => {
    if (!weddingDate) return;
    const tick = () => {
      const diff = weddingDate.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, expired: true });
        return;
      }
      setCountdown({
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

  const getStorySectionStyle = useCallback((sectionKey) => {
    const order = visibleOrderRef.current;
    const sectionIndex = order.indexOf(sectionKey);
    const activeIndex = order.indexOf(activeStorySection);
    const { fromIndex, toIndex, direction } = storyTransition;

    if (toIndex === null) {
      const isActive = sectionIndex === activeIndex;
      return {
        opacity: isActive ? 1 : 0,
        transform: isActive ? "translateY(0) scale(1)" : "translateY(36px) scale(0.985)",
        pointerEvents: isActive ? "auto" : "none",
        zIndex: isActive ? 2 : 1,
      };
    }

    if (sectionIndex === fromIndex) {
      return {
        opacity: 0,
        transform: `translateY(${direction > 0 ? -32 : 32}px) scale(0.985)`,
        pointerEvents: "auto",
        zIndex: 3,
      };
    }

    if (sectionIndex === toIndex) {
      return {
        opacity: 1,
        transform: "translateY(0) scale(1)",
        pointerEvents: "auto",
        zIndex: 4,
      };
    }

    return {
      opacity: 0,
      transform: "translateY(44px) scale(0.97)",
      pointerEvents: "none",
      zIndex: 1,
    };
  }, [activeStorySection, storyTransition]);

  const getStorySectionClassName = useCallback((sectionKey) => {
    const order = visibleOrderRef.current;
    const sectionIndex = order.indexOf(sectionKey);
    const activeIndex = order.indexOf(activeStorySection);
    const { fromIndex, toIndex } = storyTransition;

    const isActiveSection = sectionIndex === activeIndex;
    const isTransitionSection = toIndex !== null && (sectionIndex === fromIndex || sectionIndex === toIndex);

    return [
      "story-section",
      `story-section--${sectionKey}`,
      isActiveSection || isTransitionSection ? "story-section--is-active" : "",
    ].filter(Boolean).join(" ");
  }, [activeStorySection, storyTransition]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    let touchStartY = null;
    let transitionTimeoutId = null;

    const setTransitionState = (nextState) => {
      storyTransitionRef.current = nextState;
      setStoryTransition(nextState);
    };

    const startTransition = (direction) => {
      if (storyTransitionRef.current.toIndex !== null) return;

      const order = visibleOrderRef.current;
      const currentIndex = order.indexOf(activeStorySectionRef.current);
      const targetIndex = Math.max(0, Math.min(order.length - 1, currentIndex + direction));
      if (targetIndex === currentIndex) return;

      setTransitionState({ fromIndex: currentIndex, toIndex: targetIndex, direction });

      if (transitionTimeoutId) window.clearTimeout(transitionTimeoutId);

      transitionTimeoutId = window.setTimeout(() => {
        const completedSection = order[targetIndex];
        activeStorySectionRef.current = completedSection;
        setActiveStorySection(completedSection);
        setTransitionState({ fromIndex: targetIndex, toIndex: null, direction });
      }, 650);
    };

    const IGNORE_SELECTOR = "input, textarea, select, [contenteditable]";

    const handleWheel = (event) => {
      if (event.target.closest(IGNORE_SELECTOR)) return;
      const card = event.target.closest(".story-card");
      if (card) {
        const { scrollTop, scrollHeight, clientHeight } = card;
        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
        if (event.deltaY < 0 && !atTop) return;
        if (event.deltaY > 0 && !atBottom) return;
      }
      if (event.deltaY === 0) return;
      startTransition(event.deltaY > 0 ? 1 : -1);
    };

    const handleKeyDown = (event) => {
      if (event.target.closest(IGNORE_SELECTOR)) return;
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        startTransition(1);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        startTransition(-1);
      }
    };

    const handleTouchStart = (event) => {
      if (event.target.closest(IGNORE_SELECTOR)) {
        touchStartY = null;
        return;
      }
      touchStartY = event.touches[0]?.clientY ?? null;
    };

    const handleTouchEnd = (event) => {
      const touchEndY = event.changedTouches[0]?.clientY ?? null;
      if (touchStartY === null || touchEndY === null) return;

      const distance = touchStartY - touchEndY;
      if (Math.abs(distance) >= 28) {
        startTransition(distance > 0 ? 1 : -1);
      }
      touchStartY = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      if (transitionTimeoutId) window.clearTimeout(transitionTimeoutId);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    activeStorySectionRef.current = activeStorySection;
  }, [activeStorySection]);

  useEffect(() => {
    storyTransitionRef.current = storyTransition;
  }, [storyTransition]);

  useEffect(() => {
    const place = (config.weddingPlace || "").trim();
    const container = locationMapContainerRef.current;
    const hasExactCoordinates = Boolean(getValidCoordinates(config.weddingLatitude, config.weddingLongitude));
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
        const L = (await import("leaflet")).default;
        const geocodedLocation = await resolveLocationTarget({
          place,
          latitudeValue: config.weddingLatitude,
          longitudeValue: config.weddingLongitude,
        });
        if (isCancelled || !container.isConnected) return;

        if (!geocodedLocation) {
          setLocationMapError("No pudimos localizar este lugar.");
          setLocationMapLoading(false);
          return;
        }

        setLocationMapTarget(geocodedLocation);

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
          setLocationMapError("No pudimos cargar el mapa.");
          setLocationMapLoading(false);
        }
      }
    }, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
      setLocationMapTarget(null);
      if (mapInstance) mapInstance.remove();
    };
  }, [config.weddingPlace, config.weddingLatitude, config.weddingLongitude,
      locationMapContainerRef, setLocationMapError, setLocationMapLoading, setLocationMapTarget]);

  const configuredCoordinates = getValidCoordinates(config.weddingLatitude, config.weddingLongitude);
  const hasLocationData = Boolean(config.weddingPlace || configuredCoordinates);
  const locationDescription = config.weddingPlace
    ? config.weddingPlace
    : configuredCoordinates
      ? `Coordenadas: ${configuredCoordinates.latitude}, ${configuredCoordinates.longitude}`
      : "";

  const handleAdvanceStorySection = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
  }, []);

  const showScrollHint = activeStorySection !== visibleOrder[visibleOrder.length - 1];

  const sectionProps = useMemo(() => ({
    hero: {
      firstName: config.firstName,
      secondName: config.secondName,
      inviteMessage: config.inviteMessage,
      countdown,
      couplePhoto: config.couplePhoto,
      musicUrl: config.musicUrl,
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
      galleryImages: config.galleryImages,
    },
    rsvp: {
      rsvpForm,
      rsvpEntries,
      rsvpMessage,
      isRsvpSubmitting,
      hasSubmitted,
      updateRsvpField,
      handleRsvpSubmit,
      handleDietaryToggle,
      DIETARY_OPTIONS,
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
    config.transportInfo, config.godparent1, config.godparent2, config.galleryImages,
    config.couplePhoto, config.musicUrl, config.bankInfo, config.menuEnabled,
    countdown, formattedDate, formattedTime,
    hasLocationData, locationDescription, calendarLink,
    locationMapContainerRef, locationMapLoading, locationMapError, locationMapTarget,
    rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    updateRsvpField, handleRsvpSubmit, handleDietaryToggle, DIETARY_OPTIONS,
  ]);

  const isEmpty = !config.firstName && !config.secondName && !isInviteMode;
  const hasHash = location.hash.length > 1;

  if (isConfigLoading) {
    return (
      <div className="app-scene">
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div className="w-full max-w-md text-center story-panel story-panel--hero">
            <p className="font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/60 leading-relaxed">
              Cargando invitación…
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (configLoadError) {
    return (
      <div className="app-scene">
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div className="w-full max-w-md text-center story-panel story-panel--hero">
            <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
              Wedingo
            </h1>
            <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
              No pudimos cargar tu invitación.
            </p>
            <div className="my-6 story-divider" />
            <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">
              {configLoadError}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <button className="text-sm setup-button" type="button" onClick={() => window.location.reload()}>
                Reintentar
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const showMissingToken = isEmpty && !hasHash && (Boolean(inviteToken) || isInviteMode);

  return (
    <div className={`app-scene ${isStoryTransitioning ? "app-scene--transitioning" : ""}`}>
      <div className="fixed top-0 z-0 pointer-events-none left-2 wedding-decoration--left wedding-decoration">
        <img src={eucalyptusSrc} alt="" aria-hidden="true" className="wedding-decoration__image" />
      </div>
      <div className="fixed z-0 pointer-events-none right-2 bottom-2 wedding-decoration--right wedding-decoration">
        <img src={eucalyptusSrc} alt="" aria-hidden="true" className="wedding-decoration__image" />
      </div>

      {showMissingToken ? (
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div className="w-full max-w-md text-center story-panel story-panel--hero">
            <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
              Wedingo
            </h1>
            <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
              Invitación no encontrada
            </p>
            <div className="my-6 story-divider" />
            <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">
              No encontramos una invitación con este enlace. Si crees que es un error, contacta con los anfitriones.
            </p>
          </div>
        </section>
      ) : isEmpty ? (
        <section className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg">
          <div className="w-full max-w-md text-center story-panel story-panel--hero">
            <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
              Wedingo
            </h1>
            <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
              Crea y comparte tu invitación de boda personalizada.
            </p>
            <div className="my-6 story-divider" />
            <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">
              Gestiona los datos de tu invitación, comparte un enlace único con tus invitados y recibe sus confirmaciones de asistencia.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <a href="/setup" className="text-sm setup-button">
                Crear invitación
              </a>
            </div>
          </div>
        </section>
      ) : (
        <>
          {showScrollHint ? (
        <button
          type="button"
          className="story-scroll-hint"
          onClick={handleAdvanceStorySection}
          aria-label="Ir a la siguiente sección"
        >
          <span className="story-scroll-hint__arrow" aria-hidden="true">↓</span>
        </button>
      ) : null}

          {visibleOrder.map((sectionKey) => {
            const Component = SECTION_COMPONENTS[sectionKey];
            if (!Component) return null;
            return (
              <Component
                key={sectionKey}
                style={getStorySectionStyle(sectionKey)}
                className={getStorySectionClassName(sectionKey)}
                {...sectionProps[sectionKey]}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
