/**
 * Utilidades puras de la pestaña Gestión.
 *
 * Se separan de ManageTab las funciones que solo transforman datos (sin
 * tocar Firestore ni el estado del componente), para cubrirlas con tests
 * unitarios aislados.
 */

import { MONTH_VALUE_TO_NUMBER } from "../../lib/constants";

/** Datos de la invitación necesarios para construir el archivo de calendario. */
export interface InvitationIcsInput {
  token: string;
  weddingYear?: unknown;
  weddingMonth?: unknown;
  weddingDay?: unknown;
  weddingPlace?: unknown;
  firstName?: unknown;
  secondName?: unknown;
}

/**
 * Construye el contenido ICS (calendario) de la boda.
 * @returns null si falta la fecha del evento; si no, la cadena VCALENDAR.
 */
export function buildInvitationIcs(input: InvitationIcsInput): string | null {
  const year = String(input.weddingYear || "");
  const month = String(input.weddingMonth || "");
  const day = String(input.weddingDay || "");
  if (!year || !month || !day) {
    return null;
  }
  const monthNum = MONTH_VALUE_TO_NUMBER[month] || 1;
  const start = new Date(Date.UTC(Number(year), monthNum - 1, Number(day), 12, 0, 0));
  const stamp = start
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const end = new Date(start.getTime() + 3600000);
  const endIcs = end
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const place = String(input.weddingPlace || "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedingo//ES",
    "BEGIN:VEVENT",
    `UID:${input.token}@wedingo`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${stamp}`,
    `DTEND:${endIcs}`,
    `SUMMARY:${String(input.firstName || "")} & ${String(input.secondName || "")} — Boda`,
    place ? `LOCATION:${place.replace(/[\\,;\n]/g, (m) => (m === "," ? "\\," : m === ";" ? "\\;" : "\\n"))}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
