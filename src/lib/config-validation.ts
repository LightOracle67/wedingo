import { normalizeConfig } from "./normalize-config";
import { validateWeddingDate } from "./date-utils";
import { isValidGoogleMapsUrl, extractPlaceNameFromUrl } from "./geo-utils";
import { isValidIBAN } from "./iban-utils";
import { safeSocialUrl } from "./safe-href";
import {
  STORY_SECTION_ORDER,
  THEME_VALUES,
  SPECIAL_SECTIONS,
  MAX_USERNAME_LENGTH,
  MAX_INVITE_MESSAGE_LENGTH,
  MAX_DRESS_CODE_CUSTOM_LENGTH,
  MAX_LONG_TEXT_LENGTH,
} from "./constants";

interface ConfigValidationResult {
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
  const hiddenArray = (sanitized.hiddenSections || "")
    .split(",")
    .filter(Boolean)
    .filter((s: string) => !SPECIAL_SECTIONS.includes(s));
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

  const orderArray = (sanitized.sectionOrder || "")
    .split(",")
    .filter(Boolean)
    .filter((s: string) => !SPECIAL_SECTIONS.includes(s));
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
    // Al menos una opción de menú (edición por platos). El postre forma parte
    // de los platos (order: "postre"), no es un campo aparte.
    // "[]" es un array vacío (truthy como string): se valida el contenido.
    const hasDishes = (value: string | undefined) => {
      if (!value) return false;
      try {
        return (JSON.parse(value) as unknown[]).length > 0;
      } catch {
        return value.length > 0;
      }
    };
    const hasMenuOption =
      hasDishes(sanitized.menuCarneDishes) ||
      hasDishes(sanitized.menuPescadoDishes) ||
      hasDishes(sanitized.menuVeganoDishes);
    if (!hasMenuOption) {
      return { sanitized, hiddenSet, errorKey: "errors.menuRequired" };
    }
  }

  if (sanitized.bankInfo) {
    const upper = sanitized.bankInfo.toUpperCase();
    const looksLikeIban = /^[A-Z]{2}\d/.test(upper);
    if (looksLikeIban && !isValidIBAN(sanitized.bankInfo)) {
      return { sanitized, hiddenSet, errorKey: "errors.ibanInvalid" };
    }
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
  // Código de vestimenta: la opción "Otro" exige un mensaje personalizado
  // no vacío y acotado a MAX_DRESS_CODE_CUSTOM_LENGTH.
  if (sanitized.weddingDressCode === "custom") {
    if (!sanitized.weddingDressCodeCustom.trim()) {
      return { sanitized, hiddenSet, errorKey: "errors.dressCodeCustomRequired" };
    }
    if (sanitized.weddingDressCodeCustom.length > MAX_DRESS_CODE_CUSTOM_LENGTH) {
      return {
        sanitized,
        hiddenSet,
        errorKey: "errors.dressCodeCustomTooLong",
        errorParams: { max: MAX_DRESS_CODE_CUSTOM_LENGTH },
      };
    }
  } else if (sanitized.weddingDressCodeCustom) {
    // Si se elige una opción predefinida, el texto personalizado se descarta.
    sanitized.weddingDressCodeCustom = "";
  }
  if (sanitized.weddingScheduleEvents) {
    // normalizeConfig garantiza un array JSON válido y acotado; solo se
    // valida aquí el formato de la hora de cada evento.
    const parsed = JSON.parse(sanitized.weddingScheduleEvents) as Array<Record<string, unknown>>;
    for (const ev of parsed) {
      const time = String(ev.time || "");
      if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return { sanitized, hiddenSet, errorKey: "errors.scheduleEventTimeInvalid" };
      }
    }
  }
  if (sanitized.storyText && sanitized.storyText.length > MAX_LONG_TEXT_LENGTH) {
    return { sanitized, hiddenSet, errorKey: "errors.storyTooLong" };
  }
  if (sanitized.giftsInfo && sanitized.giftsInfo.length > MAX_LONG_TEXT_LENGTH) {
    return { sanitized, hiddenSet, errorKey: "errors.giftsTooLong" };
  }
  if (sanitized.transportDepartures) {
    // normalizeConfig garantiza un array JSON válido; solo se valida hora y URL.
    const parsed = JSON.parse(sanitized.transportDepartures) as Array<Record<string, unknown>>;
    for (const dep of parsed) {
      const time = String(dep.time || "");
      const url = String(dep.url || "");
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return { sanitized, hiddenSet, errorKey: "errors.transportTimeInvalid" };
      }
      if (url && !isValidGoogleMapsUrl(url)) {
        return { sanitized, hiddenSet, errorKey: "errors.transportUrlInvalid" };
      }
    }
  }
  if (sanitized.accommodationURL && !isValidGoogleMapsUrl(sanitized.accommodationURL)) {
    return { sanitized, hiddenSet, errorKey: "errors.accommodationUrlInvalid" };
  }
  // URL de mapa del lugar de la boda: si se rellena debe ser una URL de
  // Google Maps válida (de lo contrario el mapa nunca se muestra y el admin
  // cree que todo se guardó bien).
  if (sanitized.weddingSiteURL && !isValidGoogleMapsUrl(sanitized.weddingSiteURL)) {
    return { sanitized, hiddenSet, errorKey: "errors.mapUrlInvalid" };
  }
  // Redes sociales: si se rellenan deben ser URL válidas y de Instagram/Facebook.
  // Se valida sobre el VALOR BRUTO del formulario: normalizeConfig deja en
  // blanco ante un host sospechoso, así que para que el usuario reciba el
  // aviso (en vez de un borrado silencioso) comprobamos el input original.
  const socialUrl = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
  const instagramRaw = socialUrl(formData["instagramUrl"]);
  const facebookRaw = socialUrl(formData["facebookUrl"]);
  if (instagramRaw && !safeSocialUrl(instagramRaw, "instagram.com")) {
    return { sanitized, hiddenSet, errorKey: "errors.socialUrlInvalid" };
  }
  if (facebookRaw && !safeSocialUrl(facebookRaw, "facebook.com")) {
    return { sanitized, hiddenSet, errorKey: "errors.socialUrlInvalid" };
  }

  return { sanitized, hiddenSet, errorKey: null };
}
