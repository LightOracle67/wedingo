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
  // El RSVP SIEMPRE es la última sección: se saca de su posición y se
  // reinserta al final (en el editor queda bloqueado como la portada).
  const hasRsvp = parsed.includes("rsvp");
  const withoutRsvp = parsed.filter((s) => s !== "rsvp");
  if (hasRsvp) withoutRsvp.push("rsvp");
  return withoutRsvp;
}

export function parseHidden(raw: string | null | undefined) {
  return new Set(
    (raw || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Indica si una sección tiene contenido configurado (si no, no se muestra en
 *  la invitación aunque esté en el orden de secciones). El filtro aplica a
 *  TODAS las secciones: la galería se desactiva si no tiene ninguna imagen
 *  subida. El default de la galería es visible (el guardado del admin no
 *  conoce Storage); solo la invitación pública pasa el resultado de la
 *  consulta real de sus metadatos (galleryHasImages). */
export function sectionHasContent(
  key: string,
  config: InvitationConfig | Partial<InvitationConfig>,
  galleryHasImages = true,
): boolean {
  switch (key) {
    case "hero":
      return true;
    case "details":
      return !!(
        config.weddingDay ||
        config.weddingMonth ||
        config.weddingYear ||
        config.weddingHour ||
        config.weddingMinute ||
        config.weddingSiteURL
      );
    case "info":
      // El menú también vive en la sección info: configurarlo solo no debe
      // ocultar la sección automáticamente. weddingDressCodeCustom acompaña
      // a weddingDressCode cuando se elige "Otro".
      return !!(
        config.weddingScheduleEvents ||
        config.weddingDressCode ||
        config.weddingDressCodeCustom ||
        config.kidsPolicy ||
        config.menuEnabled === "true" ||
        config.menuCarneDishes ||
        config.menuPescadoDishes ||
        config.menuVeganoDishes ||
        config.menuTextoDishes
      );
    case "story":
      return !!config.storyText;
    case "gifts":
      return !!(config.giftsInfo || config.bankInfo);
    case "accommodation":
      return !!config.accommodationURL;
    case "transport":
      return config.transportEnabled !== "none" || !!config.transportDepartures;
    case "venuemap":
      // El mapa del recinto es una sección PROPIA (desde v2.109): se muestra
      // solo si la pareja la activa. Antes vivía dentro de "extras".
      return config.venueMapEnabled === "true";
    case "tables":
      // Distribución de mesas para los invitados: se muestra solo si la pareja
      // la activa (el plano en sí vive en Firestore y se lee en la sección).
      return config.tablesEnabled === "true";
    case "gallery":
      // La galería se desactiva si no tiene ninguna imagen subida.
      return galleryHasImages;
    default:
      return true;
  }
}

/**
 * Aplica los toggles *Enabled a la configuración para la invitación pública:
 * cuando un campo tiene su flag `*Enabled === 'false'`, se entrega como cadena
 * vacía (o imagen ausente) para que el render por presencia lo oculte.
 *
 * Compatibilidad con documentos antiguos: `undefined` (flag no guardado) se
 * interpreta como "visible" → el valor por presencia se mantiene. Nunca borra
 * el valor persistido: solo afecta a la copia usada para renderizar.
 */
export function applyEnabledToggles<T extends InvitationConfig | Partial<InvitationConfig>>(
  config: T,
): T {
  const clone: T = { ...config };
  // Pares campo → flag: si el flag es exactamente 'false', el campo se oculta.
  const FIELD_TOGGLES: Record<string, string[]> = {
    storyText: ["storyTextEnabled"],
    giftsInfo: ["giftsInfoEnabled"],
    bankInfo: ["giftsInfoEnabled"],
    inviteMessage: ["inviteMessageEnabled"],
    instagramUrl: ["instagramEnabled"],
    kidsPolicy: ["kidsPolicyEnabled"],
    weddingDressCode: ["weddingDressCodeEnabled"],
    weddingDressCodeCustom: ["weddingDressCodeEnabled"],
    weddingSiteURL: ["weddingSiteURLEnabled"],
    accommodationURL: ["accommodationURLEnabled"],
    godparent1: ["godparentsEnabled"],
    godparent2: ["godparentsEnabled"],
    couplePhoto: ["couplePhotoEnabled"],
    backgroundImage: ["backgroundImageEnabled"],
    cornerDecoration: ["cornerDecorationEnabled"],
    customSeal: ["customSealEnabled"],
  };
  for (const [field, flags] of Object.entries(FIELD_TOGGLES)) {
    const disabled = flags.some((flag) => clone[flag as keyof typeof clone] === "false");
    if (disabled) {
      // Cast seguro: InvitationConfig acepta un valor vacío para estos campos.
      (clone as Record<string, unknown>)[field] = "";
    }
  }
  return clone;
}

export { formatDate } from "./superadmin";
