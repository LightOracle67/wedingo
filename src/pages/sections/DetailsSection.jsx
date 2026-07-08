import { memo } from "react";
import { useTranslation } from "react-i18next";
import { buildGoogleMapsUrl, buildAppleMapsUrl } from "../../lib/utils";

const DetailsSection = memo(function DetailsSection({
  style, className,
  formattedDate, formattedTime, hasLocationData, locationDescription,
  calendarLink,
  locationMapContainerRef, locationMapLoading, locationMapError, locationMapTarget,
  configWeddingPlace, transportInfo,
}) {
  const { t } = useTranslation();
  return (
    <section
      data-story-section="details"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--details w-full text-center">
        <p className="story-eyebrow">{t("details.sectionLabel")}</p>
        <h2 className="story-title">{formattedDate || t("details.datePending")}</h2>
        <p className="story-copy">{formattedTime ? t("details.timeLabel", { time: formattedTime }) : t("details.timePending")}</p>
        {hasLocationData ? (
          <p className="story-copy">{locationDescription}</p>
        ) : (
          <p className="story-copy">{t("details.placePending")}</p>
        )}
        <div className="story-divider" />
        <p className="story-note">
          {formattedTime
            ? t("details.welcomeWithTime", { time: formattedTime })
            : t("details.welcomeWithoutTime")}
          </p>
        {transportInfo ? (
          <div className="story-divider" />
        ) : null}
        {transportInfo ? (
          <div style={{ marginTop: "0.5rem" }}>
            <p className="story-eyebrow" style={{ fontSize: "0.72rem" }}>{t("details.transport")}</p>
            <p className="story-note whitespace-pre-line" style={{ marginTop: "0.2rem" }}>{transportInfo}</p>
          </div>
        ) : null}
        {calendarLink ? (
          <div className="story-calendar-actions">
            <a
              className="setup-button setup-button--ghost setup-button--compact"
              href={calendarLink}
              target="_blank"
              rel="noreferrer"
            >
              {t("details.addToCalendar")}
            </a>
          </div>
        ) : null}
        {hasLocationData ? (
          <div className="story-map">
            <div
              ref={locationMapContainerRef}
              className="story-map__canvas"
              aria-label={t("details.mapAriaLabel", { location: locationDescription || t("details.placePending") })}
            />
            {locationMapLoading ? <p className="story-map__status">{t("details.mapLoading")}</p> : null}
            {locationMapError ? <p className="story-map__status story-map__status--error">{locationMapError}</p> : null}
            {locationMapTarget ? (
              <div className="story-map__actions">
                <a
                  className="setup-button setup-button--ghost setup-button--compact"
                  href={buildGoogleMapsUrl(locationMapTarget)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("details.viewGoogleMaps")}
                </a>
                <a
                  className="setup-button setup-button--ghost setup-button--compact"
                  href={buildAppleMapsUrl(locationMapTarget, configWeddingPlace)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("details.viewAppleMaps")}
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
