import { STORY_SECTION_ORDER, THEME_VALUES, MAX_SCHEDULE_EVENTS, MAX_SCHEDULE_EVENT_TEXT } from "./constants";
import { parseMenuDishes } from "./menu-utils";
import { serializeDisabledAnimations, parseDisabledAnimations } from "./animations";
import { safeSocialUrl, safeHref } from "./safe-href";

/** Fuentes permitidas para el usuario (lista blanca, alineadas con FONT_OPTIONS
 *  de constants.ts). Cualquier otro valor (incluido CSS arbitrario) se descarta
 *  por seguridad anti-inyección. */
const ALLOWED_FONTS = new Set(["playfair", "lora", "georgia", "times", "great-vibes", "open-dyslexic"]);
function normalizeFont(value: unknown): string {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ALLOWED_FONTS.has(v) ? v : "";
}

/** Valida un color hex (#RRGGBB o #RGB). Cualquier otro formato se desecha. */
function normalizeColor(value: unknown): string {
  const v = typeof value === "string" ? value.trim() : "";
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : "";
}

/** Modos de visualización del mapa (iframe por defecto). */
const MAP_MODES = new Set(["iframe", "name", "hidden"]);
function normalizeMapMode(value: unknown): string {
  return typeof value === "string" && MAP_MODES.has(value) ? value : "iframe";
}

function normalizeMenuDishes(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  // El parseo de platos se comparte con el editor y la sección RSVP.
  const dishes = parseMenuDishes(value);
  // JSON inválido o sin platos válidos → campo vacío (como antes).
  return dishes.length ? JSON.stringify(dishes) : "";
}

function normalizeScheduleEvents(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return "";
    const cleaned = parsed
      .slice(0, MAX_SCHEDULE_EVENTS)
      .map((e) => {
        if (!e || typeof e !== "object") return null;
        const time =
          typeof (e as Record<string, unknown>).time === "string"
            ? ((e as Record<string, unknown>).time as string).trim().slice(0, 5)
            : "";
        const text =
          typeof (e as Record<string, unknown>).text === "string"
            ? ((e as Record<string, unknown>).text as string).trim().slice(0, MAX_SCHEDULE_EVENT_TEXT)
            : "";
        const emoji =
          typeof (e as Record<string, unknown>).emoji === "string"
            ? ((e as Record<string, unknown>).emoji as string).trim().slice(0, 8)
            : "";
        return { time, text, emoji };
      })
      .filter((e): e is { time: string; text: string; emoji: string } => e !== null);
    return JSON.stringify(cleaned);
  } catch {
    return "";
  }
}

function normalizeTransportDepartures(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return "";
    const cleaned = parsed
      .slice(0, 4)
      .map((d) => {
        if (!d || typeof d !== "object") return null;
        const time =
          typeof (d as Record<string, unknown>).time === "string"
            ? ((d as Record<string, unknown>).time as string).trim().slice(0, 5)
            : "";
        const url =
          typeof (d as Record<string, unknown>).url === "string"
            ? ((d as Record<string, unknown>).url as string).trim().slice(0, 1000)
            : "";
        const type = (d as Record<string, unknown>).type === "taxi" ? "taxi" : "bus";
        return { type, time, url };
      })
      .filter((d): d is { type: "bus" | "taxi"; time: string; url: string } => d !== null);
    return JSON.stringify(cleaned);
  } catch {
    return "";
  }
}

const s = (v: unknown) => {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return String(v[0] ?? "");
  return "";
};

/**
 * Sanea texto libre (campos de contenido) para que sea aceptado por las reglas
 * de Firestore (isSafeText): las comillas dobles y los acentos graves no son
 * peligrosos porque React escapa el render, pero la regla los rechaza, y un
 * texto normal de boda los usa con frecuencia ("Dijeron «sí quiero»" o un
 * backtick al citar código). Se sustituyen por variantes tipográficas seguras:
 * comillas dobles → « » (abriendo/cerrando alternadas) y backtick → apóstrofo.
 * Los caracteres realmente peligrosos (< > y los patrones javascript:/onXxx=)
 * NO se neutralizan aquí: se validan en config-validation para avisar al
 * usuario en lugar de mutar su texto silenciosamente.
 */
