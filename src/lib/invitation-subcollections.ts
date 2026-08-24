/**
 * invitation-subcollections.ts
 * ─────────────────────────────────────────────────────────────
 * Utilidades compartidas para el BORRADO EN CASCADA completo de una
 * invitación. Centraliza la lista de subcolecciones bajo `invitations/{id}`
 * y el borrado por lotes, usados por el superadmin y por el
 * `handleDeleteInvitation` del organizador (setup).
 *
 * Racional (GDPR art. 17 / UK GDPR / LGPD / CCPA / POPIA): algunas
 * subcolecciones sociales (`gifts`, `confirmedPeople`…) guardan DATOS
 * PERSONALES de invitados. Si
 * no se borran al eliminar la invitación, quedan huérfanas y legibles para
 * siempre. Este helper garantiza que ningún dato quede atrás.
 *
 * @module invitation-subcollections
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from "firebase/firestore";

/**
 * Todas las subcolecciones existentes bajo `invitations/{id}`. Incluye los
 * medios (gallery, audio, configImages), las funciones sociales con PII
 * (gifts, confirmedPeople, venuepoints) y los internos/auditoría
 * (_counters, _backup, consentLog, accessLog, visitLog, configLog, sections).
 */
export const INVITATION_SUBCOLLECTIONS = [
  "gallery",
  "audio",
  "configImages",
  "gifts",
  "_counters",
  "consentLog",
  "accessLog",
  "confirmedPeople",
  "_backup",
  "venuepoints",
  "visitLog",
  "configLog",
  "sections",
] as const;

/**
 * Recopila TODAS las referencias a borrar de una invitación (sin borrarlas):
 * subcolecciones directas, las mesas de cada sección (nombres de invitados),
 * los registros de tokens de setup asociados, el contador RSVP y el propio
 * documento de invitación.
 *
 * @param token - Id de la invitación (token compartido).
 * @param db - Instancia de Firestore ya inicializada.
 * @returns Referencias de documentos listas para escribir en batches.
 */
export async function collectInvitationDeleteRefs(token: string, db: Firestore): Promise<DocumentReference[]> {
  const refs: DocumentReference[] = [];

  // Respuestas RSVP de los invitados (rsvpResponses/{token}/responses): PII
  // (nombre, alergias, menú, consentimientos). Deben borrarse con la invitación.
  const rsvpSnap = await getDocs(collection(db, "rsvpResponses", token, "responses"));
  for (const d of rsvpSnap.docs) refs.push(d.ref);

  // Cada subcolección directa bajo invitations/{token}.
  for (const name of INVITATION_SUBCOLLECTIONS) {
    const subSnap = await getDocs(collection(db, "invitations", token, name));
    for (const d of subSnap.docs) refs.push(d.ref);
  }

  // Mesas de cada sección (sections/{id}/tables): guardan los NOMBRES
  // COMPLETOS de invitados asignados y deben borrarse con la sección.
  const sectionsSnap = await getDocs(collection(db, "invitations", token, "sections"));
  for (const sec of sectionsSnap.docs) {
    const tablesSnap = await getDocs(collection(db, "invitations", token, "sections", sec.id, "tables"));
    for (const tb of tablesSnap.docs) refs.push(tb.ref);
  }

  // Registros de tokens de setup (hash → inviteToken): evita hashes huérfanos.
  const setupTokenSnap = await getDocs(query(collection(db, "setupTokens"), where("inviteToken", "==", token)));
  for (const d of setupTokenSnap.docs) refs.push(d.ref);

  // Contador RSVP y el documento de invitación (siempre al final).
  refs.push(doc(db, "rsvpResponses", token));
  refs.push(doc(db, "invitations", token));

  return refs;
}

/**
 * Borra todos los documentos de una invitación en cascada, troceando en
 * lotes de como máximo 500 operaciones (límite de Firestore) para no fallar
 * en invitaciones con muchos RSVP/imágenes.
 *
 * @param token - Id de la invitación a borrar.
 * @param db - Instancia de Firestore.
 */
export async function deleteInvitationCascade(token: string, db: Firestore): Promise<void> {
  const refs = await collectInvitationDeleteRefs(token, db);
  const BATCH_SIZE = 500;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const ref of chunk) batch.delete(ref);
    await batch.commit();
  }
}
