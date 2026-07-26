import { onSchedule, type ScheduleOptions } from "firebase-functions/v2/scheduler";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import type { Bucket } from "@google-cloud/storage";

initializeApp();
const db: Firestore = getFirestore();
const storage: Storage = getStorage();

export const cleanupExpiredData = onSchedule(
  { schedule: "0 0 1 * *" } satisfies ScheduleOptions,
  async () => {
    const now = Date.now();
    const twelveMonthsAgo = now - 365 * 24 * 60 * 60 * 1000;
    let processed = 0;

    const snapshot = await db.collection("invitations").get();
    const batch = db.batch();
    let batchSize = 0;

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
        const inviteToken = doc.id;

        const rsvpSnap = await db.collection("rsvpResponses")
          .where("inviteToken", "==", inviteToken).get();
        rsvpSnap.docs.forEach((d) => batch.delete(d.ref));

        const subcollections = await doc.ref.listCollections();
        for (const subcol of subcollections) {
          const snap = await subcol.get();
          snap.docs.forEach((d) => batch.delete(d.ref));
        }

        batch.delete(doc.ref);

        try {
          await (storage.bucket() as Bucket).deleteFiles({ prefix: `invitations/${inviteToken}/` });
        } catch { /* file may not exist */ }

        processed++;
        batchSize++;

        if (batchSize >= 400) {
          await batch.commit();
          batchSize = 0;
        }
      }
    }

    if (batchSize > 0) await batch.commit();
    console.log(`Cleanup complete: ${processed} invitations removed`);
  },
);
