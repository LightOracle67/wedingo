import { getDocs, collection, writeBatch, doc, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { encrypt, decrypt } from "./crypto-utils";
import { AUDIO_CHUNK_SIZE_BYTES, MAX_UPLOAD_SIZE_BYTES } from "./constants";
import { safeLogError } from "./safe-error";

const CHUNK_SIZE = AUDIO_CHUNK_SIZE_BYTES;
function audioCol(token: string) {
  return collection(db, "invitations", token, "audio");
}

export async function uploadAudio(inviteToken: string, file: File, onProgress?: (pct: number) => void) {
  // Validación base (defensa en profundidad): tipo de audio y tamaño acotado.
  if (!file || !file.type.startsWith("audio/")) {
    throw new Error("Invalid audio format");
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Audio file too large");
  }
  onProgress?.(10);
  const { compressAudio } = await import("./audio-utils");
  const dataUrl = await compressAudio(file);

  onProgress?.(40);
  const encrypted = await encrypt(dataUrl, inviteToken);
  if (!encrypted) {
    safeLogError(["[app]", "[music-store]", "uploadAudio encrypt failed"], new Error("encrypt returned empty"));
    throw new Error("Encryption failed");
  }

  onProgress?.(70);

  return { encrypted, dataUrl };
}

export async function addAudio(
  inviteToken: string,
  encrypted: string,
  dataUrl: string,
  onProgress?: (pct: number) => void,
) {
  // Los chunks previos NO se borran al inicio: si la subida falla, el audio
  // antiguo se conserva. Se escriben primero los chunks nuevos (con un id de
  // intento único) y solo al final se borran los anteriores. loadAudio usa
  // siempre el intento más reciente, así que no hay mezcla.
  const prev = await getDocs(audioCol(inviteToken));
  const attemptId = Date.now();

  const chunks: string[] = [];
  for (let i = 0; i < encrypted.length; i += CHUNK_SIZE) {
    chunks.push(encrypted.slice(i, i + CHUNK_SIZE));
  }

  // Firestore limita cada request a 10 MiB: 400 chunks × 200 KB = 80 MB
  // superaba el límite y las canciones >2 min no subían. ~40 chunks (8 MB)
  // mantiene cada batch por debajo del tope.
  const BATCH_LIMIT = 40;
  for (let batchIdx = 0; batchIdx < chunks.length; batchIdx += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const end = Math.min(batchIdx + BATCH_LIMIT, chunks.length);
    for (let i = batchIdx; i < end; i++) {
      const ref = doc(audioCol(inviteToken));
      batch.set(ref, {
        chunkIndex: i,
        data: chunks[i],
        totalChunks: chunks.length,
        attempt: attemptId,
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  }
  onProgress?.(95);

  // Subida completada: ahora sí se retiran los chunks anteriores (los nuevos
  // tienen ids auto-generados y no colisionan). Si este borrado fallara, los
  // chunks viejos quedan como basura pero el audio nuevo se conserva.
  if (!prev.empty) {
    const cleanup = writeBatch(db);
    prev.docs.forEach((d) => cleanup.delete(d.ref));
    await cleanup.commit();
  }
  // Invalida la caché de módulo: el audio recién subido debe reemplazar al viejo.
  AUDIO_CACHE.delete(inviteToken);

  return { id: `${inviteToken}_audio`, dataUrl, chunks: chunks.length };
}

// Caché de módulo del audio descargado/descifrado (clave: token). v2.185:
// antes CADA carga de invitación (incluido el cache-hit de <2 min) re-leía
// ~40-53 chunks de 200 KB (~8-10 MB) de Firestore y los re-descifraba. No se
// persiste en localStorage (el resultado es un data-URL de ~10 MB); vive solo
// en memoria y se invalida al subir/borrar audio en la misma sesión.
const AUDIO_CACHE = new Map<string, { at: number; url: string }>();
/** TTL corto: la caché evita re-descargas en la misma sesión sin arriesgar
 *  que una subida desde otra pestaña quede oculta demasiado tiempo. */
const AUDIO_CACHE_TTL_MS = 60_000;
/** Promesas en curso (single-flight): dos hidrataciones no descargan doble. */
const AUDIO_INFLIGHT = new Map<string, Promise<{ id: string; url: string } | null>>();

export function clearAudioCache() {
  AUDIO_CACHE.clear();
  AUDIO_INFLIGHT.clear();
}

export async function loadAudio(inviteToken: string) {
  const hit = AUDIO_CACHE.get(inviteToken);
  if (hit && Date.now() - hit.at < AUDIO_CACHE_TTL_MS) {
    return { id: `${inviteToken}_audio`, url: hit.url };
  }
  const inflight = AUDIO_INFLIGHT.get(inviteToken);
  if (inflight) return inflight;
  const promise = loadAudioUncached(inviteToken);
  AUDIO_INFLIGHT.set(inviteToken, promise);
  promise
    .then((res) => {
      if (res?.url) {
        AUDIO_CACHE.set(inviteToken, { at: Date.now(), url: res.url });
      }
    })
    .finally(() => AUDIO_INFLIGHT.delete(inviteToken))
    .catch(() => {});
  return promise;
}

async function loadAudioUncached(inviteToken: string) {
  try {
    const q = query(audioCol(inviteToken), orderBy("chunkIndex", "asc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }
    // Usa SOLO los chunks del intento de subida más reciente: al re-subir una
    // canción quedan temporalmente los chunks antiguos y los nuevos (add-first
    // para no perder el audio si la subida falla), y sin este filtro se
    // mezclarían. Los chunks antiguos sin campo `attempt` se tratan como 0.
    let latestAttempt = -Infinity;
    for (const d of snap.docs) {
      const a = typeof d.data().attempt === "number" ? d.data().attempt : 0;
      if (a > latestAttempt) latestAttempt = a;
    }
    const chunks = snap.docs
      .filter((d) => {
        const a = typeof d.data().attempt === "number" ? d.data().attempt : 0;
        return a === latestAttempt;
      })
      .map((d) => d.data().data as string);

    const concatenated = chunks.join("");
    const url = await decrypt(concatenated, inviteToken);
    if (url) {
      return { id: `${inviteToken}_audio`, url };
    }

    return null;
  } catch (err) {
    safeLogError(["[app]", "[music-store]", "loadAudio error"], err);
    return null;
  }
}

export async function deleteAudio(inviteToken: string) {
  // Invalida la caché de módulo: nada que reproducir tras el borrado.
  AUDIO_CACHE.delete(inviteToken);
  try {
    const snap = await getDocs(audioCol(inviteToken));
    if (snap.empty) {
      return;
    }
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    // Un borrado parcial dejaría chunks huérfanos: se relanza para que el
    // llamador (cascada de borrado) lo trate como fallo.
    safeLogError(["[app]", "[music-store]", "deleteAudio error"], err);
    throw err;
  }
}
