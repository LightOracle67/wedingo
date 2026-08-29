/**
 * Ayudantes puros de la pestaña Datos del superadmin.
 *
 * Separamos la lógica de exportación y borrado (acceso a Firestore y
 * saneamiento de documentos) del componente DataTab para que sea reutilizable
 * y testeable de forma aislada, sin depender del estado del componente.
 */
import { getDocs, collection } from "firebase/firestore";
import { db, rsvpByInviteRef } from "../../lib/firebase";

/** Cuenta las elecciones de menú (mealChoice) de las respuestas RSVP de una invitación. */
export async function menuSummary(token: string): Promise<Record<string, number>> {
  const rsvpSnap = await getDocs(rsvpByInviteRef(token));
  const counts: Record<string, number> = {};
  for (const d of rsvpSnap.docs) {
    const m = String(d.data().mealChoice || "");
    if (m) counts[m] = (counts[m] || 0) + 1;
  }
  return counts;
}

/** Lee la galería y el audio de una invitación (para exportar el backup completo con las fotos y la música). */
export async function loadMediaForToken(token: string): Promise<{
  gallery: Array<Record<string, unknown>>;
  audio: Array<Record<string, unknown>>;
}> {
  const [gallerySnap, audioSnap] = await Promise.all([
    getDocs(collection(db, "invitations", token, "gallery")),
    getDocs(collection(db, "invitations", token, "audio")),
  ]);
  return {
    gallery: gallerySnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
      id: d.id,
      ...d.data(),
    })),
    audio: audioSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
      id: d.id,
      ...d.data(),
    })),
  };
}

/** Elimina los campos sensibles de un documento de invitación antes de exportarlo: los tokens de setup no deben viajar en claro en un JSON. */
export function sanitizeInvitationForExport(data: Record<string, unknown>): Record<string, unknown> {
  const { _activeSetupToken: _t, legacyToken: _l, activeSession: _s, setupTokenHash: _h, ...safe } = data;
  return safe;
}

/** Borra una invitación en cascada (RSVPs, subcolecciones, mesas, tokens, contador y el doc principal) usando el helper compartido. */
export async function cascadeDelete(token: string): Promise<void> {
  // Borrado en cascada completo y centralizado: RSVPs, todas las
  // subcolecciones (incluidas las sociales con PII), mesas con nombres de
  // invitados, tokens de setup, contador RSVP y el documento de invitación,
  // troceado en lotes de 500. Usa el helper compartido para no duplicar la
  // lógica en cada panel del superadmin.
  const { deleteInvitationCascade } = await import("../../lib/invitation-subcollections");
  await deleteInvitationCascade(token, db);
}
