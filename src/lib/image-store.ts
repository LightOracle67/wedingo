import i18n from "../i18n";
import { addDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, writeBatch, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { compressImage, HIGH_QUALITY_MAX_DIMENSION, HIGH_QUALITY_TARGET_BYTES } from "./image-utils";
import { encrypt, decrypt } from "./crypto-utils";

function galCol(token: string) {
  return collection(db, "invitations", token, "gallery");
}

export async function uploadImage(inviteToken: string, file: File, onProgress?: (percent: number) => void, maxDimension = HIGH_QUALITY_MAX_DIMENSION, targetBytes = HIGH_QUALITY_TARGET_BYTES) {

  onProgress?.(10);
  const dataUrl = await compressImage(file, maxDimension, targetBytes);

  onProgress?.(40);
  try {
    var encrypted = await encrypt(dataUrl, inviteToken);
  } catch (e) {
    console.error("[app]", "[image-store]", "uploadImage encrypt failed:", e);
    throw new Error(i18n.t("errors.encryptFailed"));
  }
  if (!encrypted) throw new Error(i18n.t("errors.encryptFailed"));

  onProgress?.(70);
  const size = Math.round((encrypted.length * 3) / 4);

  if (size > 900 * 1024) { console.error("[app]", "[image-store]", "uploadImage too large", { size }); throw new Error(i18n.t("errors.imageTooLarge")); }
  onProgress?.(80);

  return { encrypted, dataUrl };
}

export async function addGalleryImage(inviteToken: string, encrypted: string, dataUrl: string, position: number, onProgress: (p: number) => void, originalName?: string, originalSize?: number) {

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

export async function updateGalleryDescription(inviteToken: string, imageId: string, description: string) {

  const safe = String(description || "").slice(0, 200).trim();
  await updateDoc(doc(galCol(inviteToken), imageId), { description: safe });

}

export async function updateGalleryOrder(inviteToken: string, items: { id: string; position: number }[]) {

  if (!items.length) { ; return; }
  const batch = writeBatch(db);
  for (const { id, position } of items) {
    batch.update(doc(galCol(inviteToken), id), { position });
  }
  await batch.commit();

}

export async function loadDecryptedField(inviteToken: string, encrypted: string) {
  if (!encrypted) return "";
  try { return await decrypt(encrypted, inviteToken); } catch { return ""; }
}

export async function loadGallery(inviteToken: string) {

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
        } catch { ; }
      }
    }
    result.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

    return result;
  } catch (err) { console.error("[app]", "[image-store]", "loadGallery error", { error: err }); return []; }
}

export async function deleteGallery(inviteToken: string) {

  const snap = await getDocs(galCol(inviteToken));
  if (snap.empty) { ; return; }
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

}

export async function deleteGalleryImage(inviteToken: string, imageId: string) {

  await deleteDoc(doc(galCol(inviteToken), imageId));

}

// ─── Config images subcollection ─────────────────────────

const CONFIG_IMG_PREFIX = "__cfgimg:";

export function isConfigImageRef(value: string): boolean {
  return typeof value === "string" && value.startsWith(CONFIG_IMG_PREFIX);
}

export function makeConfigImageRef(imageId: string): string {
  return `${CONFIG_IMG_PREFIX}${imageId}`;
}

function cfgImgCol(token: string) {
  return collection(db, "invitations", token, "configImages");
}

export async function saveConfigImage(
  inviteToken: string, imageId: string, dataUrl: string,
): Promise<string> {

  let encrypted;
  try {
    encrypted = await encrypt(dataUrl, inviteToken);
  } catch (e) {
    console.error("[app]", "[image-store]", "saveConfigImage encrypt failed:", e);
    throw new Error(i18n.t("errors.encryptFailed"));
  }
  if (!encrypted) throw new Error(i18n.t("errors.encryptFailed"));

  const ref = doc(cfgImgCol(inviteToken), imageId);
  try {
    await setDoc(ref, { data: encrypted, createdAt: serverTimestamp() });

  } catch (e) {
    console.error("[app]", "[image-store]", "saveConfigImage setDoc FAILED:", e);
    throw e;
  }
  return makeConfigImageRef(imageId);
}

/**
 * Reintenta una lectura de imagen ante fallos transitorios de red.
 * Espera creciente (300ms, 600ms) — un blip de conexión no debe romper
 * la imagen de forma permanente (el consumidor no vuelve a pedirla).
 */
const CONFIG_IMAGE_RETRY_DELAYS_MS = [300, 600];

export async function getConfigImage(
  inviteToken: string, imageId: string,
): Promise<string | null> {

  const attempts = CONFIG_IMAGE_RETRY_DELAYS_MS.length + 1;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const snap = await getDoc(doc(cfgImgCol(inviteToken), imageId));
      if (!snap.exists()) { ; return null; }
      const encrypted = snap.data().data;
      if (typeof encrypted !== "string") { ; return null; }
      return await decrypt(encrypted, inviteToken);
    } catch (err) {
      lastError = err;
      // Reintento solo ante errores lanzados (red/deserialización); un
      // documento inexistente o sin data ya devolvió null arriba.
      if (attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, CONFIG_IMAGE_RETRY_DELAYS_MS[attempt]));
      }
    }
  }
  console.error("[app]", "[image-store]", "getConfigImage error", { imageId, error: lastError });
  return null;
}

export async function deleteConfigImage(inviteToken: string, imageId: string): Promise<void> {

  try {
    await deleteDoc(doc(cfgImgCol(inviteToken), imageId));

  } catch (err) { console.error("[app]", "[image-store]", "deleteConfigImage error", { error: err }); }
}

export async function resolveConfigImageField(
  inviteToken: string | undefined, fieldValue: string | undefined,
): Promise<string | undefined> {
  if (!fieldValue || !inviteToken) return fieldValue;
  if (!isConfigImageRef(fieldValue)) return fieldValue;
  const imageId = fieldValue.slice(CONFIG_IMG_PREFIX.length);
  return (await getConfigImage(inviteToken, imageId)) || undefined;
}

export const CONFIG_IMAGE_IDS = [
  "couplePhoto", "backgroundImage", "customSeal", "cornerDecoration",
] as const;

export async function resolveAllConfigImages(
  inviteToken: string, config: Record<string, unknown>,
): Promise<Record<string, string | undefined>> {

  const result: Record<string, string | undefined> = {};
  for (const id of CONFIG_IMAGE_IDS) {
    const val = config[id] as string | undefined;
    if (val && isConfigImageRef(val)) {

      result[id] = (await getConfigImage(inviteToken, id)) || undefined;
    }
  }

  return result;
}

export async function deleteAllConfigImages(inviteToken: string): Promise<void> {

  const snap = await getDocs(cfgImgCol(inviteToken));
  if (snap.empty) { ; return; }
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

}
