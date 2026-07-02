import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import eucalyptusSrc from "../assets/eucalyptus.png";
import heroBackdropSrc from "../assets/rings.png";
import { useApp } from "../contexts/AppContext";
import {
  buildAppleMapsUrl,
  buildGoogleMapsUrl,
  getValidCoordinates,
  resolveLocationTarget,
} from "../lib/utils";
import { STORY_SECTION_ORDER, MONTH_VALUE_TO_NUMBER } from "../lib/constants";

export default function PublicInvitation() {
  const {
    config, formattedDate, formattedTime, calendarLink,
    rsvpForm, rsvpMessage, isRsvpSubmitting,
    locationMapContainerRef, locationMapError, setLocationMapError,
    locationMapLoading, setLocationMapLoading, locationMapTarget, setLocationMapTarget,
    handleRsvpSubmit, updateRsvpField,
  } = useApp();

  const [activeStorySection, setActiveStorySection] = useState("hero");
  const [storyTransition, setStoryTransition] = useState({
    fromIndex: 0,
    toIndex: null,
    direction: 1,
  });
  const activeStorySectionRef = useRef("hero");
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

  const getStorySectionStyle = (sectionKey) => {
    const sectionIndex = STORY_SECTION_ORDER.indexOf(sectionKey);
    const activeIndex = STORY_SECTION_ORDER.indexOf(activeStorySection);
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
  };

  const getStorySectionClassName = (sectionKey) => {
    const sectionIndex = STORY_SECTION_ORDER.indexOf(sectionKey);
    const activeIndex = STORY_SECTION_ORDER.indexOf(activeStorySection);
    const { fromIndex, toIndex } = storyTransition;

    const isActiveSection = sectionIndex === activeIndex;
    const isTransitionSection = toIndex !== null && (sectionIndex === fromIndex || sectionIndex === toIndex);

    return [
      "story-section",
      `story-section--${sectionKey}`,
      isActiveSection || isTransitionSection ? "story-section--is-active" : "",
    ].filter(Boolean).join(" ");
  };

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

      const currentIndex = STORY_SECTION_ORDER.indexOf(activeStorySectionRef.current);
      const targetIndex = Math.max(0, Math.min(STORY_SECTION_ORDER.length - 1, currentIndex + direction));
      if (targetIndex === currentIndex) return;

      setTransitionState({ fromIndex: currentIndex, toIndex: targetIndex, direction });

      if (transitionTimeoutId) window.clearTimeout(transitionTimeoutId);

      transitionTimeoutId = window.setTimeout(() => {
        const completedSection = STORY_SECTION_ORDER[targetIndex];
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
    const place = config.weddingPlace.trim();
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

  const handleAdvanceStorySection = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
  };

  return (
    <div className={`app-scene ${isStoryTransitioning ? "app-scene--transitioning" : ""}`}>
      <div className="pointer-events-none absolute left-[-0.5rem] top-0 z-0 wedding-decoration wedding-decoration--left">
        <img src={eucalyptusSrc} alt="Decoración de rama de eucalipto" className="wedding-decoration__image" />
      </div>
      <div className="pointer-events-none absolute right-[-0.5rem] bottom-[-0.5rem] z-0 wedding-decoration wedding-decoration--right">
        <img src={eucalyptusSrc} alt="Decoración de rama de eucalipto" className="wedding-decoration__image" />
      </div>

      {activeStorySection !== "rsvp" ? (
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
        onClick={() => {
          const inviteLink = window.location.origin;
          const message = formattedDate
            ? `Te invitamos a la boda de ${config.firstName} & ${config.secondName}, que se celebrará el ${formattedDate}. Nos encantaría contar contigo.\n\n${inviteLink}`
            : `Te invitamos a la boda de ${config.firstName} & ${config.secondName}. Nos encantaría contar contigo.\n\n${inviteLink}`;
          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noreferrer");
        }}
        style={{ border: "none", outline: "none" }}
        className="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
        aria-label="Compartir por WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </button>

      <section
        data-story-section="hero"
        className={`${getStorySectionClassName("hero")} relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
        style={getStorySectionStyle("hero")}
      >
        <div className="invite-shell story-panel story-panel--hero relative z-10 mx-auto w-full max-w-[min(100%,38rem)] overflow-hidden rounded-[2rem] bg-transparent px-3 py-5 text-center shadow-2xl sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="relative z-20">
              <div className="relative mx-auto w-fit">
              <div className="hero-rings pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[42%]">
                <img
                  src={heroBackdropSrc}
                  alt=""
                  aria-hidden="true"
                  className="invite-rings block h-auto w-[clamp(11rem,44vw,18rem)] object-contain object-center sm:w-[clamp(13rem,34vw,20rem)]"
                />
              </div>
              <h1 className="hero-title invite-title relative z-10 text-[clamp(2rem,7vw,4.5rem)] leading-tight font-serif text-boda-texto sm:text-[clamp(2.5rem,6vw,4.75rem)] lg:text-[clamp(3rem,5vw,5.5rem)]">
                {config.firstName} & {config.secondName}
              </h1>
            </div>
            <p className="hero-message invite-copy mt-3 text-[clamp(0.95rem,2.8vw,1.25rem)] leading-relaxed font-serif text-boda-texto sm:mt-4 sm:text-[clamp(1rem,2.5vw,1.35rem)]">
              {config.inviteMessage}
            </p>
            {countdown ? (
              <div className="hero-countdown mt-6">
                <p className="text-[clamp(0.8rem,2.2vw,1rem)] font-sans tracking-widest uppercase text-boda-texto/60">
                  {countdown.expired ? "Hoy es la boda" : "Faltan"}
                </p>
                {!countdown.expired ? (
                  <p className="text-[clamp(2rem,6vw,3.5rem)] leading-tight font-serif tracking-wider text-boda-texto">
                    {countdown.days > 0 ? `${countdown.days} día${countdown.days === 1 ? "" : "s"}` : ""}
                    {countdown.days > 0 && countdown.hours > 0 ? " y " : ""}
                    {countdown.days === 0 || countdown.hours > 0 ? `${countdown.hours} hora${countdown.hours === 1 ? "" : "s"}` : ""}
                    {countdown.days === 0 && countdown.hours === 0 ? `${countdown.minutes} minuto${countdown.minutes === 1 ? "" : "s"}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-[clamp(1.5rem,4vw,2.5rem)] leading-tight font-serif text-boda-texto">¡Hoy es el gran día!</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section
        data-story-section="details"
        className={`${getStorySectionClassName("details")} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
        style={getStorySectionStyle("details")}
      >
        <div className="story-card story-panel story-card--details w-full max-w-[min(100%,40rem)] text-center">
          <p className="story-eyebrow">Fecha y lugar</p>
          <h2 className="story-title">{formattedDate || "Fecha por definir"}</h2>
          <p className="story-copy">{formattedTime ? `Hora de la celebración: ${formattedTime}` : "Horario por confirmar"}</p>
          {hasLocationData ? (
            <p className="story-copy">{locationDescription}</p>
          ) : (
            <p className="story-copy">El lugar de la celebración aparecerá aquí.</p>
          )}
          <div className="story-divider" />
          <p className="story-note">
            {formattedTime
              ? `Te esperamos para compartir este momento tan especial. Comenzamos a las ${formattedTime}. Más abajo encontrarás el mapa de ubicación.`
              : "Te esperamos para compartir este momento tan especial. Más abajo encontrarás el mapa de ubicación."}
          </p>
          {calendarLink ? (
            <div className="story-calendar-actions">
              <a
                className="setup-button setup-button--ghost setup-button--compact"
                href={calendarLink}
                target="_blank"
                rel="noreferrer"
              >
                Añadir al calendario
              </a>
            </div>
          ) : null}
          {hasLocationData ? (
            <div className="story-map">
              <div
                ref={locationMapContainerRef}
                className="story-map__canvas"
                aria-label={`Mapa de ${locationDescription || "la ubicación"}`}
              />
              {locationMapLoading ? <p className="story-map__status">Cargando el mapa...</p> : null}
              {locationMapError ? <p className="story-map__status story-map__status--error">{locationMapError}</p> : null}
              {locationMapTarget ? (
                <div className="story-map__actions">
                  <a
                    className="setup-button setup-button--ghost setup-button--compact"
                    href={buildGoogleMapsUrl(locationMapTarget)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver en Google Maps
                  </a>
                  <a
                    className="setup-button setup-button--ghost setup-button--compact"
                    href={buildAppleMapsUrl(locationMapTarget, config.weddingPlace)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver en Apple Maps
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section
        data-story-section="info"
        className={`${getStorySectionClassName("info")} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
        style={getStorySectionStyle("info")}
      >
        <div className="story-card story-panel story-card--info w-full max-w-[min(100%,40rem)] text-center">
          <>
            <p className="story-eyebrow">Itinerario</p>
            <h2 className="story-title">Horario de la celebración</h2>
            {config.weddingSchedule ? (
              <div className="mt-4 space-y-1 text-left">
                {config.weddingSchedule.split("\n").filter(Boolean).map((line, i) => {
                  const timeMatch = line.match(/^(\d{1,2}:\d{2})\s*(.*)/);
                  return (
                    <div key={i} className="flex gap-3 items-baseline">
                      {timeMatch ? (
                        <>
                          <span className="shrink-0 font-semibold text-boda-texto tabular-nums">{timeMatch[1]}</span>
                          <span className="text-boda-texto/80">{timeMatch[2]}</span>
                        </>
                      ) : (
                        <span className="text-boda-texto/80">{line}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="story-copy" style={{ fontStyle: "italic" }}>
                El horario detallado se compartirá próximamente con todos los invitados.
              </p>
            )}
          </>
          <>
            <div className="story-divider" />
            <p className="story-eyebrow">Código de vestimenta</p>
            <h3 className="story-subheading">Etiqueta sugerida</h3>
            {config.weddingDressCode ? (
              <p className="story-copy">{config.weddingDressCode}</p>
            ) : (
              <p className="story-copy" style={{ fontStyle: "italic" }}>
                El código de vestimenta se comunicará más adelante.
              </p>
            )}
          </>
        </div>
      </section>

      <section
        data-story-section="rsvp"
        className={`${getStorySectionClassName("rsvp")} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
        style={getStorySectionStyle("rsvp")}
      >
        <div className="story-card story-panel story-card--rsvp allow-select w-full max-w-[min(100%,42rem)]">
          <p className="story-eyebrow text-center">Confirmación de asistencia</p>
          <h2 className="story-title text-center">Confirma tu asistencia</h2>
          <p className="story-copy text-center">
            Tu respuesta nos ayuda a organizar cada detalle de la celebración.
          </p>

          <form className="rsvp-form" onSubmit={handleRsvpSubmit}>
            <label className="setup-label" htmlFor="rsvpName">Tu nombre</label>
            <input
              id="rsvpName"
              className="setup-input"
              value={rsvpForm.guestName}
              onChange={(e) => updateRsvpField("guestName", e.target.value.slice(0, 120))}
              placeholder="Escribe tu nombre y apellidos"
              autoComplete="off"
            />

            <div className="setup-date-grid rsvp-choice-grid">
              <div>
                <label className="setup-label" htmlFor="rsvpAttendance">¿Asistirás?</label>
                <select
                  id="rsvpAttendance"
                  className="setup-input"
                  value={rsvpForm.attendance}
                  onChange={(e) => updateRsvpField("attendance", e.target.value)}
                >
                  <option value="yes">Sí, asistiré</option>
                  <option value="no">No podré asistir</option>
                </select>
              </div>
              <div>
                <label className="setup-label" htmlFor="rsvpCompanions">Acompañantes</label>
                <input
                  id="rsvpCompanions"
                  className="setup-input"
                  type="number"
                  min="0"
                  max="10"
                  value={rsvpForm.companions}
                  onChange={(e) => updateRsvpField("companions", e.target.value)}
                  disabled={rsvpForm.attendance === "no"}
                  placeholder="Número de acompañantes"
                />
              </div>
            </div>

            <label className="setup-label" htmlFor="rsvpNote">Mensaje opcional</label>
            <textarea
              id="rsvpNote"
              className="setup-textarea"
              value={rsvpForm.note}
              onChange={(e) => updateRsvpField("note", e.target.value.slice(0, 240))}
              placeholder="Cuéntanos cualquier detalle importante (alergias, etc.)"
            />

            <div className="setup-actions">
              <button className="setup-button" type="submit" disabled={isRsvpSubmitting}>
                {isRsvpSubmitting ? "Enviando..." : "Confirmar asistencia"}
              </button>
            </div>
          </form>

          {rsvpMessage ? <p className="rsvp-feedback">{rsvpMessage}</p> : null}
        </div>
      </section>
    </div>
  );
}
