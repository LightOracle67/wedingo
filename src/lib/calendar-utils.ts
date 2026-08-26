/**
 * calendar-utils.ts — Utilidades de calendario (RFC 5545 .ics y enlaces de
 * "añadir a calendario"). Fuente única para los botones de calendario del
 * panel y de la invitación pública.
 */

const padDatePart = (value: string | number) => String(value).padStart(2, "0");

const formatCalendarDateTime = (date: Date) =>
  `${date.getFullYear()}${padDatePart(date.getMonth() + 1)}${padDatePart(date.getDate())}T${padDatePart(date.getHours())}${padDatePart(date.getMinutes())}00`;

export const buildGoogleCalendarUrl = ({
  title,
  description,
  place,
  startDate,
  endDate,
}: {
  title: string;
  description: string;
  place: string;
  startDate: Date;
  endDate: Date;
}) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    location: place,
    dates: `${formatCalendarDateTime(startDate)}/${formatCalendarDateTime(endDate)}`,
    ctz: timezone,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Escapa texto según RFC 5545: backslash, comas, puntos y coma y saltos de
 * línea (comillas dobles no requieren escape en valores TEXT). Sin esto, una
 * dirección o un título con comas rompía el .ics (campo truncado o inválido).
 */
const escapeIcsText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/**
 * Construye el contenido de un archivo .ics (Apple Calendar / Outlook) a
 * partir de un evento. Los campos de texto se escapan (RFC 5545) y el DTEND
 * se calcula sobre un objeto Date para no romper el evento si cruza de día.
 *
 * CAUSA DE CRASH EVITADA: si `startDate` es inválido (Invalid Date) se
 * devuelve null en vez de un .ics corrupto que el calendario rechaza en
 * silencio y el botón no hace nada visible.
 */
export function buildIcsFile({
  title,
  place,
  description,
  startDate,
  endDate,
  uid,
}: {
  title: string;
  place: string;
  description: string;
  startDate: Date;
  endDate: Date;
  uid: string;
}): string | null {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedingo//Wedding//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatCalendarDateTime(startDate)}`,
    `DTEND:${formatCalendarDateTime(endDate)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    place ? `LOCATION:${escapeIcsText(place)}` : "",
    description ? `DESCRIPTION:${escapeIcsText(description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}
