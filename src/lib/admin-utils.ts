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

/**
 * buildAttendancePrediction — Proyección de asistencia para el dashboard.
 *
 * Estima las confirmaciones finales a partir del ritmo real de confirmaciones
 * (personas por día desde la primera respuesta) y la proximidad del evento.
 * Se aplica una tasa de conversión decreciente (los invitados que quedan
 * confirman más despacio) y un límite superior sano de 1.1× el aforo esperado.
 *
 * CASOS CATASTRÓFICOS CUBIERTOS:
 * - Sin entradas o sin fecha válida → proyección = confirmados actuales.
 * - expectedGuests = 0 (sin configurar) → % de aforo null (no se divide).
 * - Fecha ya pasada o en curso → sin días restantes → proyección = actual.
 * - Entradas sin submittedAt válido → se ignoran para el ritmo.
 * - Fechas en el futuro lejano con 0 días transcurridos → ritmo 0 (sin div/0).
 */
export function buildAttendancePrediction(
  entries: Array<{ attendance?: string; companions?: number; submittedAt?: unknown }>,
  expectedGuests: number,
  weddingTimestamp: number | null,
  now: number = Date.now(),
) {
  const confirmedPeople = entries.reduce((s, e) => s + (e.attendance === "yes" ? Number(e.companions) || 1 : 0), 0);
  // Ritmo real: personas confirmadas por día transcurrido desde la primera
  // respuesta (timestamp en ms o segundos — se normaliza por magnitud).
  const timestamps = entries
    .map((e) => e.submittedAt)
    .filter((t): t is number | Date => t !== null && t !== undefined)
    .map((t) => {
      const ms = typeof t === "number" ? t : new Date(t).getTime();
      return Number.isFinite(ms) && ms > 0 ? (ms < 1e11 ? ms * 1000 : ms) : 0;
    })
    .filter((ms) => ms > 0);
  const firstTs = timestamps.length ? Math.min(...timestamps) : now;
  const daysElapsed = Math.max(1, (now - firstTs) / 86400000);
  const pacePerDay = confirmedPeople / daysElapsed;

  const daysToWedding =
    weddingTimestamp && Number.isFinite(weddingTimestamp) ? Math.max(0, (weddingTimestamp - now) / 86400000) : 0;
  const hasFutureWedding = weddingTimestamp ? weddingTimestamp > now : false;
  // Conversión decaída: a medida que se acerca la fecha, cada día restante
  // aporta menos confirmaciones (los "de última hora" no compensan el ritmo).
  const decay = hasFutureWedding ? Math.max(0, daysToWedding) * 0.5 + 1 : 0;
  const projectedRaw = confirmedPeople + pacePerDay * decay;
  const projected = hasFutureWedding
    ? Math.min(projectedRaw, expectedGuests > 0 ? Math.ceil(expectedGuests * 1.1) : Math.ceil(projectedRaw * 1.1))
    : confirmedPeople;

  const capacityPct = expectedGuests > 0 ? Math.min(100, Math.round((confirmedPeople / expectedGuests) * 100)) : null;

  // Tendencia: comparativa de confirmaciones en los últimos 7 días vs los 7
  // anteriores (si hay suficientes datos) para el texto "sube/baja/mantiene".
  const recent7 = timestamps.filter((ms) => now - ms <= 7 * 86400000).length;
  const previous7 = timestamps.filter((ms) => now - ms > 7 * 86400000 && now - ms <= 14 * 86400000).length;
  const trend: "up" | "down" | "flat" =
    timestamps.length < 7 ? "flat" : recent7 === previous7 ? "flat" : recent7 > previous7 ? "up" : "down";

  return {
    confirmedPeople,
    projected: Math.max(confirmedPeople, Math.round(projected)),
    capacityPct,
    pacePerDay: Math.round(pacePerDay * 10) / 10,
    daysToWedding: Math.round(daysToWedding),
    hasFutureWedding,
    trend,
  };
}

/**
 * buildConfirmationsPerDay — Serie de confirmaciones "yes" por día (últimos
 * `days` días) para el mini-gráfico del dashboard. Los timestamps pueden ser
 * números (ms o segundos) o Dates; los inválidos se ignoran. Cada día se
 * etiqueta con la fecha corta local (MM-DD).
 */
export function buildConfirmationsPerDay(
  entries: Array<{ attendance?: string; submittedAt?: unknown }>,
  days = 14,
  now: number = Date.now(),
) {
  const dayStart = (ts: number) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const counts = new Map<number, number>();
  for (const e of entries) {
    if (e.attendance !== "yes") continue;
    const raw = e.submittedAt;
    if (raw === null || raw === undefined) continue;
    // Números en ms o segundos; otros valores (Date, string ISO) se parsean.
    const ms = typeof raw === "number" ? raw : raw instanceof Date ? raw.getTime() : new Date(String(raw)).getTime();
    if (!Number.isFinite(ms) || ms <= 0) continue;
    const normalized = ms < 1e11 ? ms * 1000 : ms;
    const day = dayStart(normalized);
    if (now - day < days * 86400000 && day <= now) {
      counts.set(day, (counts.get(day) || 0) + 1);
    }
  }
  const out: Array<{ day: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(dayStart(now) - i * 86400000);
    const key = dayStart(d.getTime());
    out.push({
      day: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      count: counts.get(key) || 0,
    });
  }
  return out;
}

/* formatRSVPsForCSV, groupRSVPsByAttendance, formatGuestDate, getCompanionList
 * eliminados: los exports de CSV se sustituyeron por Excel.
 * Los constructores de hojas Excel viven en ./excel-builders.ts. */
