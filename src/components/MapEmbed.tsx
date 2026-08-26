import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isValidGoogleMapsUrl, convertToEmbedUrl } from "../lib/geo-utils";

function canEmbed(url: string): boolean {
  return url.includes("output=embed") || /^https:\/\/((www|maps)\.)?google\.(com|[a-z]{2,3})\/maps\//.test(url);
}

/**
 * Iframe de Google Maps generalizado: misma configuración para el lugar de
 * la invitación y para cualquier otra URL de mapa (p. ej. salidas de
 * transporte). Hereda las propiedades de vista y estático del invitación.
 *
 * CONSENTIMIENTO (ePrivacy / LSSI-CE): el iframe de Google Maps se carga solo
 * tras la acción del invitado (clic en el botón "Cargar mapa"), porque el
 * mapa de terceros puede colocar cookies (p. ej. NID). El banner de la
 * invitación declara que no se cargan terceros sin consentimiento, así que el
 * mapa NO se carga automáticamente.
 */
export default function MapEmbed({
  mapUrl,
  mapView = "roadmap",
  staticMap = false,
  height = 250,
}: {
  mapUrl?: string;
  mapView?: string;
  staticMap?: boolean;
  height?: number;
}) {
  const { t, i18n } = useTranslation();
  // Estado local: el mapa solo se monta después del clic de consentimiento.
  const [loaded, setLoaded] = useState(false);
  const embedSrc = mapUrl && isValidGoogleMapsUrl(mapUrl) ? convertToEmbedUrl(mapUrl, mapView, i18n.language) : "";
  const showIframe = embedSrc && canEmbed(embedSrc);

  return (
    <div
      className="story-map-wrapper"
      style={{ position: "relative", minHeight: "200px", width: "80%", margin: "0 auto" }}
    >
      {showIframe ? (
        loaded ? (
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
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, cursor: "default" }} />
            ) : null}
          </>
        ) : (
          // Placeholder con consentimiento explícito: no se carga Google Maps
          // (tercero con cookies) hasta que el invitado lo solicita.
          <button
            type="button"
            className="story-map-consent"
            onClick={() => setLoaded(true)}
            style={{
              width: "100%",
              minHeight: "200px",
              height,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              background: "color-mix(in srgb, var(--invite-shell-bg, rgba(255,255,255,0.45)) 85%, transparent)",
              border: "1px solid color-mix(in srgb, var(--invite-shell-border) 70%, transparent)",
              borderRadius: "1.2rem",
              color: "var(--invite-copy-color, #c3b193)",
              fontFamily: "var(--font-body)",
              fontSize: "0.95rem",
            }}
          >
            {t("map.loadButton")}
          </button>
        )
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
