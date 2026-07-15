import i18n from "../i18n";
import { addDoc, getDocs, updateDoc, deleteDoc, collection, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase";
import { compressImage } from "./image-utils";
import { encrypt, decrypt } from "./crypto-utils";

const GALLERY_COL = (token) => collection(db, "invitations", token, "gallery");

/**
 * Comprime y cifra una imagen para su almacenamiento seguro.
 *
 * Flujo: comprime la imagen → cifra el data URL con AES-256-GCM →
 * valida que el tamaño cifrado no supere 800 KB.
 *
 * @param {string} inviteToken - Token de la invitación (usado como clave de cifrado).
 * @param {File} file - Archivo de imagen a subir.
 * @param {Function} [onProgress] - Callback opcional para reportar progreso (0–100).
 *        Recibe un número entre 0 y 100 indicando el porcentaje completado.
 * @returns {Promise<{ encrypted: string, dataUrl: string }>} Imagen cifrada y su versión original.
 * @throws {Error} Si la imagen comprimida y cifrada sigue superando 800 KB.
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
 * Guarda una imagen cifrada en la subcolección gallery de Firestore
 * con una descripción vacía.
 *
 * @param {string} inviteToken - Token de la invitación.
 * @param {string} encrypted - Imagen cifrada en base64.
 * @param {string} dataUrl - Data URL original sin cifrar (para preview inmediato).
 * @param {Function} [onProgress] - Callback opcional para progreso (0–100).
 * @returns {Promise<{ id: string, dataUrl: string }>} ID del documento y dataUrl.
 */
export async function addGalleryImage(inviteToken, encrypted, dataUrl, onProgress) {
  onProgress?.(85);
  const docRef = await addDoc(GALLERY_COL(inviteToken), {
    data: encrypted,
    description: "",
    createdAt: new Date().toISOString(),
  });
  onProgress?.(95);
  return { id: docRef.id, dataUrl };
}

/**
 * Actualiza la descripción de una imagen de la galería.
 *
 * @param {string} inviteToken - Token de la invitación.
 * @param {string} imageId - ID del documento en Firestore.
 * @param {string} description - Nueva descripción (máx 200 caracteres).
 */
export async function updateGalleryDescription(inviteToken, imageId, description) {
  const safe = String(description || "").slice(0, 200).trim();
  await updateDoc(doc(db, "invitations", inviteToken, "gallery", imageId), {
    description: safe,
  });
}

export async function loadDecryptedField(inviteToken, encrypted) {
  if (!encrypted) return "";
  try { return await decrypt(encrypted, inviteToken); } catch { return ""; }
}

/**
 * Carga todas las imágenes de la galería con sus metadatos.
 *
 * @param {string} inviteToken - Token de la invitación.
 * @returns {Promise<Array<{ id: string, url: string, description: string }>>}
 */
export async function loadGallery(inviteToken) {
  try {
    const snap = await getDocs(GALLERY_COL(inviteToken));
    const result = [];
    for (const d of snap.docs) {
      const enc = d.data().data;
      if (enc) {
        try {
          const url = await decrypt(enc, inviteToken);
          result.push({
            id: d.id,
            url,
            description: d.data().description || "",
          });
        } catch {}
      }
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

/**
 * Elimina una imagen individual de la galería.
 *
 * @param {string} inviteToken - Token de la invitación.
 * @param {string} imageId - ID del documento en Firestore.
 */
export async function deleteGalleryImage(inviteToken, imageId) {
  await deleteDoc(doc(db, "invitations", inviteToken, "gallery", imageId));
}
