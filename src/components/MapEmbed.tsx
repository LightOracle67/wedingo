import { useTranslation } from "react-i18next";
import { isValidGoogleMapsUrl, convertToEmbedUrl } from "../lib/geo-utils";

function canEmbed(url: string): boolean {
  return url.includes('output=embed') || /^https:\/\/((www|maps)\.)?google\.(com|[a-z]{2,3})\/maps\//.test(url);
}

/**
 * Iframe de Google Maps generalizado: misma configuración para el lugar de
 * la invitación y para cualquier otra URL de mapa (p. ej. salidas de
 * transporte). Hereda las propiedades de vista y estático del invitación.
 */
export default function MapEmbed({ mapUrl, mapView = "roadmap", staticMap = false, height = 250 }: {
  mapUrl?: string;
  mapView?: string;
  staticMap?: boolean;
  height?: number;
}) {
  const { t, i18n } = useTranslation();
  const embedSrc = mapUrl && isValidGoogleMapsUrl(mapUrl) ? convertToEmbedUrl(mapUrl, mapView, i18n.language) : "";
  const showIframe = embedSrc && canEmbed(embedSrc);

  return (
    <div className="story-map-wrapper" style={{ position: "relative", minHeight: "200px", width: "80%", margin: "0 auto" }}>
      {showIframe ? (
        <>
          <iframe
            title={t("map.embedTitle")}
            src={embedSrc}
            width="100%"
            height={height}
            className="story-map-frame"
            style={{ touchAction: staticMap ? "none" : undefined }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {staticMap ? (
            <div
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, cursor: "default" }}
            />
          ) : null}
        </>
      ) : mapUrl ? (
        // Fallback accesible: la URL no es embebible, se ofrece abrirla en Google Maps.
        <div className="story-map-fallback">
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="setup-button setup-button--compact">
            {t("map.openInMaps")}
          </a>
        </div>
      ) : null}
    </div>
  );
}
