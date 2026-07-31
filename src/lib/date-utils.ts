import { MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER } from "./constants";

/**
 * Calcula la edad a partir de una fecha de nacimiento.
 * @param {string} birthDateStr - Fecha en formato YYYY-MM-DD.
 * @returns {number|null}
 */
export function isDateInPast(year: string, month: string, day: string): boolean {
  const monthIndex = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"].indexOf(month);
  if (monthIndex === -1) {
    console.log("[app]", "[date-utils]", "isDateInPast: invalid month", { year, month, day });
    return false;
  }
  const date = new Date(Number(year), monthIndex, Number(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = date < today;
  console.log("[app]", "[date-utils]", "isDateInPast", { year, month, day, date: date.toISOString(), result });
  return result;
}

export function computeAge(birthDateStr: string) {
  if (!birthDateStr) {
    console.log("[app]", "[date-utils]", "computeAge: empty input");
    return null;
  }
  const birth = new Date(birthDateStr + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  console.log("[app]", "[date-utils]", "computeAge", { input: birthDateStr, birth: birth.toISOString(), age });
  return age;
}

/**
 * Valida los campos de fecha de una configuración de boda.
 * @param {object} config - Configuración con weddingDay, weddingMonth, weddingYear, etc.
 * @param {number} maxAllowedYear - Año máximo permitido.
 * @param {Set} hiddenSet - Secciones ocultas.
 * @param {boolean} hasStoredConfig - Si ya hay configuración guardada.
 * @returns {string|null} Mensaje de error o null si es válido.
 */
export function validateWeddingDate(config: Record<string, string>, maxAllowedYear: number, hiddenSet: Set<string>, hasStoredConfig: boolean) {
  if (!hiddenSet.has("details") || !hasStoredConfig) {
    if (!config.weddingDay || !config.weddingMonth || !config.weddingYear || !config.weddingHour || !config.weddingMinute) {
      console.log("[app]", "[date-utils]", "validateWeddingDate: incomplete", { config });
      return "errors.dateIncomplete";
    }
    const parsedDay = Number.parseInt(config.weddingDay, 10);
    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      console.log("[app]", "[date-utils]", "validateWeddingDate: invalid day", { day: config.weddingDay });
      return "errors.dayInvalid";
    }
    if (!MONTH_OPTIONS.some((m) => m.value === config.weddingMonth)) {
      console.log("[app]", "[date-utils]", "validateWeddingDate: invalid month", { month: config.weddingMonth });
      return "errors.monthInvalid";
    }
    const parsedHour = Number.parseInt(config.weddingHour, 10);
    if (Number.isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23) {
      console.log("[app]", "[date-utils]", "validateWeddingDate: invalid hour", { hour: config.weddingHour });
      return "errors.hourInvalid";
    }
    const parsedMinute = Number.parseInt(config.weddingMinute, 10);
    if (Number.isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
      console.log("[app]", "[date-utils]", "validateWeddingDate: invalid minute", { minute: config.weddingMinute });
      return "errors.minuteInvalid";
    }
    const parsedYear = Number.parseInt(config.weddingYear, 10);
    const monthNum = MONTH_VALUE_TO_NUMBER[config.weddingMonth];
    const enteredDate = new Date(parsedYear, monthNum! - 1, parsedDay, parsedHour, parsedMinute);
    if (enteredDate.getDate() !== parsedDay || enteredDate.getMonth() !== monthNum! - 1 || enteredDate.getFullYear() !== parsedYear) {
      console.log("[app]", "[date-utils]", "validateWeddingDate: date not valid", { parsedDay, parsedYear, monthNum, enteredDate: enteredDate.toISOString() });
      return "errors.dateNotValid";
    }
    const today = new Date();
    today.setSeconds(0, 0);
    if (enteredDate < today) {
      console.log("[app]", "[date-utils]", "validateWeddingDate: date before today", { enteredDate: enteredDate.toISOString() });
      return "errors.dateBeforeToday";
    }
    if (Number.isNaN(parsedYear) || parsedYear > maxAllowedYear) {
      console.log("[app]", "[date-utils]", "validateWeddingDate: year too far", { parsedYear, maxAllowedYear });
      return "errors.yearTooFar";
    }
  }
  console.log("[app]", "[date-utils]", "validateWeddingDate: valid", { config });
  return null;
}

/**
 * Convierte los campos de fecha de configuración a un objeto Date.
 * @param {object} config - Configuración con weddingDay, weddingMonth, weddingYear, weddingHour, weddingMinute.
 * @returns {Date|null}
 */
export function parseWeddingDate(config: Record<string, string>) {
  if (!config.weddingDay || !config.weddingMonth || !config.weddingYear) return null;
  const monthNum = MONTH_VALUE_TO_NUMBER[config.weddingMonth];
  if (!monthNum) return null;
  return new Date(
    Number.parseInt(config.weddingYear, 10),
    monthNum - 1,
    Number.parseInt(config.weddingDay, 10),
    Number.parseInt(config.weddingHour || "0", 10),
    Number.parseInt(config.weddingMinute || "0", 10),
  );
}
