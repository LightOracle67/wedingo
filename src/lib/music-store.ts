import { getDocs, collection, writeBatch, doc, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { encrypt, decrypt } from "./crypto-utils";

const CHUNK_SIZE = 500 * 1024;

function audioCol(token: string) {
  return collection(db, "invitations", token, "audio");
}

export async function uploadAudio(inviteToken: string, file: File, onProgress?: (pct: number) => void) {
  console.log("[app]", "[music-store]", "uploadAudio start", { name: file.name, size: file.size });
  onProgress?.(10);
  const { compressAudio } = await import("./audio-utils");
  const dataUrl = await compressAudio(file);
  console.log("[app]", "[music-store]", "compressAudio done", { dataUrlLength: dataUrl.length });
  onProgress?.(40);
  const encrypted = await encrypt(dataUrl, inviteToken);
  if (!encrypted) { console.error("[app]", "[music-store]", "uploadAudio encrypt failed", {}); throw new Error("Encryption failed"); }
  console.log("[app]", "[music-store]", "uploadAudio encrypt done", { encryptedLength: encrypted.length });
  onProgress?.(70);
  console.log("[app]", "[music-store]", "uploadAudio success", {});
  return { encrypted, dataUrl };
}

export async function addAudio(inviteToken: string, encrypted: string, dataUrl: string, onProgress?: (pct: number) => void) {
  console.log("[app]", "[music-store]", "addAudio start", { encryptedLength: encrypted.length });
  const chunks: string[] = [];
  for (let i = 0; i < encrypted.length; i += CHUNK_SIZE) {
    chunks.push(encrypted.slice(i, i + CHUNK_SIZE));
  }
  console.log("[app]", "[music-store]", "chunks created", { chunkCount: chunks.length });
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
  console.log("[app]", "[music-store]", "addAudio success", { chunkCount: chunks.length });
  return { id: `${inviteToken}_audio`, dataUrl, chunks: chunks.length };
}

export async function loadAudio(inviteToken: string) {
  console.log("[app]", "[music-store]", "loadAudio start", {});
  try {
    const q = query(audioCol(inviteToken), orderBy("chunkIndex", "asc"));
    const snap = await getDocs(q);
    if (snap.empty) { console.log("[app]", "[music-store]", "loadAudio: no audio found", {}); return null; }
    const chunks = snap.docs.map((d) => d.data().data as string);
    console.log("[app]", "[music-store]", "loadAudio chunks", { count: chunks.length });
    const concatenated = chunks.join("");
    const url = await decrypt(concatenated, inviteToken);
    if (url) { console.log("[app]", "[music-store]", "loadAudio success", { urlLength: url.length }); return { id: `${inviteToken}_audio`, url }; }
    console.log("[app]", "[music-store]", "loadAudio: decryption returned empty", {});
    return null;
  } catch (err) { console.error("[app]", "[music-store]", "loadAudio error", { error: err }); return null; }
}

export async function deleteAudio(inviteToken: string) {
  console.log("[app]", "[music-store]", "deleteAudio start", {});
  const snap = await getDocs(audioCol(inviteToken));
  if (snap.empty) { console.log("[app]", "[music-store]", "deleteAudio: no audio", {}); return; }
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log("[app]", "[music-store]", "deleteAudio success", { deletedCount: snap.docs.length });
}
