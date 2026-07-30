import i18n from "../i18n";
import { addDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, writeBatch, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { compressImage } from "./image-utils";
import { encrypt, decrypt } from "./crypto-utils";

function galCol(token: string) {
  return collection(db, "invitations", token, "gallery");
}

export async function uploadImage(inviteToken: string, file: File, onProgress?: (percent: number) => void) {
  console.log("[app]", "[image-store]", "uploadImage start", { name: file.name, size: file.size, type: file.type });
  onProgress?.(10);
  const dataUrl = await compressImage(file);
  console.log("[app]", "[image-store]", "compressImage done", { dataUrlLength: dataUrl.length });
  onProgress?.(40);
  try {
    var encrypted = await encrypt(dataUrl, inviteToken);
  } catch (e) {
    console.error("[app]", "[image-store]", "uploadImage encrypt failed:", e);
    throw new Error(i18n.t("errors.encryptFailed"));
  }
  if (!encrypted) throw new Error(i18n.t("errors.encryptFailed"));
  console.log("[app]", "[image-store]", "uploadImage encrypt done", { encryptedLength: encrypted.length });
  onProgress?.(70);
  const size = Math.round((encrypted.length * 3) / 4);
  console.log("[app]", "[image-store]", "uploadImage size check", { size, limit: 900 * 1024 });
  if (size > 900 * 1024) { console.error("[app]", "[image-store]", "uploadImage too large", { size }); throw new Error(i18n.t("errors.imageTooLarge")); }
  onProgress?.(80);
  console.log("[app]", "[image-store]", "uploadImage success", {});
  return { encrypted, dataUrl };
}

export async function addGalleryImage(inviteToken: string, encrypted: string, dataUrl: string, position: number, onProgress: (p: number) => void, originalName?: string, originalSize?: number) {
  console.log("[app]", "[image-store]", "addGalleryImage start", { position, originalName });
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
  console.log("[app]", "[image-store]", "addGalleryImage success", { id: docRef.id });
  return { id: docRef.id, dataUrl };
}

export async function updateGalleryDescription(inviteToken: string, imageId: string, description: string) {
  console.log("[app]", "[image-store]", "updateGalleryDescription", { imageId, descriptionLength: description.length });
  const safe = String(description || "").slice(0, 200).trim();
  await updateDoc(doc(galCol(inviteToken), imageId), { description: safe });
  console.log("[app]", "[image-store]", "updateGalleryDescription success", {});
}

export async function updateGalleryOrder(inviteToken: string, items: { id: string; position: number }[]) {
  console.log("[app]", "[image-store]", "updateGalleryOrder start", { count: items.length });
  if (!items.length) { console.log("[app]", "[image-store]", "updateGalleryOrder: no items", {}); return; }
  const batch = writeBatch(db);
  for (const { id, position } of items) {
    batch.update(doc(galCol(inviteToken), id), { position });
  }
  await batch.commit();
  console.log("[app]", "[image-store]", "updateGalleryOrder success", {});
}

export async function loadDecryptedField(inviteToken: string, encrypted: string) {
  if (!encrypted) return "";
  try { return await decrypt(encrypted, inviteToken); } catch { return ""; }
}

export async function loadGallery(inviteToken: string) {
  console.log("[app]", "[image-store]", "loadGallery start", {});
  try {
    const snap = await getDocs(galCol(inviteToken));
    console.log("[app]", "[image-store]", "loadGallery docs count", { count: snap.docs.length });
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
        } catch { console.log("[app]", "[image-store]", "loadGallery decrypt failed for doc", { id: d.id }); }
      }
    }
    result.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    console.log("[app]", "[image-store]", "loadGallery success", { count: result.length });
    return result;
  } catch (err) { console.error("[app]", "[image-store]", "loadGallery error", { error: err }); return []; }
}

