import { MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER } from "./constants";

/**
 * Calcula la edad a partir de una fecha de nacimiento.
 * @param {string} birthDateStr - Fecha en formato YYYY-MM-DD.
 * @returns {number|null}
 */
export function isDateInPast(year: string, month: string, day: string): boolean {
  const monthIndex = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ].indexOf(month);
  if (monthIndex === -1) {
    return false;
  }
  const date = new Date(Number(year), monthIndex, Number(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = date < today;

  return result;
}

export function computeAge(birthDateStr: string) {
  if (!birthDateStr) {
    return null;
  }
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
export function validateWeddingDate(
  config: Record<string, string>,
  maxAllowedYear: number,
  hiddenSet: Set<string>,
  hasStoredConfig: boolean,
) {
  // Solo se valida la fecha si la sección "details" está VISIBLE: si el admin
  // la ocultó, el formulario no la renderiza y exigirla bloqueaba el primer
  // guardado sin forma de completarla.
  if (!hiddenSet.has("details")) {
    if (
      !config.weddingDay ||
      !config.weddingMonth ||
      !config.weddingYear ||
      !config.weddingHour ||
      !config.weddingMinute
    ) {
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
    const enteredDate = new Date(parsedYear, monthNum! - 1, parsedDay, parsedHour, parsedMinute);
    if (
      enteredDate.getDate() !== parsedDay ||
      enteredDate.getMonth() !== monthNum! - 1 ||
      enteredDate.getFullYear() !== parsedYear
    ) {
      return "errors.dateNotValid";
    }
    const today = new Date();
    today.setSeconds(0, 0);
    // Una boda ya celebrada no debe bloquear ediciones posteriores
    // (mensaje, menú, galería...): solo se exige fecha futura en el primer
    // guardado, cuando aún no hay config almacenada.
    if (!hasStoredConfig && enteredDate < today) {
      return "errors.dateBeforeToday";
    }
    // Las reglas de Firestore exigen un año con formato ^[12][0-9]{3}$: un
    // "999"/"0300" pasaría la validación de fecha pasada (en edición) pero
    // Firestore lo rechazaría con permission-denied. Se valida siempre.
    if (!/^[12][0-9]{3}$/.test(config.weddingYear)) {
      return "errors.yearInvalid";
    }
    if (Number.isNaN(parsedYear) || parsedYear > maxAllowedYear) {
      return "errors.yearTooFar";
    }
  }

  return null;
}
