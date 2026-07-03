import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { useApp } from "../contexts/AppContext";
import {
  getValidCoordinates,
  resolveLocationTarget,
} from "../lib/utils";
import { STORY_SECTION_ORDER, MONTH_VALUE_TO_NUMBER } from "../lib/constants";
import { encodeInviteConfig } from "../lib/utils";
import eucalyptusSrc from "../assets/eucalyptus.png";
import HeroSection from "./sections/HeroSection";
import DetailsSection from "./sections/DetailsSection";
import InfoSection from "./sections/InfoSection";
import StorySection from "./sections/StorySection";
import GiftsSection from "./sections/GiftsSection";
import AccommodationSection from "./sections/AccommodationSection";
import RsvpSection from "./sections/RsvpSection";

const SECTION_COMPONENTS = {
  hero: HeroSection,
  details: DetailsSection,
  info: InfoSection,
  story: StorySection,
  gifts: GiftsSection,
  accommodation: AccommodationSection,
  rsvp: RsvpSection,
};

function parseSectionOrder(raw) {
  const order = (raw || STORY_SECTION_ORDER.join(",")).split(",").filter(Boolean);
  return STORY_SECTION_ORDER.filter((s) => order.includes(s));
}

export default function PublicInvitation() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isInviteMode = searchParams.has("invitar");

  const {
    config, formattedDate, formattedTime, calendarLink,
    rsvpForm, rsvpMessage, isRsvpSubmitting,
    locationMapContainerRef, locationMapError, setLocationMapError,
    locationMapLoading, setLocationMapLoading, locationMapTarget, setLocationMapTarget,
    handleRsvpSubmit, updateRsvpField,
    isAdminTokenLoggedIn,
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
      if (!isAdminTokenLoggedIn && !isInviteMode) {
        filtered = filtered.filter((s) => !hiddenSet.has(s));
      }
      return filtered;
    },
    [sectionOrder, showRsvp, hiddenSet, isAdminTokenLoggedIn, isInviteMode],
  );
  const visibleOrderRef = useRef(visibleOrder);
  useEffect(() => { visibleOrderRef.current = visibleOrder; }, [visibleOrder]);

  const [activeStorySection, setActiveStorySection] = useState(visibleOrder[0] || "hero");
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
    const id = setInterval(tick, 60000);
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

    const handleWheel = (event) => {
      event.preventDefault();
      if (event.deltaY === 0) return;
      startTransition(event.deltaY > 0 ? 1 : -1);
    };

    const handleKeyDown = (event) => {
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
        const [maplibreglModule] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        const maplibregl = maplibreglModule.default;
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

        mapInstance = new maplibregl.Map({
          container,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [geocodedLocation.longitude, geocodedLocation.latitude],
          zoom: 15,
          bearing: -12,
          pitch: 35,
          interactive: false,
          attributionControl: true,
        });

        const markerElement = document.createElement("div");
        markerElement.style.width = "18px";
        markerElement.style.height = "18px";
        markerElement.style.borderRadius = "999px";
        markerElement.style.background = "#d8b24a";
        markerElement.style.border = "3px solid rgba(255, 255, 255, 0.95)";
        markerElement.style.boxShadow = "0 0 0 8px rgba(216, 178, 74, 0.18)";

        new maplibregl.Marker({ element: markerElement, anchor: "center" })
          .setLngLat([geocodedLocation.longitude, geocodedLocation.latitude])
          .addTo(mapInstance);

        mapInstance.once("load", () => {
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

  const handleWhatsAppShare = useCallback(() => {
    const configHash = encodeInviteConfig(config);
    const inviteLink = `${window.location.origin}/?invitar=1#${configHash}`;
    const message = formattedDate
      ? `${config.firstName} & ${config.secondName} te invitan a su boda, que se celebrará el ${formattedDate}. Nos encantaría contar contigo.\n\n${inviteLink}`
      : `${config.firstName} & ${config.secondName} te invitan a su boda. Nos encantaría contar contigo.\n\n${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noreferrer");
  }, [formattedDate, config.firstName, config.secondName, config]);

  const sectionProps = useMemo(() => ({
    hero: {
      firstName: config.firstName,
      secondName: config.secondName,
      inviteMessage: config.inviteMessage,
      countdown,
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
    },
    accommodation: {
      accommodationInfo: config.accommodationInfo,
    },
    rsvp: {
      rsvpForm,
      rsvpMessage,
      isRsvpSubmitting,
      updateRsvpField,
      handleRsvpSubmit,
    },
  }), [
    config.firstName, config.secondName, config.inviteMessage,
    config.weddingPlace, config.weddingSchedule, config.weddingDressCode, config.kidsPolicy, config.storyText, config.giftsInfo, config.accommodationInfo,
    countdown, formattedDate, formattedTime,
    hasLocationData, locationDescription, calendarLink,
    locationMapContainerRef, locationMapLoading, locationMapError, locationMapTarget,
    rsvpForm, rsvpMessage, isRsvpSubmitting,
    updateRsvpField, handleRsvpSubmit,
  ]);

  const isEmpty = !config.firstName && !config.secondName && !isInviteMode;

  return (
    <div className={`app-scene ${isStoryTransitioning ? "app-scene--transitioning" : ""}`}>
      <div className="pointer-events-none fixed left-[-0.5rem] top-0 z-0 wedding-decoration wedding-decoration--left">
        <img src={eucalyptusSrc} alt="" aria-hidden="true" className="wedding-decoration__image" />
      </div>
      <div className="pointer-events-none fixed right-[-0.5rem] bottom-[-0.5rem] z-0 wedding-decoration wedding-decoration--right">
        <img src={eucalyptusSrc} alt="" aria-hidden="true" className="wedding-decoration__image" />
      </div>

      {isEmpty ? (
        <section className="story-section story-section--is-active landing-bg flex min-h-screen items-center justify-center px-4">
          <div className="story-panel story-panel--hero w-full max-w-md text-center">
            <h1 className="hero-title invite-title text-[clamp(2.5rem,8vw,4.5rem)] leading-tight font-serif text-boda-texto">
              Wedingo
            </h1>
            <p className="mt-4 text-[clamp(1rem,3vw,1.35rem)] leading-relaxed font-serif text-boda-texto/80">
              Crea y comparte tu invitación de boda personalizada.
            </p>
            <div className="story-divider my-6" />
            <p className="text-[0.95rem] leading-relaxed text-boda-texto/60">
              Gestiona los datos de tu invitación, comparte un enlace único con tus invitados y recibe sus confirmaciones de asistencia.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/setup" className="setup-button text-sm">
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

      <button
        type="button"
        onClick={handleWhatsAppShare}
        style={{ border: "none", outline: "none" }}
        className="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
        aria-label="Compartir por WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </button>

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
