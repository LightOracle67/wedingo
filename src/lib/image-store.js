import { getDoc, addDoc, getDocs, collection, writeBatch } from "firebase/firestore";
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
  console.log("[upload] comprimiendo imagen...");
  const dataUrl = await compressImage(file);
  console.log("[upload] comprimido:", Math.round(dataUrl.length / 1024), "KB");
  onProgress?.(40);
  console.log("[upload] cifrando...");
  const encrypted = await encrypt(dataUrl, inviteToken);
  if (!encrypted) throw new Error("El cifrado de la imagen falló.");
  console.log("[upload] cifrado:", Math.round(encrypted.length / 1024), "KB");
  onProgress?.(70);
  const size = Math.round((encrypted.length * 3) / 4);
  console.log("[upload] tamaño estimado:", Math.round(size / 1024), "KB");
  if (size > 800 * 1024) throw new Error("La imagen es demasiado grande incluso comprimida.");
  onProgress?.(80);
  return { encrypted, dataUrl };
}


/**
 * Guarda una imagen cifrada en la subcolección gallery de Firestore.
 *
 * @param {string} inviteToken - Token de la invitación.
 * @param {string} encrypted - Imagen cifrada en base64.
 * @param {string} dataUrl - Data URL original sin cifrar (para preview inmediato).
 * @param {Function} [onProgress] - Callback opcional para progreso (0–100).
 * @returns {Promise<string>} El dataUrl original.
 */
export async function addGalleryImage(inviteToken, encrypted, dataUrl, onProgress) {
  onProgress?.(85);
  console.log("[upload] guardando en Firestore...");
  await addDoc(GALLERY_COL(inviteToken), { data: encrypted, createdAt: new Date().toISOString() });
  onProgress?.(95);
  console.log("[upload] guardado OK");
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
