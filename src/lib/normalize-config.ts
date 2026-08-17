import { STORY_SECTION_ORDER, THEME_VALUES, MAX_SCHEDULE_EVENTS, MAX_SCHEDULE_EVENT_TEXT } from "./constants";
import { parseMenuDishes } from "./menu-utils";
import { serializeDisabledAnimations, parseDisabledAnimations } from "./animations";

/** Normaliza los campos JSON de arrays (lista de regalos, trivia): devuelve
 *  un JSON válido o "[]". */
function normalizeJsonArray(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "[]";
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? JSON.stringify(parsed) : "[]";
  } catch {
    return "[]";
  }
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
  inviteMessage: s(value?.inviteMessage),
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
  hiddenSections: s(value?.hiddenSections),
  // Modo sorpresa: solo "true" lo activa; las secciones se sanitizan contra
  // el orden canónico (claves desconocidas o corruptas se ignoran) para que
  // un valor inválido nunca oculte secciones por error ni filtre las válidas.
  surpriseMode: s(value?.surpriseMode) === "true" ? "true" : "false",
  surpriseSections: (() => {
    const raw = typeof value?.surpriseSections === "string" ? value.surpriseSections : "";
    const valid = new Set(STORY_SECTION_ORDER);
    return [...new Set(raw.split(",").map((s) => s.trim()).filter((k) => valid.has(k)))].join(",");
  })(),
  // Idioma de la invitación: solo se aceptan es/en (los únicos disponibles);
  // cualquier otro valor se resuelve a vacío (detección automática).
  language: s(value?.language) === "en" ? "en" : s(value?.language) === "es" ? "es" : "",
  // Animaciones desactivadas: se sanitizan contra el registro canónico (solo
  // ids válidos, ordenados y deduplicados) para que un valor corrupto o de
  // una versión antigua no aplique toggles inexistentes.
  disabledAnimations: serializeDisabledAnimations(
    parseDisabledAnimations(typeof value?.disabledAnimations === "string" ? value.disabledAnimations : undefined),
  ),
  storyText: s(value?.storyText),
  storyTextEnabled: toggleWithLegacy(value?.storyTextEnabled, value?.storyText),
  giftsInfo: s(value?.giftsInfo),
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
  kidsPolicy: s(value?.kidsPolicy),
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
  reactionsEnabled: s(value?.reactionsEnabled) === "true" ? "true" : "false",
  // Prueba social en vivo: por defecto VISIBLE (las invitaciones existentes no
  // tenían el campo y ya mostraban el contador); solo se oculta con "false".
  liveConfirmedEnabled: s(value?.liveConfirmedEnabled) === "false" ? "false" : "true",
  // Lista de confirmados: SOLO "true" la muestra (opt-in estricto; ausente se
  // oculta para no revelar identidades sin consentimiento explícito).
  showConfirmedPeople: s(value?.showConfirmedPeople) === "true" ? "true" : "false",
  giftsListEnabled: s(value?.giftsListEnabled) === "true" ? "true" : "false",
  giftList: normalizeJsonArray(value?.giftList),
  rideShareEnabled: s(value?.rideShareEnabled) === "true" ? "true" : "false",
  welcomeVideo: s(value?.welcomeVideo).slice(0, 1000),
  welcomeVideoEnabled: s(value?.welcomeVideoEnabled) === "true" ? "true" : "false",
  notesEnabled: s(value?.notesEnabled) === "true" ? "true" : "false",
  musicPollEnabled: s(value?.musicPollEnabled) === "true" ? "true" : "false",
  voiceNotesEnabled: s(value?.voiceNotesEnabled) === "true" ? "true" : "false",
  dayPhotosEnabled: s(value?.dayPhotosEnabled) === "true" ? "true" : "false",
  mailboxEnabled: s(value?.mailboxEnabled) === "true" ? "true" : "false",
  toastsEnabled: s(value?.toastsEnabled) === "true" ? "true" : "false",
  venueMapEnabled: s(value?.venueMapEnabled) === "true" ? "true" : "false",
  triviaEnabled: s(value?.triviaEnabled) === "true" ? "true" : "false",
  trivia: normalizeJsonArray(value?.trivia),
  weddingSiteURL: s(value?.weddingSiteURL ?? value?.weddingMapUrl),
  weddingSiteURLEnabled: toggleWithLegacy(value?.weddingSiteURLEnabled, value?.weddingSiteURL ?? value?.weddingMapUrl),
  instagramUrl: s(value?.instagramUrl).slice(0, 1000),
  instagramEnabled: toggleWithLegacy(value?.instagramEnabled, value?.instagramUrl),
  facebookUrl: s(value?.facebookUrl).slice(0, 1000),
  facebookEnabled: toggleWithLegacy(value?.facebookEnabled, value?.facebookUrl),
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
