import { memo } from "react";
import { useTranslation } from "react-i18next";
import MapEmbed from "../../components/MapEmbed";
import { isValidGoogleMapsUrl, extractPlaceNameFromUrl } from "../../lib/geo-utils";
import CornerDecorations from "../../components/CornerDecorations";

interface Departure {
  type?: "bus" | "taxi";
  time: string;
  url: string;
}

const TransportSection = memo(function TransportSection({
  style, className,
  transportEnabled = "none",
  transportDepartures = "",
  mapView, staticMap,
  cornerDecoration,
}: {
  style?: React.CSSProperties;
  className?: string;
  transportEnabled?: string;
  transportDepartures?: string;
  mapView?: string;
  staticMap?: boolean;
  cornerDecoration?: string;
}) {
  const { t } = useTranslation();

  let departures: Departure[] = [];
  try {
    const parsed = JSON.parse(transportDepartures || "");
    if (Array.isArray(parsed)) departures = parsed;
  } catch { /* JSON inválido */ }

  const enabled = transportEnabled !== "none";
  const optionKey = transportEnabled === "both" ? "transport.optionBoth" : transportEnabled === "taxi" ? "transport.optionTaxi" : "transport.optionBus";

  return (
    <section
      data-story-section="transport"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card-wrap">
        <CornerDecorations src={cornerDecoration} />
        <div className="story-card story-panel story-card--info w-full text-center">
          <p className="story-eyebrow">{t("transport.sectionLabel")}</p>
          <h2 className="story-title">{t("transport.title")}</h2>

          {!enabled ? (
            <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
              {t("transport.apology")}
            </p>
          ) : (
            <>
              <p className="story-copy mt-4">{t(optionKey)}</p>

              {departures.length > 0 ? (
                <div className="story-divider" />
              ) : null}
              {departures.length > 0 ? (
                <div style={{ marginTop: "0.5rem", display: "grid", gap: "1rem" }}>
                  {departures.map((dep, i) => {
                    const valid = isValidGoogleMapsUrl(dep.url);
                    const placeName = valid ? extractPlaceNameFromUrl(dep.url) : "";
                    return (
                      <div key={i}>
                        {dep.time ? (
                          <p className="story-eyebrow" style={{ fontSize: "0.82rem" }}>
                            {dep.time} <span style={{ opacity: 0.85 }}>({t(dep.type === "taxi" ? "transport.typeTaxi" : "transport.typeBus")})</span>
                          </p>
                        ) : null}
                        {placeName ? (
                          <p className="story-note" style={{ marginTop: "0.15rem" }}>{placeName}</p>
                        ) : null}
                        {valid ? (
                          <>
                            <MapEmbed mapUrl={dep.url} mapView={mapView || "roadmap"} staticMap={staticMap === true} height={220} />
                            <div className="story-map__actions" style={{ marginTop: "0.5rem" }}>
                              <a className="setup-button setup-button--ghost setup-button--compact" href={dep.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                                {t("details.viewGoogleMaps")}
                              </a>
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
});

export default TransportSection;
