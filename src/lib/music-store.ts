import { addDoc, getDocs, collection, writeBatch, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { encrypt, decrypt } from "./crypto-utils";

const AUDIO_DATA_COL = collection(db, "audioData");
const audioByToken = (token: string) => query(AUDIO_DATA_COL, where("inviteToken", "==", token));

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
  onProgress?.(85);
  const docRef = await addDoc(AUDIO_DATA_COL, {
    inviteToken,
    data: encrypted,
    createdAt: new Date().toISOString(),
  });
  onProgress?.(95);
  return { id: docRef.id, dataUrl };
}

export async function loadAudio(inviteToken: string) {
  try {
    const snap = await getDocs(audioByToken(inviteToken));
    if (snap.empty) return null;
    const docs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const latest = docs[0] as any;
    if (latest.data) {
      const url = await decrypt(latest.data, inviteToken);
      if (url) return { id: latest.id, url };
    }
    return null;
  } catch { return null; }
}

export async function deleteAudio(inviteToken: string) {
  const snap = await getDocs(audioByToken(inviteToken));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
