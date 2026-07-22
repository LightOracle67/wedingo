import { getDocs, collection, writeBatch, doc, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { encrypt, decrypt } from "./crypto-utils";

const CHUNK_SIZE = 500 * 1024;

function audioCol(token: string) {
  return collection(db, "invitations", token, "audio");
}

export async function uploadAudio(inviteToken: string, file: File, onProgress?: (pct: number) => void) {
  onProgress?.(10);
  const { compressAudio } = await import("./audio-utils");
  const dataUrl = await compressAudio(file);
  onProgress?.(40);
  const encrypted = await encrypt(dataUrl, inviteToken);
  if (!encrypted) throw new Error("Encryption failed");
  onProgress?.(70);
  return { encrypted, dataUrl };
}

export async function addAudio(inviteToken: string, encrypted: string, dataUrl: string, onProgress?: (pct: number) => void) {
  const chunks: string[] = [];
  for (let i = 0; i < encrypted.length; i += CHUNK_SIZE) {
    chunks.push(encrypted.slice(i, i + CHUNK_SIZE));
  }
  const batch = writeBatch(db);
  for (let i = 0; i < chunks.length; i++) {
    const ref = doc(audioCol(inviteToken));
    batch.set(ref, {
      chunkIndex: i,
      data: chunks[i],
      totalChunks: chunks.length,
      createdAt: new Date().toISOString(),
    });
  }
  await batch.commit();
  onProgress?.(95);
  return { id: `${inviteToken}_audio`, dataUrl, chunks: chunks.length };
}

export async function loadAudio(inviteToken: string) {
  try {
    const q = query(audioCol(inviteToken), orderBy("chunkIndex", "asc"));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const chunks = snap.docs.map((d) => d.data().data as string);
    const concatenated = chunks.join("");
    const url = await decrypt(concatenated, inviteToken);
    if (url) return { id: `${inviteToken}_audio`, url };
    return null;
  } catch { return null; }
}

export async function deleteAudio(inviteToken: string) {
  const snap = await getDocs(audioCol(inviteToken));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
