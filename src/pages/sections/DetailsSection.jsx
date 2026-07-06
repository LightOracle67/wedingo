import { memo } from "react";
import { buildGoogleMapsUrl, buildAppleMapsUrl } from "../../lib/utils";

const DetailsSection = memo(function DetailsSection({
  style, className,
  formattedDate, formattedTime, hasLocationData, locationDescription,
  calendarLink,
  locationMapContainerRef, locationMapLoading, locationMapError, locationMapTarget,
  configWeddingPlace, transportInfo,
}) {
  return (
    <section
      data-story-section="details"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--details w-full text-center">
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
        {transportInfo ? (
          <div className="story-divider" />
        ) : null}
        {transportInfo ? (
          <div style={{ marginTop: "0.5rem" }}>
            <p className="story-eyebrow" style={{ fontSize: "0.72rem" }}>Transporte</p>
            <p className="story-note whitespace-pre-line" style={{ marginTop: "0.2rem" }}>{transportInfo}</p>
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
                  href={buildAppleMapsUrl(locationMapTarget, configWeddingPlace)}
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
  );
});

export default DetailsSection;
