import i18n from "../i18n";
import {
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  compressImage,
  HIGH_QUALITY_MAX_DIMENSION,
  HIGH_QUALITY_TARGET_BYTES,
  MAX_ENCRYPTED_BYTES,
} from "./image-utils";
import { encrypt, decrypt } from "./crypto-utils";
import { withWriteRetry } from "./async-utils";

function galCol(token: string) {
  return collection(db, "invitations", token, "gallery");
}

export async function uploadImage(
  inviteToken: string,
  file: File,
  onProgress?: (percent: number) => void,
  maxDimension = HIGH_QUALITY_MAX_DIMENSION,
  targetBytes = HIGH_QUALITY_TARGET_BYTES,
) {
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
  // El campo `data` guarda el base64 cifrado y Firestore limita a 1MB por valor;
  // se comprueba la longitud del base64 directamente para no tocar ese límite.
  if (encrypted.length > MAX_ENCRYPTED_BYTES) {
    console.error("[app]", "[image-store]", "uploadImage too large", { size: encrypted.length });
    throw new Error(i18n.t("errors.imageTooLarge"));
  }
  onProgress?.(80);

  return { encrypted, dataUrl };
}

export async function addGalleryImage(
  inviteToken: string,
  encrypted: string,
  dataUrl: string,
  position: number,
  onProgress: (p: number) => void,
  originalName?: string,
  originalSize?: number,
) {
  onProgress?.(85);
  const docRef = await withWriteRetry(() =>
    addDoc(galCol(inviteToken), {
      data: encrypted,
      description: "",
      position: position ?? 0,
      createdAt: new Date().toISOString(),
      originalName: originalName || "",
      originalSize: originalSize || 0,
    }),
  );
  onProgress?.(95);
  META_CACHE.delete(inviteToken);

  return { id: docRef.id, dataUrl };
}

export async function updateGalleryDescription(inviteToken: string, imageId: string, description: string) {
  const safe = String(description || "")
    .slice(0, 200)
    .trim();
  await updateDoc(doc(galCol(inviteToken), imageId), { description: safe });
  META_CACHE.delete(inviteToken);
}

export async function updateGalleryOrder(inviteToken: string, items: { id: string; position: number }[]) {
  if (!items.length) {
    return;
  }
  const batch = writeBatch(db);
  for (const { id, position } of items) {
    batch.update(doc(galCol(inviteToken), id), { position });
  }
  await batch.commit();
  META_CACHE.delete(inviteToken);
}

export async function loadDecryptedField(inviteToken: string, encrypted: string) {
  if (!encrypted) return "";
  try {
    return await decrypt(encrypted, inviteToken);
  } catch {
    return "";
  }
}

export async function loadGallery(inviteToken: string) {
  try {
    const metas = await loadGalleryMeta(inviteToken);
    const result: GalleryLoadedImage[] = [];
    // Lote acotado con descifrado en paralelo (chunks de 3): WebCrypto no
    // bloquea el hilo, pero se evita acumular ~30 MB de data URLs a la vez.
    for (let i = 0; i < metas.length; i += 3) {
      const chunk = metas.slice(i, i + 3);
      const urls = await Promise.all(chunk.map((m) => getGalleryImageUrl(inviteToken, m)));
      chunk.forEach((m, j) => {
        if (urls[j]) {
          result.push({
            id: m.id,
            url: urls[j],
            ...(m.position !== undefined ? { position: m.position } : {}),
            description: m.description,
            ...(m.originalName !== undefined ? { originalName: m.originalName } : {}),
            ...(m.originalSize !== undefined ? { originalSize: m.originalSize } : {}),
          });
        }
      });
    }
    result.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    return result;
  } catch (err) {
    console.error("[app]", "[image-store]", "loadGallery error", { error: err });
    return [];
  }
}

/** Metadatos de una imagen de la galería (sin descifrar). */
export interface GalleryMeta {
  id: string;
  encrypted: string;
  position?: number;
  description: string;
  originalName?: string;
  originalSize?: number;
}

/** Imagen de la galería con su data URL descifrada. */
export interface GalleryLoadedImage extends Omit<GalleryMeta, "encrypted"> {
  url: string;
}

// Caché a nivel de módulo de URLs descifradas (clave `${token}:${id}`) con
// un simple LRU: el visitante que navega por el carrusel no re-descifra.
const URL_CACHE = new Map<string, string>();
/** Promesas en curso (single-flight): dos efectos no descifran lo mismo. */
const INFLIGHT = new Map<string, Promise<string>>();
const MAX_CACHE = 80;

