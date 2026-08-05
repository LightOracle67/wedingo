import { memo } from "react";
import { useTranslation } from "react-i18next";
import MapEmbed from "../../components/MapEmbed";
import { isValidGoogleMapsUrl } from "../../lib/geo-utils";
import CornerDecorations from "../../components/CornerDecorations";

const DetailsSection = memo(function DetailsSection({
  style, className,
  formattedDate, formattedTime, hasLocationData, locationDescription,
  calendarLink,
  weddingSiteURL, mapView, staticMap,
  cornerDecoration,
}: {
  style?: React.CSSProperties;
  className?: string;
  formattedDate?: string;
  formattedTime?: string;
  hasLocationData: boolean;
  locationDescription?: string;
  calendarLink?: string;
  weddingSiteURL?: string;
  mapView?: string;
  staticMap?: boolean;
  cornerDecoration?: string;
}) {
  const { t } = useTranslation();
  return (
    <section
      data-story-section="details"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card-wrap">
        <CornerDecorations src={cornerDecoration} />
        <div className="story-card story-panel story-card--details w-full text-center">
          <p className="story-eyebrow">{t("details.sectionLabel")}</p>

          <h2 className="story-title">{formattedDate || t("details.datePending")}</h2>
          <p className="story-copy">{formattedTime ? t("details.timeLabel", { time: formattedTime }) : t("details.timePending")}</p>

          <div className="story-divider" />

          {calendarLink ? (
            <div className="story-calendar-actions">
              <a
                className="setup-button setup-button--ghost setup-button--compact"
                href={calendarLink}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                {t("details.addToCalendar")}
              </a>
            </div>
          ) : null}

          <div className="story-divider" />

          <p className="story-eyebrow" style={{ fontSize: "0.82rem" }}>{t("details.locationLabel")}</p>
          {hasLocationData ? (
            <p className="story-copy">{locationDescription}</p>
          ) : (
            <p className="story-copy">{t("details.placePending")}</p>
          )}

          {weddingSiteURL && isValidGoogleMapsUrl(weddingSiteURL) ? (
            <>
              <MapEmbed mapUrl={weddingSiteURL} mapView={mapView || "roadmap"} staticMap={staticMap === true} />
              <div className="story-map__actions" style={{ marginTop: "0.5rem" }}>
                <a className="setup-button setup-button--ghost setup-button--compact" href={weddingSiteURL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                  {t("details.viewGoogleMaps")}
                </a>
              </div>
            </>
          ) : null}

          <p className="story-note" style={{ marginTop: "0.4rem" }}>
            {formattedTime
              ? t("details.welcomeWithTime", { time: formattedTime })
              : hasLocationData && locationDescription
                ? t("details.welcomeWithPlace", { place: locationDescription })
                : t("details.welcomeWithoutTime")}
          </p>
        </div>
      </div>
    </section>
  );
});

export default DetailsSection;
