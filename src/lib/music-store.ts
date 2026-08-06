import { getDocs, collection, writeBatch, doc, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { encrypt, decrypt } from "./crypto-utils";

const CHUNK_SIZE = 200 * 1024;

function audioCol(token: string) {
  return collection(db, "invitations", token, "audio");
}

export async function uploadAudio(inviteToken: string, file: File, onProgress?: (pct: number) => void) {

  onProgress?.(10);
  const { compressAudio } = await import("./audio-utils");
  const dataUrl = await compressAudio(file);

  onProgress?.(40);
  const encrypted = await encrypt(dataUrl, inviteToken);
  if (!encrypted) { console.error("[app]", "[music-store]", "uploadAudio encrypt failed", {}); throw new Error("Encryption failed"); }

  onProgress?.(70);

  return { encrypted, dataUrl };
}

export async function addAudio(inviteToken: string, encrypted: string, dataUrl: string, onProgress?: (pct: number) => void) {

  // Elimina los chunks de subidas anteriores (incluidas las incompletas):
  // loadAudio concatena toda la colección, y sin esta limpieza los chunks
  // viejos se mezclaban con los nuevos corrompiendo el audio.
  const prev = await getDocs(audioCol(inviteToken));
  if (!prev.empty) {
    const cleanup = writeBatch(db);
    prev.docs.forEach((d) => cleanup.delete(d.ref));
    await cleanup.commit();
  }

  const chunks: string[] = [];
  for (let i = 0; i < encrypted.length; i += CHUNK_SIZE) {
    chunks.push(encrypted.slice(i, i + CHUNK_SIZE));
  }

  // Firestore limita cada request a 10 MiB: 400 chunks × 200 KB = 80 MB
  // superaba el límite y las canciones >2 min no subían. ~40 chunks (8 MB)
  // mantiene cada batch por debajo del tope.
  const BATCH_LIMIT = 40;
  for (let batchIdx = 0; batchIdx < chunks.length; batchIdx += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const end = Math.min(batchIdx + BATCH_LIMIT, chunks.length);
    for (let i = batchIdx; i < end; i++) {
      const ref = doc(audioCol(inviteToken));
      batch.set(ref, {
        chunkIndex: i,
        data: chunks[i],
        totalChunks: chunks.length,
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  }
  onProgress?.(95);

  return { id: `${inviteToken}_audio`, dataUrl, chunks: chunks.length };
}

export async function loadAudio(inviteToken: string) {

  try {
    const q = query(audioCol(inviteToken), orderBy("chunkIndex", "asc"));
    const snap = await getDocs(q);
    if (snap.empty) { ; return null; }
    const chunks = snap.docs.map((d) => d.data().data as string);

    const concatenated = chunks.join("");
    const url = await decrypt(concatenated, inviteToken);
    if (url) { ; return { id: `${inviteToken}_audio`, url }; }

    return null;
  } catch (err) { console.error("[app]", "[music-store]", "loadAudio error", { error: err }); return null; }
}

export async function deleteAudio(inviteToken: string) {

  try {
    const snap = await getDocs(audioCol(inviteToken));
    if (snap.empty) { ; return; }
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    // Un borrado parcial dejaría chunks huérfanos: se relanza para que el
    // llamador (cascada de borrado) lo trate como fallo.
    console.error("[app]", "[music-store]", "deleteAudio error", { error: err });
    throw err;
  }
}