/** Invalida la caché de URLs (logout o cambio de invitación). */
export function clearGalleryCache() {
  URL_CACHE.clear();
  INFLIGHT.clear();
  META_CACHE.clear();
}

/**
 * Carga SOLO los metadatos de la galería (una lectura, cero descifrado).
 * Permite renderizar el carrusel al instante y descifrar bajo demanda.
 *
 * La invitación pública consulta esta función DOS veces en cada carga: una
 * para decidir si la sección tiene imágenes (PublicInvitation) y otra dentro
 * de la galería para renderizarla. La caché de módulo evita la segunda
 * lectura de Firestore en la misma visita.
 */
const META_CACHE = new Map<string, { at: number; metas: GalleryMeta[] }>();
const META_TTL_MS = 30_000;

export async function loadGalleryMeta(inviteToken: string): Promise<GalleryMeta[]> {
  const hit = META_CACHE.get(inviteToken);
  if (hit && Date.now() - hit.at < META_TTL_MS) return hit.metas;
  try {
    const snap = await getDocs(galCol(inviteToken));
    const items: GalleryMeta[] = [];
    for (const d of snap.docs) {
      const enc = d.data().data;
      if (typeof enc === "string" && enc) {
        items.push({
          id: d.id,
          encrypted: enc,
          position: d.data().position,
          description: d.data().description || "",
          originalName: d.data().originalName || "",
          originalSize: d.data().originalSize || 0,
        });
      }
    }
    items.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    META_CACHE.set(inviteToken, { at: Date.now(), metas: items });
    return items;
  } catch (err) {
    console.error("[app]", "[image-store]", "loadGalleryMeta error", { error: err });
    return [];
  }
}

/**
 * Descifra UNA imagen con caché y single-flight. Los fallos devuelven "" y no
 * se cachean (un re-mount lo reintenta gratis).
 */
export async function getGalleryImageUrl(inviteToken: string, meta: GalleryMeta): Promise<string> {
  const key = `${inviteToken}:${meta.id}`;
  if (URL_CACHE.has(key)) return URL_CACHE.get(key)!;
  if (INFLIGHT.has(key)) return INFLIGHT.get(key)!;
  const promise = (async () => {
    try {
      const url = await decrypt(meta.encrypted, inviteToken);
      if (url) {
        URL_CACHE.set(key, url);
        // LRU simple: al exceder la cota se descarta la entrada más antigua.
        if (URL_CACHE.size > MAX_CACHE) {
          const oldest = URL_CACHE.keys().next().value;
          if (oldest !== undefined) URL_CACHE.delete(oldest);
        }
      }
      return url;
    } catch {
      return "";
    } finally {
      INFLIGHT.delete(key);
    }
  })();
  INFLIGHT.set(key, promise);
  return promise;
}

export async function deleteGallery(inviteToken: string) {
  const snap = await getDocs(galCol(inviteToken));
  if (snap.empty) {
    return;
  }
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  META_CACHE.delete(inviteToken);
}

export async function deleteGalleryImage(inviteToken: string, imageId: string) {
  await deleteDoc(doc(galCol(inviteToken), imageId));
  META_CACHE.delete(inviteToken);
}

// ─── Config images subcollection ─────────────────────────

const CONFIG_IMG_PREFIX = "__cfgimg:";

export function isConfigImageRef(value: string): boolean {
  return typeof value === "string" && value.startsWith(CONFIG_IMG_PREFIX);
}

export function makeConfigImageRef(imageId: string, rev?: number): string {
  // La revisión (rev) cambia en cada subida: el preview (useConfigImage) se
  // re-resuelve al re-subir la misma imagen, aunque el id no varíe.
  return rev !== undefined ? `${CONFIG_IMG_PREFIX}${imageId}:${rev}` : `${CONFIG_IMG_PREFIX}${imageId}`;
}

/** Extrae el id de una referencia __cfgimg:{id}[:{rev}] (compatible con el
 *  formato antiguo sin revisión). */
export function configImageIdFromRef(value: string): string {
  return value.slice(CONFIG_IMG_PREFIX.length).split(":")[0] ?? "";
}

function cfgImgCol(token: string) {
  return collection(db, "invitations", token, "configImages");
}

