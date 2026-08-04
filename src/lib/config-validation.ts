import { normalizeConfig } from "./normalize-config";
import { validateWeddingDate } from "./date-utils";
import { isValidGoogleMapsUrl, extractPlaceNameFromUrl } from "./geo-utils";
import {
  STORY_SECTION_ORDER,
  THEME_VALUES,
  SPECIAL_SECTIONS,
  MAX_USERNAME_LENGTH,
  MAX_INVITE_MESSAGE_LENGTH,
  MAX_LONG_TEXT_LENGTH,
  MAX_SCHEDULE_EVENTS,
  MAX_SCHEDULE_EVENT_TEXT,
  MAX_MENU_DISHES,
  MAX_MENU_DISH_TEXT,
  MENU_DISH_ORDERS,
} from "./constants";

export interface ConfigValidationResult {
  sanitized: ReturnType<typeof normalizeConfig>;
  hiddenSet: Set<string>;
  errorKey: string | null;
  errorParams?: Record<string, unknown>;
}

/**
 * Valida un formulario de invitación para su guardado.
 * No depende de i18n: devuelve la clave de error (o null) y el objeto
 * normalizado listo para persistir.
 */
export function validateConfigForSave(
  formData: Record<string, unknown>,
  hasStoredConfig: boolean,
  maxAllowedYear: number,
): ConfigValidationResult {
  const sanitized = normalizeConfig(formData);

  if (sanitized.weddingSiteURL && isValidGoogleMapsUrl(sanitized.weddingSiteURL)) {
    const derivedPlace = extractPlaceNameFromUrl(sanitized.weddingSiteURL);
    if (derivedPlace) {
      sanitized.weddingPlace = derivedPlace;
    }
  }
  const hiddenArray = (sanitized.hiddenSections || "").split(",").filter(Boolean).filter((s: string) => !SPECIAL_SECTIONS.includes(s));
  const hiddenSet = new Set(hiddenArray);

  if (!hasStoredConfig) {
    if (String(formData["_privacyConsent"]) !== "true") {
      return { sanitized, hiddenSet, errorKey: "errors.acceptPrivacyPolicy" };
    }
    if (!sanitized.adminUsername) {
      return { sanitized, hiddenSet, errorKey: "errors.usernameRequired" };
    }
    if (!/^[a-zA-Z0-9]+$/.test(sanitized.adminUsername)) {
      return { sanitized, hiddenSet, errorKey: "errors.usernameInvalid" };
    }
    if (sanitized.adminUsername.length > MAX_USERNAME_LENGTH) {
      return { sanitized, hiddenSet, errorKey: "errors.usernameTooLong" };
    }
  }

  if (!sanitized.firstName || !sanitized.secondName) {
    return { sanitized, hiddenSet, errorKey: "errors.bothNamesRequired" };
  }

  const dateErrorKey = validateWeddingDate(sanitized, maxAllowedYear, hiddenSet, hasStoredConfig);
  if (dateErrorKey) {
    return { sanitized, hiddenSet, errorKey: dateErrorKey, errorParams: { year: maxAllowedYear } };
  }

  if (!THEME_VALUES.has(sanitized.theme)) {
    return { sanitized, hiddenSet, errorKey: "errors.themeInvalid" };
  }

  const orderArray = (sanitized.sectionOrder || "").split(",").filter(Boolean).filter((s: string) => !SPECIAL_SECTIONS.includes(s));
  const validSectionKeys = new Set(STORY_SECTION_ORDER);
  if (orderArray.length < 1 || !orderArray.every((s: string) => validSectionKeys.has(s))) {
    return { sanitized, hiddenSet, errorKey: "errors.sectionOrderInvalid" };
  }
  if (!hiddenArray.every((s) => validSectionKeys.has(s))) {
    return { sanitized, hiddenSet, errorKey: "errors.hiddenSectionsInvalid" };
  }
  if (Boolean(sanitized.godparent1) !== Boolean(sanitized.godparent2)) {
    return { sanitized, hiddenSet, errorKey: "errors.godparentsRequired" };
  }
  if (orderArray[0] !== "hero") {
    return { sanitized, hiddenSet, errorKey: "errors.coverFirst" };
  }

  if (sanitized.menuEnabled === "true") {
    if (!sanitized.menuPostre) {
      return { sanitized, hiddenSet, errorKey: "errors.postreRequired" };
    }
    if (!sanitized.menuCarne && !sanitized.menuPescado && !sanitized.menuVegano) {
      return { sanitized, hiddenSet, errorKey: "errors.menuRequired" };
    }
  }

  if (sanitized.bankInfo) {
    const upper = sanitized.bankInfo.toUpperCase();
    const looksLikeIban = /^[A-Z]{2}\d/.test(upper);
    if (looksLikeIban && !/^[A-Z]{2}\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{0,4}$/.test(upper)) {
      return { sanitized, hiddenSet, errorKey: "errors.ibanInvalid" };
    }
  }

  if (sanitized.musicUrl && sanitized.musicUrl.startsWith("data:")) {
    sanitized.musicFile = sanitized.musicUrl;
    sanitized.musicUrl = "";
  }

  if (sanitized.sectionOrder) {
    const expected = STORY_SECTION_ORDER.length;
    const actual = orderArray.length;
    if (actual !== expected) {
      return { sanitized, hiddenSet, errorKey: "errors.sectionOrderMismatch", errorParams: { actual, expected } };
    }
  }

  if (sanitized.inviteMessage && sanitized.inviteMessage.length > MAX_INVITE_MESSAGE_LENGTH) {
    return { sanitized, hiddenSet, errorKey: "errors.messageTooLong" };
  }
  if (sanitized.weddingSchedule && sanitized.weddingSchedule.length > MAX_LONG_TEXT_LENGTH) {
    return { sanitized, hiddenSet, errorKey: "errors.scheduleTooLong" };
  }
  if (sanitized.weddingScheduleEvents) {
    try {
      const parsed = JSON.parse(sanitized.weddingScheduleEvents);
      if (!Array.isArray(parsed) || parsed.length > MAX_SCHEDULE_EVENTS) {
        return { sanitized, hiddenSet, errorKey: "errors.scheduleEventsInvalid" };
      }
      for (const ev of parsed) {
        if (!ev || typeof ev !== "object") {
          return { sanitized, hiddenSet, errorKey: "errors.scheduleEventsInvalid" };
        }
        const time = String((ev as Record<string, unknown>).time || "");
        const text = String((ev as Record<string, unknown>).text || "");
        if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
          return { sanitized, hiddenSet, errorKey: "errors.scheduleEventTimeInvalid" };
        }
        if (text.length > MAX_SCHEDULE_EVENT_TEXT) {
          return { sanitized, hiddenSet, errorKey: "errors.scheduleEventTextTooLong" };
        }
      }
    } catch {
      return { sanitized, hiddenSet, errorKey: "errors.scheduleEventsInvalid" };
    }
  }
  if (sanitized.storyText && sanitized.storyText.length > MAX_LONG_TEXT_LENGTH) {
    return { sanitized, hiddenSet, errorKey: "errors.storyTooLong" };
  }
  if (sanitized.giftsInfo && sanitized.giftsInfo.length > MAX_LONG_TEXT_LENGTH) {
    return { sanitized, hiddenSet, errorKey: "errors.giftsTooLong" };
  }
  if (sanitized.transportDepartures) {
    try {
      const parsed = JSON.parse(sanitized.transportDepartures);
      if (!Array.isArray(parsed) || parsed.length > 4) {
        return { sanitized, hiddenSet, errorKey: "errors.transportDeparturesInvalid" };
      }
      for (const dep of parsed) {
        if (!dep || typeof dep !== "object") {
          return { sanitized, hiddenSet, errorKey: "errors.transportDeparturesInvalid" };
        }
        const time = String((dep as Record<string, unknown>).time || "");
        const url = String((dep as Record<string, unknown>).url || "");
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
          return { sanitized, hiddenSet, errorKey: "errors.transportTimeInvalid" };
        }
        if (url && !isValidGoogleMapsUrl(url)) {
          return { sanitized, hiddenSet, errorKey: "errors.transportUrlInvalid" };
        }
      }
    } catch {
      return { sanitized, hiddenSet, errorKey: "errors.transportDeparturesInvalid" };
    }
  }
  if (sanitized.accommodationInfo && sanitized.accommodationInfo.length > MAX_LONG_TEXT_LENGTH) {
    return { sanitized, hiddenSet, errorKey: "errors.accommodationTooLong" };
  }
  if (sanitized.accommodationURL && !isValidGoogleMapsUrl(sanitized.accommodationURL)) {
    return { sanitized, hiddenSet, errorKey: "errors.accommodationUrlInvalid" };
  }
  if (sanitized.menuTexto && sanitized.menuTexto.length > MAX_LONG_TEXT_LENGTH) {
    return { sanitized, hiddenSet, errorKey: "errors.menuTextoTooLong" };
  }
  for (const dishesField of ["menuTextoDishes", "menuCarneDishes", "menuPescadoDishes", "menuVeganoDishes"]) {
    const raw = sanitized[dishesField as keyof typeof sanitized];
    if (!raw) continue;
    try {
      const parsed = JSON.parse(String(raw));
      if (!Array.isArray(parsed) || parsed.length > MAX_MENU_DISHES) {
        return { sanitized, hiddenSet, errorKey: "errors.menuDishesInvalid" };
      }
      for (const dish of parsed) {
        if (!dish || typeof dish !== "object") {
          return { sanitized, hiddenSet, errorKey: "errors.menuDishesInvalid" };
        }
        const order = String((dish as Record<string, unknown>).order || "");
        const text = String((dish as Record<string, unknown>).text || "");
        if (!MENU_DISH_ORDERS.includes(order)) {
          return { sanitized, hiddenSet, errorKey: "errors.menuDishOrderInvalid" };
        }
        if (text.length > MAX_MENU_DISH_TEXT) {
          return { sanitized, hiddenSet, errorKey: "errors.menuDishTextTooLong" };
        }
      }
    } catch {
      return { sanitized, hiddenSet, errorKey: "errors.menuDishesInvalid" };
    }
  }

  return { sanitized, hiddenSet, errorKey: null };
}
