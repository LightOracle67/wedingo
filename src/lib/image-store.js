import i18n from "../i18n";
import { addDoc, getDocs, updateDoc, deleteDoc, collection, writeBatch, doc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { compressImage } from "./image-utils";
import { encrypt, decrypt } from "./crypto-utils";

const GALLERY_DATA_COL = collection(db, "galleryData");
const galDataByToken = (token) => query(GALLERY_DATA_COL, where("inviteToken", "==", token));

/**
 * Comprime y cifra una imagen para su almacenamiento seguro.
 */
export async function uploadImage(inviteToken, file, onProgress) {
  onProgress?.(10);
  const dataUrl = await compressImage(file);
  onProgress?.(40);
  const encrypted = await encrypt(dataUrl, inviteToken);
  if (!encrypted) throw new Error(i18n.t("errors.encryptFailed"));
  onProgress?.(70);
  const size = Math.round((encrypted.length * 3) / 4);
  if (size > 800 * 1024) throw new Error(i18n.t("errors.imageTooLarge"));
  onProgress?.(80);
  return { encrypted, dataUrl };
}

/**
 * Guarda una imagen cifrada en la colección galleryData.
 */
export async function addGalleryImage(inviteToken, encrypted, dataUrl, position, onProgress) {
  onProgress?.(85);
  const docRef = await addDoc(GALLERY_DATA_COL, {
    inviteToken,
    data: encrypted,
    description: "",
    position: position ?? 0,
    createdAt: new Date().toISOString(),
  });
  onProgress?.(95);
  return { id: docRef.id, dataUrl };
}

export async function updateGalleryDescription(inviteToken, imageId, description) {
  const safe = String(description || "").slice(0, 200).trim();
  await updateDoc(doc(GALLERY_DATA_COL, imageId), {
    description: safe,
  });
}

/**
 * Actualiza el orden de las imágenes: recibe { id, position }[] y actualiza en batch.
 */
export async function updateGalleryOrder(inviteToken, items) {
  if (!items.length) return;
  const batch = writeBatch(db);
  for (const { id, position } of items) {
    batch.update(doc(GALLERY_DATA_COL, id), { position });
  }
  await batch.commit();
}

export async function loadDecryptedField(inviteToken, encrypted) {
  if (!encrypted) return "";
  try { return await decrypt(encrypted, inviteToken); } catch { return ""; }
}

/**
 * Carga todas las imágenes de la galería desde galleryData, ordenadas por posición.
 */
export async function loadGallery(inviteToken) {
  try {
    const snap = await getDocs(galDataByToken(inviteToken));
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
          });
        } catch {}
      }
    }
    result.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    return result;
  } catch { return []; }
}

/**
 * Elimina TODAS las imágenes de la galería para una invitación.
 */
export async function deleteGallery(inviteToken) {
  const snap = await getDocs(galDataByToken(inviteToken));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/**
 * Elimina una imagen individual por su ID de documento.
 */
export async function deleteGalleryImage(inviteToken, imageId) {
  await deleteDoc(doc(GALLERY_DATA_COL, imageId));
}
