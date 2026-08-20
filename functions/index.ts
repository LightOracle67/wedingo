import { onSchedule, type ScheduleOptions } from "firebase-functions/v2/scheduler";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import type { Bucket } from "@google-cloud/storage";

initializeApp();
const db: Firestore = getFirestore();
const storage: Storage = getStorage();

/** Máximo de operaciones por batch de Firestore (límite real 500, dejamos margen). */
const BATCH_LIMIT = 400;

/**
 * Mapa de meses en español → índice de `Date` (0-based).
 * Los valores de la invitación se persisten con MESES EN ESPAÑOL ("enero"…
 * "diciembre", ver firestore.rules y MONTH_VALUE_TO_NUMBER en constants.ts).
 * NO se puede usar `new Date(`${month} 1, 2000`).getMonth()`: el parser de
 * fechas de V8/Node solo entiende meses en inglés, así que "enero", "abril",
 * "agosto" y "diciembre" producen Invalid Date → `NaN` → el cálculo de
 * expiración nunca borraba invitaciones (retención indefinida, GDPR art. 5.1.e).
 */
export const SPANISH_MONTH_INDEX: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

/**
 * Timestamp (ms) de la fecha de la boda a partir de los campos persistidos
 * (día numérico, mes en español, año). Devuelve -1 si la fecha es inválida o
 * faltan datos (la entrada no es una invitación real o está incompleta).
 *
 * @param data Datos del documento de la invitación.
 * @returns Timestamp en ms de la boda, o -1 si no se puede determinar.
 */
export function weddingTimestamp(data: Record<string, unknown>): number {
  const day = Number(data.weddingDay);
  const monthStr = typeof data.weddingMonth === "string" ? data.weddingMonth : "";
  const month = SPANISH_MONTH_INDEX[monthStr];
  const year = Number(data.weddingYear);
  if (!day || month === undefined || !year) return -1;
  const date = new Date(year, month, day);
  // Valida que el día no "desborde" el mes (p. ej. 35 de enero -> 4 de febrero):
  // el constructor de Date normaliza días fuera de rango y daría un timestamp
  // válido para una fecha inexistente.
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return -1;
  const ts = date.getTime();
  return Number.isFinite(ts) ? ts : -1;
}

/**
 * Elimina en cascada una invitación expirada y todos sus datos asociados.
 * Se procesa de forma aislada por invitación: crea batches frescos y, si un
 * batch se llena, hace commit y RE-CONSULTA las subcolecciones restantes
 * (los refs de un batch commiteado no pueden reutilizarse).
 *
 * @param inviteToken Token de la invitación a eliminar.
 * @returns Número de operaciones de borrado realizadas.
 */
async function cascadeDeleteInvitation(inviteToken: string): Promise<number> {
  let totalDeletes = 0;

  // Borrado de PII de invitados: el contador vive en rsvpResponses/{inviteToken}
  // y cada respuesta en rsvpResponses/{inviteToken}/responses/{id}.
  const rsvpNamespaceRef = db.collection("rsvpResponses").doc(inviteToken);

  // Borrado de setupTokens asociados (huérfanos si solo la invitación los referencia).
  const setupTokensSnap = await db.collection("setupTokens").where("inviteToken", "==", inviteToken).get();

  // Almacena los refs de subcolecciones; se re-consultan tras cada flush.
  let collectionRefs: FirebaseFirestore.CollectionReference[] = [];
  const refreshSubcollections = async () => {
    const invDoc = db.collection("invitations").doc(inviteToken);
    const subs = await invDoc.listCollections();
    collectionRefs = subs;
  };

  await refreshSubcollections();

  // Recoge un lote de refs a borrar. Devuelve los que no entran en el batch.
  const collectRefs = async (batch: FirebaseFirestore.WriteBatch): Promise<boolean> => {
    let added = 0;

    const rsvpResponsesSnap = await rsvpNamespaceRef.collection("responses").get();
    for (const d of rsvpResponsesSnap.docs) {
      if (added >= BATCH_LIMIT) return true; // batch lleno
      batch.delete(d.ref);
      added++;
    }

    if (added < BATCH_LIMIT) {
      batch.delete(rsvpNamespaceRef);
      added++;
    }

    for (const subcol of collectionRefs) {
      if (added >= BATCH_LIMIT) return true;
      const snap = await subcol.get();
      for (const d of snap.docs) {
        if (added >= BATCH_LIMIT) return true;
        batch.delete(d.ref);
        added++;
      }
    }

    for (const d of setupTokensSnap.docs) {
      if (added >= BATCH_LIMIT) return true;
      batch.delete(d.ref);
      added++;
    }

    batch.delete(db.collection("invitations").doc(inviteToken));
    added++;
    totalDeletes += added;
    return false;
  };

  // Elimina subcolecciones re-consultadas hasta vaciarlas (cubre invitaciones
  // con más de BATCH_LIMIT documentos repartidos en varias subcolecciones).
  let hasMore = true;
  while (hasMore) {
    const batch = db.batch();
    hasMore = await collectRefs(batch);
    await batch.commit();
    totalDeletes += 1; // un commit por iteración (costo mínimo de bookkeeping)
    if (hasMore) await refreshSubcollections();
  }

  try {
    await (storage.bucket() as Bucket).deleteFiles({ prefix: `invitations/${inviteToken}/` });
  } catch {
    /* el directorio puede no existir */
  }

  return totalDeletes;
}

export const cleanupExpiredData = onSchedule({ schedule: "0 0 1 * *" } satisfies ScheduleOptions, async () => {
  const now = Date.now();
  const twelveMonthsAgo = now - 365 * 24 * 60 * 60 * 1000;
  let processed = 0;

  const snapshot = await db.collection("invitations").get();

  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    // Fecha de la boda como timestamp; -1 si la invitación no tiene fecha válida.
    const eventTime = weddingTimestamp(data);
    if (eventTime > 0 && now - eventTime > twelveMonthsAgo) {
      await cascadeDeleteInvitation(doc.id);
      processed++;
    }
  }

  console.log(`Cleanup complete: ${processed} invitations removed`);
});
