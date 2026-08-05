import { memo } from "react";
import { useTranslation } from "react-i18next";
import CornerDecorations from "../../components/CornerDecorations";
import MapEmbed from "../../components/MapEmbed";
import { isValidGoogleMapsUrl, extractPlaceNameFromUrl } from "../../lib/geo-utils";

const AccommodationSection = memo(function AccommodationSection({ style, className, accommodationURL, mapView, staticMap, accommodationMapMode, cornerDecoration }: { style?: React.CSSProperties; className?: string; accommodationURL?: string; mapView?: string; staticMap?: boolean; accommodationMapMode?: string; cornerDecoration?: string }) {
  const { t } = useTranslation();
  const url = (accommodationURL || "").trim();
  const urlValid = url ? isValidGoogleMapsUrl(url) : false;
  const placeName = urlValid ? extractPlaceNameFromUrl(url) : "";
  // Modo de visualización del mapa: iframe (por defecto), solo nombre u oculto.
  const mapMode = accommodationMapMode === "name" || accommodationMapMode === "hidden" ? accommodationMapMode : "iframe";

  return (
    <section
      data-story-section="accommodation"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card-wrap">
        <CornerDecorations src={cornerDecoration} />
        <div className="story-card story-panel story-card--info w-full text-center">
          <p className="story-eyebrow">{t("accommodation.sectionLabel")}</p>
          <h2 className="story-title">{t("accommodation.title")}</h2>
          {urlValid && mapMode !== "hidden" ? (
            <div className="mt-4">
              {placeName ? (
                <p className="story-copy" style={{ fontWeight: 600 }}>{placeName}</p>
              ) : null}
              {mapMode === "iframe" ? (
                <>
                  <div style={{ width: "80%", margin: "0.75rem auto 0" }}>
                    <MapEmbed mapUrl={url} mapView={mapView || "roadmap"} staticMap={staticMap === true} height={220} />
                  </div>
                  <div className="story-map__actions" style={{ marginTop: "0.5rem" }}>
                    <a className="setup-button setup-button--ghost setup-button--compact" href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                      {t("details.viewGoogleMaps")}
                    </a>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
              {t("accommodation.pending")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
});

export default AccommodationSection;
