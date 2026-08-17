import { memo } from "react";
import { useTranslation } from "react-i18next";
import MapEmbed from "../../components/MapEmbed";
import { isValidGoogleMapsUrl } from "../../lib/geo-utils";
import { MONTH_VALUE_TO_NUMBER } from "../../lib/constants";
import { buildIcsFile } from "../../lib/calendar-utils";
import { trackEvent } from "../../lib/analytics";
import CornerDecorations from "../../components/CornerDecorations";

const DetailsSection = memo(function DetailsSection({
  style,
  className,
  formattedDate,
  formattedTime,
  hasLocationData,
  locationDescription,
  calendarLink,
  weddingSiteURL,
  instagramUrl,
  facebookUrl,
  mapView,
  staticMap,
  detailsMapMode,
  cornerDecoration,
  weddingPlace,
  weddingDay,
  weddingMonth,
  weddingYear,
  weddingHour,
  weddingMinute,
  coupleFirstName,
  coupleSecondName,
}: {
  style?: React.CSSProperties;
  className?: string;
  formattedDate?: string;
  formattedTime?: string;
  hasLocationData: boolean;
  locationDescription?: string;
  calendarLink?: string;
  weddingSiteURL?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  mapView?: string;
  staticMap?: boolean;
  detailsMapMode?: string;
  cornerDecoration?: string;
  weddingPlace?: string;
  weddingDay?: string;
  weddingMonth?: string;
  weddingYear?: string;
  weddingHour?: string;
  weddingMinute?: string;
  coupleFirstName?: string;
  coupleSecondName?: string;
}) {
  const { t } = useTranslation();
  // Modo de visualización del mapa: iframe (por defecto), solo nombre u oculto.
  const mapMode = detailsMapMode === "name" || detailsMapMode === "hidden" ? detailsMapMode : "iframe";
  // "Cómo llegar": abre Google Maps con navegación al lugar (o a la URL del mapa).
  const directionsUrl = weddingPlace
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(weddingPlace)}`
    : weddingSiteURL || "";

  /** Descarga el evento como archivo .ics (Apple Calendar/Outlook).
   *  COMPORTAMIENTO SEGURO: si la fecha es inválida/incompleta no se genera
   *  ningún archivo (evita un .ics corrupto) y el click es un no-op visible. */
  const handleDownloadIcs = () => {
    try {
      const month = MONTH_VALUE_TO_NUMBER[weddingMonth as keyof typeof MONTH_VALUE_TO_NUMBER] || 1;
      // Fallback histórico: día/año/hora ausentes usan 1/año actual/12:00 (los
      // botones de calendario solo se muestran con fecha válida, así que este
      // camino solo aplica a invitaciones sin datos; la validación siguiente
      // impide un .ics con una fecha normalizada incorrecta).
      const day = Number(weddingDay) || 1;
      const year = Number(weddingYear) || new Date().getFullYear();
      const hour = Number(weddingHour) || 12;
      const minute = Number(weddingMinute) || 0;
      // Se valida el rollover ("31 de febrero" → fecha normalizada distinta):
      // sin fecha coherente no se construye el evento.
      const start = new Date(year, month - 1, day, hour, minute);
      if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) {
        return;
      }
      // DTEND = 1 h después del inicio (las bodas duran más, pero el evento
      // del calendario necesita un fin válido; el Date cruza el día si toca).
      const end = new Date(start.getTime() + 3600000);
      const summary = `${coupleFirstName || ""} & ${coupleSecondName || ""}`.trim();
      const ics = buildIcsFile({
        title: summary || "Boda",
        place: weddingPlace || "",
        description: `Invitación Wedingo · ${window.location.origin}${window.location.pathname}`,
        startDate: start,
        endDate: end,
        uid: `${window.location.pathname}.wedingo-ics`,
      });
      if (!ics) return;
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "invitacion.ics";
      document.body.appendChild(a);
      void trackEvent("calendar_download");
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* calendario no disponible (p. ej. URL.createObjectURL bloqueado) */
    }
  };
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
          <p className="story-note">
            {formattedTime ? t("details.timeLabel", { time: formattedTime }) : t("details.timePending")}
          </p>

          <div className="story-divider" />

          {calendarLink ? (
            <div className="story-calendar-actions">
              <a
                className="setup-button setup-button--ghost setup-button--compact"
                href={calendarLink}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                onClick={() => {
                  try {
                    trackEvent("calendar_click");
                  } catch {
                    /* analítica opcional */
                  }
                }}
              >
                {t("details.addToCalendar")}
              </a>
              <button
                type="button"
                className="setup-button setup-button--ghost setup-button--compact"
                onClick={handleDownloadIcs}
              >
                {t("details.addToIcs")}
              </button>
            </div>
          ) : null}

          <div className="story-divider" />

          {/* Redes sociales de los novios (opcional). */}
          {instagramUrl || facebookUrl ? (
            <div
              className="story-social-actions"
              style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "0.5rem" }}
            >
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  aria-label={t("details.instagramLabel")}
                  title={t("details.instagramLabel")}
                  style={{
                    color: "var(--invite-title-color)",
                    fontSize: "1.3rem",
                    textDecoration: "none",
                    opacity: 0.9,
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              ) : null}
              {facebookUrl ? (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  aria-label={t("details.facebookLabel")}
                  title={t("details.facebookLabel")}
                  style={{
                    color: "var(--invite-title-color)",
                    fontSize: "1.3rem",
                    textDecoration: "none",
                    opacity: 0.9,
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M14 8h3V5h-3a4 4 0 0 0-4 4v2H7v3h3v7h3v-7h3l1-3h-4V9a1 1 0 0 1 1-1z" />
                  </svg>
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="story-divider" />

          {mapMode !== "hidden" ? (
            <>
              <p className="story-eyebrow" style={{ fontSize: "0.82rem" }}>
                {t("details.locationLabel")}
              </p>
              {hasLocationData ? (
                <p className="story-copy">{locationDescription}</p>
              ) : (
                <p className="story-copy">{t("details.placePending")}</p>
              )}

              {mapMode === "iframe" && weddingSiteURL && isValidGoogleMapsUrl(weddingSiteURL) ? (
                <>
                  <MapEmbed mapUrl={weddingSiteURL} mapView={mapView || "roadmap"} staticMap={staticMap === true} />
                  <div className="story-map__actions" style={{ marginTop: "0.5rem" }}>
                    <a
                      className="setup-button setup-button--ghost setup-button--compact"
                      href={weddingSiteURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      {t("details.viewGoogleMaps")}
                    </a>
                    <a
                      className="setup-button setup-button--ghost setup-button--compact"
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      onClick={() => {
                        void trackEvent("directions_click");
                      }}
                    >
                      {t("details.directions")}
                    </a>
                  </div>
                </>
              ) : directionsUrl ? (
                // Sin URL de mapa embebible pero con el nombre del lugar:
                // "Cómo llegar" busca el lugar en Google Maps igualmente
                // (antes era inalcanzable para parejas con solo el nombre).
                <div className="story-map__actions" style={{ marginTop: "0.5rem" }}>
                  <a
                    className="setup-button setup-button--ghost setup-button--compact"
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    onClick={() => {
                      void trackEvent("directions_click");
                    }}
                  >
                    {t("details.directions")}
                  </a>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
});

export default DetailsSection;
