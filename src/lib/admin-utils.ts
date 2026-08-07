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

/* formatRSVPsForCSV, groupRSVPsByAttendance, formatGuestDate, getCompanionList eliminados por dead code. */

/**
 * Genera un CSV de las respuestas RSVP para exportar (Excel/Sheets).
 * Los campos con comas se escapan entre comillas dobles.
 */
export function formatRSVPsForCSV(
  entries: Array<{
    guestName?: string;
    attendance?: string;
    dietaryInfo?: string;
    companionNames?: string[];
    transportChoice?: string;
    transportMode?: string;
    birthDate?: string;
    mealChoice?: string;
  }>,
): string {
  const header = ["Nombre", "Asistencia", "Acompañantes", "Alergias/Menú", "Transporte", "Fecha de nacimiento"];
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [
      e.guestName || "",
      e.attendance === "yes" ? "Sí" : e.attendance === "no" ? "No" : "",
      (e.companionNames || []).join("; "),
      e.dietaryInfo || "",
      `${e.transportChoice || ""}${e.transportMode && e.transportMode !== "own" ? ` (${e.transportMode})` : ""}`,
      e.birthDate || "",
    ]
      .map(esc)
      .join(","),
  );
  return [header.map(esc).join(","), ...rows].join("\n");
}

/**
 * Genera un CSV para el catering: qué plato eligió cada confirmado (y sus
 * acompañantes), a partir del mealChoice de cada respuesta.
 */
export function formatMenuCateringCSV(
  entries: Array<{
    guestName?: string;
    mealChoice?: string;
    companionNames?: string[];
    companionMenus?: string[];
  }>,
): string {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Nombre", "Plato"];
  const rows: string[] = [];
  for (const e of entries) {
    rows.push([e.guestName || "", e.mealChoice || "—"].map(esc).join(","));
    const comps = e.companionNames || [];
    const menus = e.companionMenus || [];
    comps.forEach((c, i) => rows.push([c, menus[i] || "—"].map(esc).join(",")));
  }
  return [header.map(esc).join(","), ...rows].join("\n");
}
