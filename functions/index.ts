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
  const setupTokensSnap = await db.collection("setupTokens")
    .where("inviteToken", "==", inviteToken).get();

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
  } catch { /* el directorio puede no existir */ }

  return totalDeletes;
}

export const cleanupExpiredData = onSchedule(
  { schedule: "0 0 1 * *" } satisfies ScheduleOptions,
  async () => {
    const now = Date.now();
    const twelveMonthsAgo = now - 365 * 24 * 60 * 60 * 1000;
    let processed = 0;

    const snapshot = await db.collection("invitations").get();

    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>;
      const day = Number(data.weddingDay);
      const month = typeof data.weddingMonth === "string"
        ? new Date(`${data.weddingMonth} 1, 2000`).getMonth()
        : -1;
      const year = Number(data.weddingYear);
      if (!day || month < 0 || !year) continue;

      const weddingDate = new Date(year, month, day);
      const eventTime = weddingDate.getTime();
      if (eventTime > 0 && now - eventTime > twelveMonthsAgo) {
        await cascadeDeleteInvitation(doc.id);
        processed++;
      }
    }

    console.log(`Cleanup complete: ${processed} invitations removed`);
  },
);
