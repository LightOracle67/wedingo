/**
 * invitation-subcollections.ts
 * ─────────────────────────────────────────────────────────────
 * Utilidades compartidas para el BORRADO EN CASCADA completo de una
 * invitación. Centraliza la lista de subcolecciones bajo `invitations/{id}`
 * y el borrado por lotes, usados por el superadmin y por el
 * `handleDeleteInvitation` del organizador (setup).
 *
 * Racional (GDPR art. 17 / UK GDPR / LGPD / CCPA / POPIA): algunas
 * subcolecciones sociales (`confirmedPeople`) guardan DATOS PERSONALES
 * de invitados. Si
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
import { db } from "./firebase";
import { safeLogError } from "./safe-error";

/**
 * Todas las subcolecciones existentes bajo `invitations/{id}`. Incluye los
 * medios (gallery, audio, configImages), las funciones sociales con PII
 * (confirmedPeople, venuepoints) y los internos/auditoría
 * (_counters, _backup, consentLog, accessLog, visitLog, configLog, sections).
 */
export const INVITATION_SUBCOLLECTIONS = [
  "gallery",
  "audio",
  "configImages",
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

// ─── Zonas + mesas (vista pública) ───────────────────────────────────────────

/** Zona del plano de mesas con sus mesas resueltas (forma pública). */
export interface PublicTableSection {
  id: string;
  name: string;
  tables: PublicTable[];
}

/** Mesa en su forma pública (la misma del plano de invitados). */
export interface PublicTable {
  id: string;
  name: string;
  shape: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  seats: number;
  guests: string[];
}

// Caché de módulo (TTL corto, patrón de META_CACHE en image-store): la
// invitación pública monta las secciones TableSeatingSection y RsvpSection,
// que consultaban las MISMAS zonas+mesas de forma independiente (N lecturas
// secuenciales en serie, dos veces). Con este loader único y cacheado se
// paga UNA vez por visita (v2.185).
const SECTIONS_CACHE = new Map<string, { at: number; data: PublicTableSection[] }>();
const SECTIONS_TTL_MS = 30_000;

/** Invalida la caché de zonas/mesas (tras guardados del plano en el admin). */
export function clearSectionsCache() {
  SECTIONS_CACHE.clear();
}

/**
 * Carga las zonas con sus mesas en PARALELO (antes: N lecturas secuenciales
 * en serie) con caché de módulo compartida entre secciones.
 *
 * @param inviteToken - Token de la invitación.
 * @returns Zonas con mesas (las zonas sin mesas se omiten).
 */
export async function loadSectionsWithTables(inviteToken: string): Promise<PublicTableSection[]> {
  if (!inviteToken) return [];
  const hit = SECTIONS_CACHE.get(inviteToken);
  if (hit && Date.now() - hit.at < SECTIONS_TTL_MS) return hit.data;
  try {
    const sectionsSnap = await getDocs(collection(db, "invitations", inviteToken, "sections"));
    // Todas las lecturas de mesas en paralelo (Promise.all): elimina el N+1
    // secuencial que alargaba la carga con muchas zonas.
    const sectionsWithTables = await Promise.all(
      sectionsSnap.docs.map(async (s) => {
        const tablesSnap = await getDocs(
          collection(db, "invitations", inviteToken, "sections", s.id, "tables"),
        );
        const tables: PublicTable[] = tablesSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || ""),
            shape: String(data.shape || "circle"),
            x: Number(data.x) || 0,
            y: Number(data.y) || 0,
            w: Number(data.w) || 80,
            h: Number(data.h) || 80,
            rotation: Number(data.rotation) || 0,
            seats: Number(data.seats) || 0,
            guests: Array.isArray(data.guests) ? (data.guests as string[]) : [],
          };
        });
        if (tables.length === 0) return null;
        return { id: s.id, name: String(s.data().name || ""), tables };
      }),
    );
    const result = sectionsWithTables.filter((s): s is PublicTableSection => s !== null);
    SECTIONS_CACHE.set(inviteToken, { at: Date.now(), data: result });
    return result;
  } catch (err) {
    safeLogError(["[app]", "[invitation-subcollections]", "loadSectionsWithTables error"], err);
    return [];
  }
}