export async function saveConfigImage(inviteToken: string, imageId: string, dataUrl: string): Promise<string> {
  let encrypted;
  try {
    encrypted = await encrypt(dataUrl, inviteToken);
  } catch (e) {
    console.error("[app]", "[image-store]", "saveConfigImage encrypt failed:", e);
    throw new Error(i18n.t("errors.encryptFailed"));
  }
  if (!encrypted) throw new Error(i18n.t("errors.encryptFailed"));
  // El campo `data` guarda el base64 cifrado y Firestore limita a 1MB por valor;
  // se valida aquí con un error amigable antes de que Firestore lo rechace.
  if (encrypted.length > MAX_ENCRYPTED_BYTES) {
    console.error("[app]", "[image-store]", "saveConfigImage too large", { imageId, size: encrypted.length });
    throw new Error(i18n.t("errors.imageTooLarge"));
  }

  const ref = doc(cfgImgCol(inviteToken), imageId);
  try {
    await withWriteRetry(() => setDoc(ref, { data: encrypted, createdAt: serverTimestamp() }));
  } catch (e) {
    console.error("[app]", "[image-store]", "saveConfigImage setDoc FAILED:", e);
    throw e;
  }
  // Ref con revisión nueva: invalida la caché de URLs y hace que el preview
  // se refresque en la misma sesión (fix de imagen obsoleta tras re-subir).
  CONFIG_IMG_CACHE.delete(`${inviteToken}:${imageId}`);
  return makeConfigImageRef(imageId, Date.now());
}

/**
 * Reintenta una lectura de imagen ante fallos transitorios de red.
 * Espera creciente (300ms, 600ms) — un blip de conexión no debe romper
 * la imagen de forma permanente (el consumidor no vuelve a pedirla).
 */
const CONFIG_IMAGE_RETRY_DELAYS_MS = [300, 600];

// Caché a nivel de módulo de las imágenes de config descifradas (clave
// `${token}:${imageId}`): cada reload re-leía Firestore y re-derivaba la clave
// para las 4 imágenes de portada/fondo/sello.
const CONFIG_IMG_CACHE = new Map<string, string>();

export function clearConfigImageCache() {
  CONFIG_IMG_CACHE.clear();
}

// Promesas en curso (single-flight): dos efectos que piden la misma imagen de
// configuración no lanzan dos lecturas+descifrados concurrentes.
const CONFIG_IMG_INFLIGHT = new Map<string, Promise<string | null>>();

export async function getConfigImage(inviteToken: string, imageId: string): Promise<string | null> {
  const cacheKey = `${inviteToken}:${imageId}`;
  const cached = CONFIG_IMG_CACHE.get(cacheKey);
  if (cached) return cached;
  const inflight = CONFIG_IMG_INFLIGHT.get(cacheKey);
  if (inflight) return inflight;
  const promise = loadConfigImageWithRetry(inviteToken, imageId, cacheKey);
  CONFIG_IMG_INFLIGHT.set(cacheKey, promise);
  promise.finally(() => CONFIG_IMG_INFLIGHT.delete(cacheKey)).catch(() => {});
  return promise;
}

/** Lectura + descifrado de una imagen de configuración con reintentos. */
async function loadConfigImageWithRetry(inviteToken: string, imageId: string, cacheKey: string): Promise<string | null> {
  const attempts = CONFIG_IMAGE_RETRY_DELAYS_MS.length + 1;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const snap = await getDoc(doc(cfgImgCol(inviteToken), imageId));
      if (!snap.exists()) {
        return null;
      }
      const encrypted = snap.data().data;
      if (typeof encrypted !== "string") {
        return null;
      }
      const url = await decrypt(encrypted, inviteToken);
      if (url) {
        CONFIG_IMG_CACHE.set(cacheKey, url);
        if (CONFIG_IMG_CACHE.size > 12) {
          const oldest = CONFIG_IMG_CACHE.keys().next().value;
          if (oldest !== undefined) CONFIG_IMG_CACHE.delete(oldest);
        }
      }
      return url;
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
  await deleteDoc(doc(cfgImgCol(inviteToken), imageId));
  CONFIG_IMG_CACHE.delete(`${inviteToken}:${imageId}`);
}

export async function resolveConfigImageField(
  inviteToken: string | undefined,
  fieldValue: string | undefined,
): Promise<string | undefined> {
  if (!fieldValue || !inviteToken) return fieldValue;
  if (!isConfigImageRef(fieldValue)) return fieldValue;
  const imageId = configImageIdFromRef(fieldValue);
  return (await getConfigImage(inviteToken, imageId)) || undefined;
}

export const CONFIG_IMAGE_IDS = ["couplePhoto", "backgroundImage", "customSeal", "cornerDecoration"] as const;

export async function resolveAllConfigImages(
  inviteToken: string,
  config: Record<string, unknown>,
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
  if (snap.empty) {
    return;
  }
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  META_CACHE.delete(inviteToken);
}