export async function deleteGallery(inviteToken: string) {
  console.log("[app]", "[image-store]", "deleteGallery start", {});
  const snap = await getDocs(galCol(inviteToken));
  if (snap.empty) { console.log("[app]", "[image-store]", "deleteGallery: no docs", {}); return; }
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log("[app]", "[image-store]", "deleteGallery success", { deletedCount: snap.docs.length });
}

export async function deleteGalleryImage(inviteToken: string, imageId: string) {
  console.log("[app]", "[image-store]", "deleteGalleryImage", { imageId });
  await deleteDoc(doc(galCol(inviteToken), imageId));
  console.log("[app]", "[image-store]", "deleteGalleryImage success", {});
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
  console.log("[app]", "[image-store]", "saveConfigImage start", { imageId, dataUrlLength: dataUrl.length });
  let encrypted;
  try {
    encrypted = await encrypt(dataUrl, inviteToken);
  } catch (e) {
    console.error("[app]", "[image-store]", "saveConfigImage encrypt failed:", e);
    throw new Error(i18n.t("errors.encryptFailed"));
  }
  if (!encrypted) throw new Error(i18n.t("errors.encryptFailed"));
  console.log("[app]", "[image-store]", "saveConfigImage encrypt done", { encryptedLength: encrypted.length });
  const ref = doc(cfgImgCol(inviteToken), imageId);
  try {
    await setDoc(ref, { data: encrypted, createdAt: serverTimestamp() });
    console.log("[app]", "[image-store]", "saveConfigImage setDoc OK", { imageId });
  } catch (e) {
    console.error("[app]", "[image-store]", "saveConfigImage setDoc FAILED:", e);
    throw e;
  }
  return makeConfigImageRef(imageId);
}

export async function getConfigImage(
  inviteToken: string, imageId: string,
): Promise<string | null> {
  console.log("[app]", "[image-store]", "getConfigImage start", { imageId });
  try {
    const snap = await getDoc(doc(cfgImgCol(inviteToken), imageId));
    if (!snap.exists()) { console.log("[app]", "[image-store]", "getConfigImage: not found", { imageId }); return null; }
    const encrypted = snap.data().data;
    if (typeof encrypted !== "string") { console.log("[app]", "[image-store]", "getConfigImage: invalid data", {}); return null; }
    const decrypted = await decrypt(encrypted, inviteToken);
    console.log("[app]", "[image-store]", "getConfigImage success", { imageId, decryptedLength: decrypted?.length });
    return decrypted;
  } catch (err) {
    console.error("[app]", "[image-store]", "getConfigImage error", { imageId, error: err });
    return null;
  }
}

export async function deleteConfigImage(inviteToken: string, imageId: string): Promise<void> {
  console.log("[app]", "[image-store]", "deleteConfigImage", { imageId });
  try {
    await deleteDoc(doc(cfgImgCol(inviteToken), imageId));
    console.log("[app]", "[image-store]", "deleteConfigImage success", {});
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
  console.log("[app]", "[image-store]", "resolveAllConfigImages start", {});
  const result: Record<string, string | undefined> = {};
  for (const id of CONFIG_IMAGE_IDS) {
    const val = config[id] as string | undefined;
    if (val && isConfigImageRef(val)) {
      console.log("[app]", "[image-store]", "resolving config image", { id });
      result[id] = (await getConfigImage(inviteToken, id)) || undefined;
    }
  }
  console.log("[app]", "[image-store]", "resolveAllConfigImages done", { resolvedCount: Object.keys(result).length });
  return result;
}

export async function deleteAllConfigImages(inviteToken: string): Promise<void> {
  console.log("[app]", "[image-store]", "deleteAllConfigImages start", {});
  const snap = await getDocs(cfgImgCol(inviteToken));
  if (snap.empty) { console.log("[app]", "[image-store]", "deleteAllConfigImages: no images", {}); return; }
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log("[app]", "[image-store]", "deleteAllConfigImages success", { deletedCount: snap.docs.length });
}
