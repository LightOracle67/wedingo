/**
 * setup-token.ts
 * ─────────────────────────────────────────────────────────────
 * Gestión de tokens de setup basada en hash.
 *
 * El token de setup ya NO se almacena en el documento público de la
 * invitación (vulnerabilidad de lectura abierta). En su lugar se guarda
 * un registro en la colección `setupTokens` cuyo documentId es el hash
 * SHA-256 del token (entropía ~2^158, infalsificable por enumeración).
 *
 * - `createSetupTokenRecord`: crea el registro tras generar un token.
 * - `deleteSetupTokenRecord`: elimina el registro (regeneración).
 * - `findInviteBySetupToken`: localiza la invitación a partir del token.
 *
 * @module setup-token
 */

import { doc, getDoc, setDoc, deleteDoc, type DocumentReference, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";
import { normalizeTokenValue } from "./token-utils";

/** Colección de registros de tokens de setup. */
const SETUP_TOKENS_COLLECTION = "setupTokens";

/**
 * Calcula el hash SHA-256 hexadecimal del token normalizado.
 * Se usa Web Crypto (requiere contexto seguro HTTPS).
 *
 * @param token - Token en bruto tal y como lo escribe el usuario.
 * @returns Hash SHA-256 hexadecimal en minúsculas (64 caracteres).
 */
export async function hashSetupToken(token: string): Promise<string> {
  const normalized = normalizeTokenValue(token);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Referencia al documento de token (documentId = hash del token).
 *
 * @param hash - Hash SHA-256 hexadecimal del token.
 * @returns Referencia al documento en setupTokens.
 */
export function setupTokenRef(hash: string): DocumentReference<DocumentData> {
  return doc(db, SETUP_TOKENS_COLLECTION, hash);
}

/**
 * Crea el registro `setupTokens/{hash}` que asocia el token con su
 * invitación. Solo es posible si la invitación aún no existe (alta
 * inicial) o si el admin ya tiene una sesión activa (regeneración).
 *
 * @param inviteToken - Token público de la invitación (documentId).
 * @param token - Token de setup en bruto.
 * @returns El hash SHA-256 del token registrado.
 */
export async function createSetupTokenRecord(inviteToken: string, token: string): Promise<string> {
  const hash = await hashSetupToken(token);
  await setDoc(setupTokenRef(hash), {
    inviteToken,
    createdAt: new Date().toISOString(),
  });
  return hash;
}

/**
 * Elimina el registro `setupTokens/{hash}` de un token (regeneración o
 * logout total). Requiere sesión activa según las reglas.
 *
 * @param token - Token de setup en bruto a eliminar.
 */
export async function deleteSetupTokenRecord(token: string): Promise<void> {
  const hash = await hashSetupToken(token);
  await deleteDoc(setupTokenRef(hash));
}

/**
 * Localiza la invitación asociada a un token de setup.
 *
 * @param token - Token de setup introducido por el usuario.
 * @returns El inviteToken público de la invitación, o null si no existe.
 */
export async function findInviteBySetupToken(token: string): Promise<string | null> {
  const hash = await hashSetupToken(token);
  const snap = await getDoc(setupTokenRef(hash));
  if (!snap.exists()) {
    return null;
  }
  const inviteToken = snap.data()?.inviteToken;
  return typeof inviteToken === "string" && inviteToken ? inviteToken : null;
}
