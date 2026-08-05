import { STORY_SECTION_ORDER } from "./constants";
import type { InvitationConfig } from "../types";

export function parseSectionOrder(raw: string | undefined) {
  const order = (raw || STORY_SECTION_ORDER.join(",")).split(",").filter(Boolean);
  const valid = new Set(STORY_SECTION_ORDER);
  const parsed = order.filter((s) => valid.has(s));
  const existing = new Set(parsed);
  for (const s of STORY_SECTION_ORDER) {
    if (!existing.has(s)) parsed.push(s);
  }
  return parsed;
}

export function parseHidden(raw: string | null | undefined) {
  return new Set((raw || "").split(",").map((s) => s.trim()).filter(Boolean));
}

/** Indica si una sección tiene contenido configurado (si no, no se muestra en
 *  la invitación aunque esté en el orden de secciones). La galería se decide
 *  dentro de su propia sección (carga las imágenes de forma asíncrona). */
export function sectionHasContent(key: string, config: InvitationConfig | Partial<InvitationConfig>): boolean {
  switch (key) {
    case "hero":
      return true;
    case "details":
      return !!(config.weddingDay || config.weddingMonth || config.weddingYear
        || config.weddingHour || config.weddingMinute || config.weddingSiteURL);
    case "info":
      return !!(config.weddingScheduleEvents || config.weddingDressCode || config.kidsPolicy);
    case "story":
      return !!config.storyText;
    case "gifts":
      return !!(config.giftsInfo || config.bankInfo);
    case "accommodation":
      return !!config.accommodationURL;
    case "transport":
      return config.transportEnabled !== "none" || !!config.transportDepartures;
    default:
      return true;
  }
}

export { formatDate } from "./superadmin";
