import { MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER } from "./constants";

/**
 * Calcula la edad a partir de una fecha de nacimiento.
 * @param {string} birthDateStr - Fecha en formato YYYY-MM-DD.
 * @returns {number|null}
 */
export function computeAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
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
export function validateWeddingDate(config, maxAllowedYear, hiddenSet, hasStoredConfig) {
  if (!hiddenSet.has("details") || !hasStoredConfig) {
    if (!config.weddingDay || !config.weddingMonth || !config.weddingYear || !config.weddingHour || !config.weddingMinute) {
      return "errors.dateIncomplete";
    }
    const parsedDay = Number.parseInt(config.weddingDay, 10);
    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      return "errors.dayInvalid";
    }
    if (!MONTH_OPTIONS.some((m) => m.value === config.weddingMonth)) {
      return "errors.monthInvalid";
    }
    const parsedHour = Number.parseInt(config.weddingHour, 10);
    if (Number.isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23) {
      return "errors.hourInvalid";
    }
    const parsedMinute = Number.parseInt(config.weddingMinute, 10);
    if (Number.isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
      return "errors.minuteInvalid";
    }
    const parsedYear = Number.parseInt(config.weddingYear, 10);
    const monthNum = MONTH_VALUE_TO_NUMBER[config.weddingMonth];
    const enteredDate = new Date(parsedYear, monthNum - 1, parsedDay, parsedHour, parsedMinute);
    if (enteredDate.getDate() !== parsedDay || enteredDate.getMonth() !== monthNum - 1 || enteredDate.getFullYear() !== parsedYear) {
      return "errors.dateNotValid";
    }
    const today = new Date();
    today.setSeconds(0, 0);
    if (enteredDate < today) {
      return "errors.dateBeforeToday";
    }
    if (Number.isNaN(parsedYear) || parsedYear > maxAllowedYear) {
      return "errors.yearTooFar";
    }
  }
  return null;
}

/**
 * Convierte los campos de fecha de configuración a un objeto Date.
 * @param {object} config - Configuración con weddingDay, weddingMonth, weddingYear, weddingHour, weddingMinute.
 * @returns {Date|null}
 */
export function parseWeddingDate(config) {
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
