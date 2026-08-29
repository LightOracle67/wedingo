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

/** Fila de invitación de la tabla de Datos (subconjunto plano derivado del doc). */
export interface InvitationData {
  id: string;
  firstName: string;
  secondName: string;
  adminUsername: string;
  rsvpCount: number;
  tokenCount: number;
  weddingDate: string;
  hasSession: boolean;
  visits: number;
  lastActivity: string;
  createdAt: string;
}

/** Filtro de actividad aplicado a la tabla ("todas" | "hoy" | "semana" | "sesion"). */
export type ActivityFilter = "todas" | "hoy" | "semana" | "sesion";

/**
 * Construye la lista de filas de invitaciones a partir de los documentos
 * Firestore y los contadores de RSVP. Aísla la extracción de campos
 * (actividad de sesión, fecha de boda, visitas) para testearla sin Firestore.
 */
export function buildInvitationData(
  invSnap: Array<{ id: string; data: () => Record<string, unknown> }>,
  rsvpCounts: Record<string, number>,
): InvitationData[] {
  const list = invSnap.map((d) => {
    const data = d.data();
    const token = d.id;
    const sessionAt = data.activeSession as { seconds?: number } | null | undefined;
    const lastActivity =
      sessionAt && typeof sessionAt === "object" && "seconds" in sessionAt
        ? new Date(Number(sessionAt.seconds) * 1000).toISOString()
        : String(data.createdAt || "");
    return {
      id: token,
      firstName: String(data.firstName || ""),
      secondName: String(data.secondName || ""),
      adminUsername: String(data.adminUsername || ""),
      rsvpCount: rsvpCounts[token] || 0,
      tokenCount: 0,
      weddingDate:
        data.weddingDay && data.weddingMonth && data.weddingYear
          ? `${String(data.weddingDay)}/${String(data.weddingMonth)}/${String(data.weddingYear)}`
          : "",
      hasSession: !!data.activeSession,
      visits: Number(data._visits) || 0,
      lastActivity,
      createdAt: String(data.createdAt || ""),
    };
  });
  return list.sort((a, b) => (b.weddingDate || "").localeCompare(a.weddingDate || ""));
}

/** Filtra las invitaciones por actividad (hoy / semana / sesión activa / todas). */
export function filterByActivity(invitations: InvitationData[], filter: string): InvitationData[] {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = now - 7 * 86400000;
  return invitations.filter((inv) => {
    if (filter === "sesion") return inv.hasSession;
    if (filter === "hoy") {
      const a = inv.lastActivity ? Date.parse(inv.lastActivity) : 0;
      return a >= todayStart.getTime();
    }
    if (filter === "semana") {
      const a = inv.lastActivity ? Date.parse(inv.lastActivity) : 0;
      return a >= weekAgo;
    }
    return true;
  });
}
