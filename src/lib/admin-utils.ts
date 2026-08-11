export function calcRSVPSummary(entries: { attendance: string; companions?: number }[] | null | undefined) {
  if (!entries) return { confirmed: 0, declined: 0, pending: 0, totalGuests: 0, confirmedGuests: 0, allEntries: 0 };
  const confirmed = entries.filter((e) => e.attendance === "yes");
  const declined = entries.filter((e) => e.attendance === "no");
  const confirmedCount = confirmed.length;
  const declinedCount = declined.length;
  const guestsWithCompanions = confirmed.reduce((sum, e) => sum + (Number(e.companions) || 1), 0);
  return {
    confirmed: confirmedCount,
    declined: declinedCount,
    pending: Math.max(0, entries.length - confirmedCount - declinedCount),
    totalGuests: entries.reduce((sum, e) => sum + (e.attendance === "yes" ? Number(e.companions) || 1 : 0), 0),
    confirmedGuests: guestsWithCompanions,
    allEntries: entries.length,
  };
}

export function getDietarySummary(entries: { attendance: string; dietaryInfo?: string }[] | null | undefined) {
  if (!entries) return [];
  const confirmed = entries.filter(
    (e): e is { attendance: "yes"; dietaryInfo: string } & typeof e =>
      e.attendance === "yes" && !!e.dietaryInfo?.trim(),
  );
  if (!confirmed.length) return [];
  const counts: Record<string, number> = {};
  for (const e of confirmed) {
    const items = e.dietaryInfo
      .split(" | ")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && !s.startsWith("menú:"));
    for (const item of items) {
      counts[item] = (counts[item] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([item, count]) => ({ item, count }));
}

/* formatRSVPsForCSV, groupRSVPsByAttendance, formatGuestDate, getCompanionList
 * eliminados: los exports de CSV se sustituyeron por Excel (ver excel-utils). */

import { excelDate, type ExcelSheet } from "./excel-utils";

/** Devuelve la traducción de una clave de menú de RSVP (con fallback a la clave). */
function menuLabel(menu: string, t: (key: string) => string): string {
  if (!menu) return "";
  const key = "rsvp.menu" + menu.charAt(0).toUpperCase() + menu.slice(1);
  const label = t(key);
  return label === key ? menu : label;
}

export interface RsvpRowLike {
  guestName?: string;
  attendance?: string;
  mealChoice?: string;
  attendees?: Array<{ name: string; menu?: string; allergies?: string[] }>;
  dietaryInfo?: string;
  phone?: string;
  email?: string;
  submittedAt?: string;
  transportChoice?: string;
  transportMode?: string;
  birthDate?: string;
}

/** Construye la hoja "Asistencia" de Excel con una fila por respuesta RSVP. */
export function buildRSVPSheet(entries: RsvpRowLike[], t: (key: string) => string): ExcelSheet {
  const rows: Array<Array<string | number>> = (entries || []).map((e) => [
    e.guestName || "",
    e.attendance === "yes" ? t("attendance.attendingValue") : e.attendance === "no" ? t("attendance.notAttendingValue") : "",
    menuLabel(e.mealChoice || "", t),
    e.dietaryInfo || "",
    [e.transportChoice || "", e.transportMode && e.transportMode !== "own" ? `(${e.transportMode})` : ""].filter(Boolean).join(" "),
    e.birthDate || "",
    [e.phone, e.email].filter(Boolean).join(" / "),
    e.submittedAt ? excelDate(e.submittedAt) : "",
  ]);
  return {
    name: t("attendance.sheetAttendance"),
    headers: [
      t("attendance.tableName"),
      t("attendance.tableAttendance"),
      t("attendance.tableMenu"),
      t("attendance.tableDiet"),
      t("attendance.tableTransport"),
      t("attendance.tableBirth"),
      t("attendance.tableContact"),
      t("attendance.tableDate"),
    ],
    rows,
    colWidths: [24, 14, 20, 26, 20, 14, 28, 18],
  };
}

/** Construye la hoja "Menús" de Excel: qué plato pidió cada confirmado. */
export function buildMenuSheet(entries: RsvpRowLike[], t: (key: string) => string): ExcelSheet {
  const rows: Array<Array<string>> = [];
  for (const e of entries || []) {
    if (e.attendance === "no") continue;
    if (e.attendees && e.attendees.length > 0) {
      for (const a of e.attendees) {
        rows.push([a.name, menuLabel(a.menu || "", t)]);
      }
    } else if (e.mealChoice) {
      rows.push([e.guestName || "", menuLabel(e.mealChoice, t)]);
    }
  }
  return {
    name: t("attendance.sheetMenus"),
    headers: [t("attendance.tableName"), t("attendance.tableMenu")],
    rows,
    colWidths: [24, 22],
  };
}