function sanitizeRichText(value: unknown): string {
  const raw = s(value);
  let out = "";
  let opening = true;
  for (const ch of raw) {
    if (ch === '"') {
      out += opening ? "«" : "»";
      opening = !opening;
    } else if (ch === "`") {
      out += "'";
    } else {
      out += ch;
    }
  }
  return out;
}

/** Número de invitados esperados: entero 0..1000 ("" si vacío o inválido). */
const EXPECTED_GUESTS_MAX = 1000;
function normalizeExpectedGuests(value: unknown): string {
  const raw = s(value);
  if (!raw) return "";
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return "";
  return n > EXPECTED_GUESTS_MAX ? String(EXPECTED_GUESTS_MAX) : String(n);
}

/** Normaliza un toggle *Enabled a "true" o "false". */
const bool = (v: unknown): string => (s(v) === "true" ? "true" : "false");

/** Claves canónicas del código de vestimenta (independientes del idioma). */
const DRESS_CODE_KEYS = new Set(["gala", "smart-casual", "formal", "cocktail", "comfortable", "custom"]);

/** Valores legacy guardados en español → clave canónica (migración). */
const DRESS_CODE_LEGACY: Record<string, string> = {
  "Traje de gala": "gala",
  "Etiqueta informal": "smart-casual",
  "Vestimenta formal": "formal",
  "Cóctel elegante": "cocktail",
  "Ropa cómoda": "comfortable",
  Otro: "custom",
};

/**
 * Normaliza el código de vestimenta a su CLAVE canónica (antes se guardaba el
 * texto en español, atando el valor almacenado al idioma y rompiendo la
 * validación si se traducía). Los valores legacy se migran automáticamente.
 * Un valor desconocido se preserva como "custom" solo si hay texto
 * personalizado; si no, se limpia (evita mostrar una etiqueta inventada).
 */
function normalizeDressCode(value: unknown, custom: unknown): string {
  const raw = s(value);
  if (!raw) return "";
  if (DRESS_CODE_KEYS.has(raw)) return raw;
  if (DRESS_CODE_LEGACY[raw]) return DRESS_CODE_LEGACY[raw];
  return s(custom) ? "custom" : "";
}

/** Normaliza un toggle *Enabled con compatibilidad para invitaciones ya
 *  guardadas: si el toggle no viene definido (config antigua) se activa solo
 *  si el campo de contenido asociado tiene valor. */
const toggleWithLegacy = (enabled: unknown, content: unknown): string =>
  enabled !== undefined ? bool(enabled) : s(content) ? "true" : "false";

