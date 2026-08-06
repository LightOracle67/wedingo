import { memo } from "react";
import { useTranslation } from "react-i18next";
import MapEmbed from "../../components/MapEmbed";
import { isValidGoogleMapsUrl } from "../../lib/geo-utils";
import { MONTH_VALUE_TO_NUMBER } from "../../lib/constants";
import { useApp } from "../../contexts";
import CornerDecorations from "../../components/CornerDecorations";

const DetailsSection = memo(function DetailsSection({
  style, className,
  formattedDate, formattedTime, hasLocationData, locationDescription,
  calendarLink,
  weddingSiteURL, instagramUrl, facebookUrl, mapView, staticMap, detailsMapMode,
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
  instagramUrl?: string;
  facebookUrl?: string;
  mapView?: string;
  staticMap?: boolean;
  detailsMapMode?: string;
  cornerDecoration?: string;
}) {
  const { t } = useTranslation();
  // Config global para generar el .ics y el enlace de navegación.
  const { config } = useApp();
  // Modo de visualización del mapa: iframe (por defecto), solo nombre u oculto.
  const mapMode = detailsMapMode === "name" || detailsMapMode === "hidden" ? detailsMapMode : "iframe";
  // "Cómo llegar": abre Google Maps con navegación al lugar (o a la URL del mapa).
  const directionsUrl = config?.weddingPlace
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(config.weddingPlace)}`
    : weddingSiteURL || "";

  /** Descarga el evento como archivo .ics (Apple Calendar/Outlook). */
  const handleDownloadIcs = () => {
    try {
      const day = Number(config?.weddingDay) || 1;
      const month = MONTH_VALUE_TO_NUMBER[config?.weddingMonth as keyof typeof MONTH_VALUE_TO_NUMBER] || 1;
      const year = Number(config?.weddingYear) || new Date().getFullYear();
      const hour = Number(config?.weddingHour) || 12;
      const minute = Number(config?.weddingMinute) || 0;
      const pad = (n: number) => String(n).padStart(2, "0");
      const dtstart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
      // DTEND = 1 h después del inicio (las bodas duran más, pero el evento
      // del calendario necesita un fin válido para no ser rechazado).
      const end = new Date(year, month - 1, day, hour, minute + 60);
      const dtend = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
      const summary = `${config?.firstName || ""} & ${config?.secondName || ""}`.trim();
      // RFC 5545: las comas y puntos y coma del texto se escapan.
      const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;");
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Wedingo//Wedding//ES",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `UID:${dtstart}-wedingo-invite`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${esc(summary)}`,
        config?.weddingPlace ? `LOCATION:${esc(config.weddingPlace)}` : "",
        "END:VEVENT",
        "END:VCALENDAR",
      ].filter(Boolean).join("\r\n");
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "invitacion.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* calendario no disponible */ }
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
          <p className="story-note">{formattedTime ? t("details.timeLabel", { time: formattedTime }) : t("details.timePending")}</p>

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
                    import("../../lib/analytics").then(({ trackEvent }) => trackEvent("calendar_click"));
                  } catch { /* analítica opcional */ }
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
            <div className="story-social-actions" style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              {instagramUrl ? (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={t("details.instagramLabel")} title={t("details.instagramLabel")}
                  style={{ color: "var(--invite-title-color)", fontSize: "1.3rem", textDecoration: "none", opacity: 0.9 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                </a>
              ) : null}
              {facebookUrl ? (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={t("details.facebookLabel")} title={t("details.facebookLabel")}
                  style={{ color: "var(--invite-title-color)", fontSize: "1.3rem", textDecoration: "none", opacity: 0.9 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 8h3V5h-3a4 4 0 0 0-4 4v2H7v3h3v7h3v-7h3l1-3h-4V9a1 1 0 0 1 1-1z"/></svg>
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="story-divider" />

          {mapMode !== "hidden" ? (
            <>
              <p className="story-eyebrow" style={{ fontSize: "0.82rem" }}>{t("details.locationLabel")}</p>
              {hasLocationData ? (
                <p className="story-copy">{locationDescription}</p>
              ) : (
                <p className="story-copy">{t("details.placePending")}</p>
              )}

              {mapMode === "iframe" && weddingSiteURL && isValidGoogleMapsUrl(weddingSiteURL) ? (
                <>
                  <MapEmbed mapUrl={weddingSiteURL} mapView={mapView || "roadmap"} staticMap={staticMap === true} />
                  <div className="story-map__actions" style={{ marginTop: "0.5rem" }}>
                    <a className="setup-button setup-button--ghost setup-button--compact" href={weddingSiteURL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                      {t("details.viewGoogleMaps")}
                    </a>
                    <a className="setup-button setup-button--ghost setup-button--compact" href={directionsUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                      {t("details.directions")}
                    </a>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
});

export default DetailsSection;
