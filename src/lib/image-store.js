import { doc, getDoc, setDoc, addDoc, getDocs, collection, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { compressImage } from "./image-utils";
import { encrypt, decrypt } from "./crypto-utils";

const GALLERY_COL = (token) => collection(db, "invitations", token, "gallery");

export async function uploadImage(inviteToken, file) {
  const dataUrl = await compressImage(file);
  const encrypted = await encrypt(dataUrl, inviteToken);
  const size = Math.round((encrypted.length * 3) / 4);
  if (size > 800 * 1024) throw new Error("La imagen es demasiado grande incluso comprimida.");
  return { encrypted, dataUrl };
}

export async function saveImageField(inviteToken, field, encrypted) {
  await setDoc(doc(db, "invitations", inviteToken), { [field]: encrypted }, { merge: true });
}

export async function addGalleryImage(inviteToken, encrypted, dataUrl) {
  await addDoc(GALLERY_COL(inviteToken), { data: encrypted, createdAt: new Date().toISOString() });
  return dataUrl;
}

export async function loadDecryptedField(inviteToken, encrypted) {
  if (!encrypted) return "";
  try { return await decrypt(encrypted, inviteToken); } catch { return ""; }
}

export async function loadGallery(inviteToken) {
  try {
    const snap = await getDocs(GALLERY_COL(inviteToken));
    const result = [];
    for (const d of snap.docs) {
      const enc = d.data().data;
      if (enc) { try { result.push(await decrypt(enc, inviteToken)); } catch {} }
    }
    return result;
  } catch { return []; }
}

export async function deleteGallery(inviteToken) {
  const snap = await getDocs(GALLERY_COL(inviteToken));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