export const normalizeConfig = (value: Record<string, unknown> | undefined) => ({
  adminUsername: s(value?.adminUsername).toLowerCase(),
  expectedGuests: normalizeExpectedGuests(value?.expectedGuests),
  firstName: s(value?.firstName),
  secondName: s(value?.secondName),
  inviteMessage: sanitizeRichText(value?.inviteMessage),
  inviteMessageEnabled: toggleWithLegacy(value?.inviteMessageEnabled, value?.inviteMessage),
  weddingPlace: s(value?.weddingPlace),
  weddingDay: s(value?.weddingDay),
  weddingMonth: s(value?.weddingMonth),
  weddingYear: s(value?.weddingYear),
  weddingHour: s(value?.weddingHour),
  weddingMinute: s(value?.weddingMinute),
  weddingScheduleEvents: normalizeScheduleEvents(value?.weddingScheduleEvents),
  weddingDressCode: normalizeDressCode(value?.weddingDressCode, value?.weddingDressCodeCustom),
  weddingDressCodeEnabled: toggleWithLegacy(value?.weddingDressCodeEnabled, value?.weddingDressCode),
  weddingDressCodeCustom: s(value?.weddingDressCodeCustom),
  theme: typeof value?.theme === "string" && THEME_VALUES.has(value.theme.trim()) ? value.theme.trim() : "golden",
  // Personalización: solo se aceptan fuentes de una lista blanca (no se puede
  // inyectar CSS arbitrario) y colores hex válidos (pattern #RRGGBB).
  fontHeading: normalizeFont(value?.fontHeading),
  fontBody: normalizeFont(value?.fontBody),
  colorAccent: normalizeColor(value?.colorAccent),
  colorTitle: normalizeColor(value?.colorTitle),
  colorCopy: normalizeColor(value?.colorCopy),
  colorBackground: normalizeColor(value?.colorBackground),
  couplePhoto: s(value?.couplePhoto),
  couplePhotoEnabled: toggleWithLegacy(value?.couplePhotoEnabled, value?.couplePhoto),
  sectionOrder: (() => {
    const stored = typeof value?.sectionOrder === "string" ? value.sectionOrder.trim() : "";
    const parts = stored ? stored.split(",").filter(Boolean) : [];
    const seen = new Set(parts);
    for (const sec of STORY_SECTION_ORDER) {
      if (!seen.has(sec)) parts.push(sec);
    }
    return parts.join(",");
  })(),
  // Secciones ocultas: se filtran contra el registro canónico para que un
  // valor legacy (p. ej. "extras", sección eliminada en v2.124.1) no invalide
  // el guardado completo del formulario (errors.hiddenSectionsInvalid) ni
  // oculte secciones por error. Las desconocidas se descartan; las válidas
  // se conservan en su orden.
  hiddenSections: (() => {
    const stored = typeof value?.hiddenSections === "string" ? value.hiddenSections.trim() : "";
    const validSet = new Set(STORY_SECTION_ORDER);
    return stored
      .split(",")
      .map((sec) => sec.trim())
      .filter((sec) => sec && validSet.has(sec))
      .join(",");
  })(),
  // Modo sorpresa: solo "true" lo activa; las secciones se sanitizan contra
  // el orden canónico (claves desconocidas o corruptas se ignoran) para que
  // un valor inválido nunca oculte secciones por error ni filtre las válidas.
  // Idioma de la invitación: solo se aceptan es/en (los únicos disponibles);
  // cualquier otro valor se resuelve a vacío (detección automática).
  language: s(value?.language) === "en" ? "en" : s(value?.language) === "es" ? "es" : "",
  // Animaciones desactivadas: se sanitizan contra el registro canónico (solo
  // ids válidos, ordenados y deduplicados) para que un valor corrupto o de
  // una versión antigua no aplique toggles inexistentes.
  disabledAnimations: serializeDisabledAnimations(
    parseDisabledAnimations(typeof value?.disabledAnimations === "string" ? value.disabledAnimations : undefined),
  ),
  storyText: sanitizeRichText(value?.storyText),
  storyTextEnabled: toggleWithLegacy(value?.storyTextEnabled, value?.storyText),
  giftsInfo: sanitizeRichText(value?.giftsInfo),
  giftsInfoEnabled: toggleWithLegacy(value?.giftsInfoEnabled, value?.giftsInfo),
  bankInfo: s(value?.bankInfo),
  bankInfoEnabled: toggleWithLegacy(value?.bankInfoEnabled, value?.bankInfo),
  accommodationURL: s(value?.accommodationURL),
  accommodationURLEnabled: toggleWithLegacy(value?.accommodationURLEnabled, value?.accommodationURL),
  transportEnabled: ["none", "bus", "taxi", "both"].includes(s(value?.transportEnabled))
    ? s(value?.transportEnabled)
    : "none",
  transportDepartures: normalizeTransportDepartures(value?.transportDepartures),
  godparent1: s(value?.godparent1),
  godparent2: s(value?.godparent2),
  godparentsEnabled: toggleWithLegacy(value?.godparentsEnabled, value?.godparent1 || value?.godparent2),
  musicFile: s(value?.musicFile),
  musicFileEnabled: toggleWithLegacy(value?.musicFileEnabled, value?.musicFile),
  kidsPolicy: sanitizeRichText(value?.kidsPolicy),
  kidsPolicyEnabled: toggleWithLegacy(value?.kidsPolicyEnabled, value?.kidsPolicy),
  menuEnabled: s(value?.menuEnabled) === "true" ? "true" : "false",
  privacyPolicyVersion: s(value?.privacyPolicyVersion),
  menuTextoDishes: normalizeMenuDishes(value?.menuTextoDishes),
  menuCarneDishes: normalizeMenuDishes(value?.menuCarneDishes),
  menuPescadoDishes: normalizeMenuDishes(value?.menuPescadoDishes),
  menuVeganoDishes: normalizeMenuDishes(value?.menuVeganoDishes),
  backgroundImage: s(value?.backgroundImage),
  backgroundImageEnabled: toggleWithLegacy(value?.backgroundImageEnabled, value?.backgroundImage),
  customSeal: s(value?.customSeal),
  customSealEnabled: toggleWithLegacy(value?.customSealEnabled, value?.customSeal),
  cornerDecoration: s(value?.cornerDecoration),
  cornerDecorationEnabled: toggleWithLegacy(value?.cornerDecorationEnabled, value?.cornerDecoration),
  rsvpDeadline: s(value?.rsvpDeadline).slice(0, 10),
  rsvpDeadlineEnabled: s(value?.rsvpDeadlineEnabled) === "true" ? "true" : "false",
  welcomeVideo: s(value?.welcomeVideo).slice(0, 1000),
  welcomeVideoEnabled: s(value?.welcomeVideoEnabled) === "true" ? "true" : "false",
  venueMapEnabled: s(value?.venueMapEnabled) === "true" ? "true" : "false",
  tablesEnabled: s(value?.tablesEnabled) === "true" ? "true" : "false",
  // URLs desde el hash de URL o Firestore: se validan como http(s) seguras
  // (y host whitelist para redes) para evitar `javascript:`/`data:` reflejado
  // en `href` del render (XSS). Ver safe-href.ts.
  weddingSiteURL: safeHref(s(value?.weddingSiteURL ?? value?.weddingMapUrl)),
  weddingSiteURLEnabled: toggleWithLegacy(value?.weddingSiteURLEnabled, value?.weddingSiteURL ?? value?.weddingMapUrl),
  instagramUrl: safeSocialUrl(s(value?.instagramUrl).slice(0, 1000), "instagram.com"),
  instagramEnabled: toggleWithLegacy(value?.instagramEnabled, value?.instagramUrl),
  weddingMapView: ["roadmap", "satellite", "hybrid"].includes(s(value?.weddingMapView))
    ? s(value?.weddingMapView)
    : "roadmap",
  weddingMapStatic: s(value?.weddingMapStatic) === "true" ? "true" : "false",
  detailsMapMode: normalizeMapMode(value?.detailsMapMode),
  transportMapMode: normalizeMapMode(value?.transportMapMode),
  accommodationMapMode: normalizeMapMode(value?.accommodationMapMode),
  // ── Campos de superadmin ──
  rsvpThanks: s(value?.rsvpThanks).slice(0, 500),
  verified: s(value?.verified) === "true" ? "true" : "false",
  adminNotes: s(value?.adminNotes).slice(0, 2000),
  manualExpiry: s(value?.manualExpiry).slice(0, 10),
  status: ["active", "review", "blocked"].includes(s(value?.status)) ? s(value?.status) : "active",
  tags: s(value?.tags).slice(0, 500),
  rsvpCapacity: s(value?.rsvpCapacity).slice(0, 5),
  rsvpSignatureEnabled: s(value?.rsvpSignatureEnabled) === "true" ? "true" : "false",
  rsvpContactEnabled: s(value?.rsvpContactEnabled) === "true" ? "true" : "false",
});
