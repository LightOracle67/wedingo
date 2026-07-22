import i18n from "../i18n";
import { addDoc, getDocs, updateDoc, deleteDoc, collection, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase";
import { compressImage } from "./image-utils";
import { encrypt, decrypt } from "./crypto-utils";

function galCol(token: string) {
  return collection(db, "invitations", token, "gallery");
}

export async function uploadImage(inviteToken: any, file: any, onProgress?: any) {
  onProgress?.(10);
  const dataUrl = await compressImage(file);
  onProgress?.(40);
  const encrypted = await encrypt(dataUrl, inviteToken);
  if (!encrypted) throw new Error(i18n.t("errors.encryptFailed"));
  onProgress?.(70);
  const size = Math.round((encrypted.length * 3) / 4);
  if (size > 400 * 1024) throw new Error(i18n.t("errors.imageTooLarge"));
  onProgress?.(80);
  return { encrypted, dataUrl };
}

export async function addGalleryImage(inviteToken, encrypted, dataUrl, position, onProgress, originalName?, originalSize?) {
  onProgress?.(85);
  const docRef = await addDoc(galCol(inviteToken), {
    data: encrypted,
    description: "",
    position: position ?? 0,
    createdAt: new Date().toISOString(),
    originalName: originalName || "",
    originalSize: originalSize || 0,
  });
  onProgress?.(95);
  return { id: docRef.id, dataUrl };
}

export async function updateGalleryDescription(inviteToken, imageId, description) {
  const safe = String(description || "").slice(0, 200).trim();
  await updateDoc(doc(galCol(inviteToken), imageId), { description: safe });
}

export async function updateGalleryOrder(inviteToken, items) {
  if (!items.length) return;
  const batch = writeBatch(db);
  for (const { id, position } of items) {
    batch.update(doc(galCol(inviteToken), id), { position });
  }
  await batch.commit();
}

export async function loadDecryptedField(inviteToken, encrypted) {
  if (!encrypted) return "";
  try { return await decrypt(encrypted, inviteToken); } catch { return ""; }
}

export async function loadGallery(inviteToken) {
  try {
    const snap = await getDocs(galCol(inviteToken));
    const result = [];
    for (const d of snap.docs) {
      const enc = d.data().data;
      if (enc) {
        try {
          const url = await decrypt(enc, inviteToken);
          result.push({
            id: d.id,
            url,
            position: d.data().position,
            description: d.data().description || "",
            originalName: d.data().originalName || "",
            originalSize: d.data().originalSize || 0,
          });
        } catch {}
      }
    }
    result.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    return result;
  } catch { return []; }
}

export async function deleteGallery(inviteToken) {
  const snap = await getDocs(galCol(inviteToken));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function deleteGalleryImage(inviteToken, imageId) {
  await deleteDoc(doc(galCol(inviteToken), imageId));
}
