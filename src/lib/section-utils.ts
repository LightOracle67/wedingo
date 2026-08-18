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
    case "extras":
      // La sección de funciones sociales se desactiva si ningún extra está
      // activado. IMPORTANTE: esta lista debe incluir TODOS los toggles de
      // ExtrasSectionForm; si un extra activado no está listado aquí, la
      // sección se considera vacía y se oculta al guardar (parecía "no
      // activable"). El mapa del recinto (venueMapEnabled) ya NO está aquí:
      // desde v2.109 es una sección PROPIA (venuemap), no un extra.
      return (
        config.rsvpDeadlineEnabled === "true" ||
        config.reactionsEnabled === "true" ||
        config.giftsListEnabled === "true" ||
        config.rideShareEnabled === "true" ||
        config.welcomeVideoEnabled === "true" ||
        config.notesEnabled === "true" ||
        config.musicPollEnabled === "true" ||
        config.triviaEnabled === "true" ||
        config.voiceNotesEnabled === "true" ||
        config.dayPhotosEnabled === "true" ||
        config.mailboxEnabled === "true" ||
        config.toastsEnabled === "true"
      );
    case "gallery":
      // La galería se desactiva si no tiene ninguna imagen subida.
      return galleryHasImages;
    default:
      return true;
  }
}

export { formatDate } from "./superadmin";
