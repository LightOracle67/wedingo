import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";

initializeApp();
const db = getFirestore();
const storage = getStorage();

export const cleanupExpiredData = onSchedule("0 0 1 * *", async () => {
  const now = Date.now();
  const twelveMonthsAgo = now - 365 * 24 * 60 * 60 * 1000;
  let processed = 0;

  const snapshot = await db.collection("invitations").get();
  const batch = db.batch();
  let batchSize = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const day = Number(data.weddingDay);
    const month = data.weddingMonth ? new Date(`${data.weddingMonth} 1, 2000`).getMonth() : -1;
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
        await storage.bucket().deleteFiles({ prefix: `invitations/${inviteToken}/` });
      } catch {}

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
});
