import { STORY_SECTION_ORDER, THEME_VALUES, MAX_SCHEDULE_EVENTS, MAX_SCHEDULE_EVENT_TEXT, MAX_MENU_DISHES, MAX_MENU_DISH_TEXT, MENU_DISH_ORDERS } from "./constants";

/** Modos de visualización del mapa (iframe por defecto). */
const MAP_MODES = new Set(["iframe", "name", "hidden"]);
function normalizeMapMode(value: unknown): string {
  return typeof value === "string" && MAP_MODES.has(value) ? value : "iframe";
}

function normalizeMenuDishes(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return "";
    const cleaned = parsed
      .slice(0, MAX_MENU_DISHES)
      .map((d) => {
        if (!d || typeof d !== "object") return null;
        const order = MENU_DISH_ORDERS.includes(String((d as Record<string, unknown>).order)) ? String((d as Record<string, unknown>).order) : "otro";
        const text = typeof (d as Record<string, unknown>).text === "string" ? ((d as Record<string, unknown>).text as string).trim().slice(0, MAX_MENU_DISH_TEXT) : "";
        return { order, text };
      })
      .filter((d): d is { order: string; text: string } => d !== null);
    return JSON.stringify(cleaned);
  } catch {
    return "";
  }
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
        const time = typeof (e as Record<string, unknown>).time === "string" ? ((e as Record<string, unknown>).time as string).trim().slice(0, 5) : "";
        const text = typeof (e as Record<string, unknown>).text === "string" ? ((e as Record<string, unknown>).text as string).trim().slice(0, MAX_SCHEDULE_EVENT_TEXT) : "";
        return { time, text };
      })
      .filter((e): e is { time: string; text: string } => e !== null);
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
        const time = typeof (d as Record<string, unknown>).time === "string" ? ((d as Record<string, unknown>).time as string).trim().slice(0, 5) : "";
        const url = typeof (d as Record<string, unknown>).url === "string" ? ((d as Record<string, unknown>).url as string).trim().slice(0, 1000) : "";
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

export const normalizeConfig = (value: Record<string, unknown> | undefined) => ({
  adminUsername: s(value?.adminUsername).toLowerCase(),
  firstName: s(value?.firstName),
  secondName: s(value?.secondName),
  inviteMessage: s(value?.inviteMessage),
  weddingPlace: s(value?.weddingPlace),
  weddingDay: s(value?.weddingDay),
  weddingMonth: s(value?.weddingMonth),
  weddingYear: s(value?.weddingYear),
  weddingHour: s(value?.weddingHour),
  weddingMinute: s(value?.weddingMinute),
  weddingScheduleEvents: normalizeScheduleEvents(value?.weddingScheduleEvents),
  weddingDressCode: s(value?.weddingDressCode),
  weddingDressCodeCustom: s(value?.weddingDressCodeCustom),
  theme:
    typeof value?.theme === "string" && THEME_VALUES.has(value.theme.trim())
      ? value.theme.trim()
      : "golden",
  couplePhoto: s(value?.couplePhoto),
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
  storyText: s(value?.storyText),
  giftsInfo: s(value?.giftsInfo),
  bankInfo: s(value?.bankInfo),
  accommodationURL: s(value?.accommodationURL),
  transportEnabled: ["none", "bus", "taxi", "both"].includes(s(value?.transportEnabled)) ? s(value?.transportEnabled) : "none",
  transportDepartures: normalizeTransportDepartures(value?.transportDepartures),
  godparent1: s(value?.godparent1),
  godparent2: s(value?.godparent2),
  musicFile: s(value?.musicFile),
  kidsPolicy: s(value?.kidsPolicy),
  menuEnabled: s(value?.menuEnabled) === "true" ? "true" : "false",
  privacyPolicyVersion: s(value?.privacyPolicyVersion),
  menuTextoDishes: normalizeMenuDishes(value?.menuTextoDishes),
  menuCarneDishes: normalizeMenuDishes(value?.menuCarneDishes),
  menuPescadoDishes: normalizeMenuDishes(value?.menuPescadoDishes),
  menuVeganoDishes: normalizeMenuDishes(value?.menuVeganoDishes),
  backgroundImage: s(value?.backgroundImage),
  customSeal: s(value?.customSeal),
  cornerDecoration: s(value?.cornerDecoration),
  weddingSiteURL: s(value?.weddingSiteURL ?? value?.weddingMapUrl),
  weddingMapView: ["roadmap","satellite","hybrid"].includes(s(value?.weddingMapView)) ? s(value?.weddingMapView) : "roadmap",
  weddingMapStatic: s(value?.weddingMapStatic) === "true" ? "true" : "false",
  detailsMapMode: normalizeMapMode(value?.detailsMapMode),
  transportMapMode: normalizeMapMode(value?.transportMapMode),
  accommodationMapMode: normalizeMapMode(value?.accommodationMapMode),
});
