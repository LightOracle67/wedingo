import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

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

export default function PublicInvitation() {
  const location = useLocation();
  const { inviteToken } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const isInviteMode = searchParams.has("invitar");
  const isPrintMode = searchParams.has("imprimir");

  const {
    config, isConfigLoading, configLoadError, formattedDate, formattedTime, calendarLink,
    rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted,
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

  useEffect(() => {
    if (!isPrintMode || isConfigLoading) return;

    const printWhenReady = async () => {
      await document.fonts.ready;
      await new Promise((r) => { if (document.readyState === "complete") r(); else window.addEventListener("load", r, { once: true }); });
      await new Promise((r) => setTimeout(r, 800));
      window.onafterprint = () => window.close();
      window.print();
    };
    printWhenReady();
  }, [isPrintMode, isConfigLoading]);

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
      event.preventDefault();
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
      rsvpEntries,
      rsvpMessage,
      isRsvpSubmitting,
      hasSubmitted,
      updateRsvpField,
      handleRsvpSubmit,
    },
  }), [
    config.firstName, config.secondName, config.inviteMessage,
    config.weddingPlace, config.weddingSchedule, config.weddingDressCode, config.kidsPolicy, config.storyText, config.giftsInfo, config.accommodationInfo,
    countdown, formattedDate, formattedTime,
    hasLocationData, locationDescription, calendarLink,
    locationMapContainerRef, locationMapLoading, locationMapError, locationMapTarget,
    rsvpForm, rsvpEntries, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    updateRsvpField, handleRsvpSubmit,
  ]);

  const isEmpty = !config.firstName && !config.secondName && !isInviteMode;
  const hasHash = location.hash.length > 1;

  if (isConfigLoading) {
    return (
      <div className="app-scene">
        <section className="story-section story-section--is-active landing-bg flex min-h-screen items-center justify-center px-4">
          <div className="story-panel story-panel--hero w-full max-w-md text-center">
            <p className="text-[clamp(1rem,3vw,1.35rem)] leading-relaxed font-serif text-boda-texto/60">
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
        <section className="story-section story-section--is-active landing-bg flex min-h-screen items-center justify-center px-4">
          <div className="story-panel story-panel--hero w-full max-w-md text-center">
            <h1 className="hero-title invite-title text-[clamp(2.5rem,8vw,4.5rem)] leading-tight font-serif text-boda-texto">
              Wedingo
            </h1>
            <p className="mt-4 text-[clamp(1rem,3vw,1.35rem)] leading-relaxed font-serif text-boda-texto/80">
              No pudimos cargar tu invitación.
            </p>
            <div className="story-divider my-6" />
            <p className="text-[0.95rem] leading-relaxed text-boda-texto/60">
              {configLoadError}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button className="setup-button text-sm" type="button" onClick={() => window.location.reload()}>
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
      <div className="pointer-events-none fixed left-[-0.5rem] top-0 z-0 wedding-decoration wedding-decoration--left">
        <img src={eucalyptusSrc} alt="" aria-hidden="true" className="wedding-decoration__image" />
      </div>
      <div className="pointer-events-none fixed right-[-0.5rem] bottom-[-0.5rem] z-0 wedding-decoration wedding-decoration--right">
        <img src={eucalyptusSrc} alt="" aria-hidden="true" className="wedding-decoration__image" />
      </div>

      {showMissingToken ? (
        <section className="story-section story-section--is-active landing-bg flex min-h-screen items-center justify-center px-4">
          <div className="story-panel story-panel--hero w-full max-w-md text-center">
            <h1 className="hero-title invite-title text-[clamp(2.5rem,8vw,4.5rem)] leading-tight font-serif text-boda-texto">
              Wedingo
            </h1>
            <p className="mt-4 text-[clamp(1rem,3vw,1.35rem)] leading-relaxed font-serif text-boda-texto/80">
              Invitación no encontrada
            </p>
            <div className="story-divider my-6" />
            <p className="text-[0.95rem] leading-relaxed text-boda-texto/60">
              No encontramos una invitación con este enlace. Si crees que es un error, contacta con los anfitriones.
            </p>
          </div>
        </section>
      ) : isEmpty ? (
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
