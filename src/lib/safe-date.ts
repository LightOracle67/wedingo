/**
 * safe-date.ts (v2.186)
 * ─────────────────────────────────────────────────────────────
 * Utilidades de fechas unificadas. Antes existían ~9 copias del mismo
 * parseo de Timestamp de Firestore → ms (algunas ignorando los
 * nanosegundos y con bugs de zona horaria) y 4 formateadores de fecha
 * legible con reglas distintas.
 *
 * Las dos funciones clave:
 *  - firestoreMillis(raw): convierte Timestamp/Date/ISO/epoch a ms (o null).
 *  - formatDateLocalized(raw, language): fecha legible con locale PINNED a
 *    es-ES / en-US. Es el fix determinista de una carrera real: el idioma
 *    de i18n se resuelve de forma ASÍNCRONA al arrancar, y
 *    `toLocaleDateString(i18n.language)` podía ejecutarse con "es"
 *    (fallback) o "en" indistintamente según el orden de evaluación de
 *    módulos → celdas Excel/fechas de UI con formato inestable.
 *
 * @module safe-date
 */

/** Conversión de un Timestamp de Firestore a milisegundos (o null). */
function firestoreTimestampToMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    const asObj = value as {
      seconds?: unknown;
      nanoseconds?: unknown;
      toDate?: () => unknown;
      toMillis?: () => unknown;
    };
    // Firestore Timestamp: {seconds, nanoseconds} (los nanosegundos NO se
    // descartan — el epoch exacto necesita sumarlos).
    if (typeof asObj.seconds === "number") {
      const ms = asObj.seconds * 1000;
      const nanos = typeof asObj.nanoseconds === "number" ? asObj.nanoseconds : 0;
      const result = ms + nanos / 1_000_000;
      return Number.isFinite(result) ? result : null;
    }
    for (const fn of ["toMillis", "toDate"] as const) {
      const callable = asObj[fn];
      if (typeof callable === "function") {
        const out = callable.call(value as never) as number | Date | undefined;
        if (out === undefined) return null;
        if (typeof out === "number") return Number.isFinite(out) ? out : null;
        const ms = out.getTime();
        return Number.isNaN(ms) ? null : ms;
      }
    }
    return null;
  }
  return null;
}

/**
 * Normaliza cualquier representación de fecha a milisegundos (o null).
 * Acepta: Timestamp de Firestore, Date, epoch (número), ISO/cadena.
 */
export function firestoreMillis(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.getTime();
  if (typeof raw === "object") {
    const fromTs = firestoreTimestampToMillis(raw);
    if (fromTs !== null) return fromTs;
    // Objetos tipo Date ajenos (p. ej. de otra vm): aceptan getTime().
    const maybeDate = raw as { getTime?: () => number };
    if (typeof maybeDate.getTime === "function") {
      const ms = maybeDate.getTime();
      return Number.isNaN(ms) ? null : ms;
    }
    return null;
  }
  if (typeof raw === "string") {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }
  return null;
}

/**
 * Devuelve la fecha como ISO (o "" si es inválida). Útil para comparaciones
 * y para combinar con cadenas sin depender del locale.
 */
export function firestoreIso(raw: unknown): string {
  const ms = firestoreMillis(raw);
  if (ms === null) return "";
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/**
 * Formateador LOCALIZADO con locale pinneado (es-ES / en-US).
 * @param raw   Representación de fecha (Timestamp/Date/ISO/epoch).
 * @param language  Idioma de la interfaz ("es"/"es-ES"/"en"/"en-US"…).
 * @returns Fecha legible ("8/1/2026" para es, "1/8/2026" para en) o "".
 */
export function formatDateLocalized(raw: unknown, language?: string | null): string {
  const ms = firestoreMillis(raw);
  if (ms === null) return "";
  const locale = (language || "").toLowerCase().startsWith("en") ? "en-US" : "es-ES";
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale);
}
