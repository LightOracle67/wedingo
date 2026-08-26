/**
 * crypto-utils.ts
 * ─────────────────────────────────────────────────────────────
 * Cifrado AES-GCM para datos sensibles de la invitación (bankInfo/IBAN y
 * multimedia) usando WebCrypto (PBKDF2-SHA256 + AES-GCM-256).
 *
 * NATURALEZA DEL CIFRADO (decisión C1 — ofuscación intencional):
 * La clave se deriva del `token` de la invitación. Ese token NO es un secreto
 * de servidor: es la CREDENCIAL DE ACCESO que se comparte con los invitados a
 * través de la URL (`/TOKEN`). Cualquiera que posea el token legítimamente ya
 * puede leer el IBAN desde la app pública, por lo que este cifrado NO aporta
 * confidencialidad frente a quien tiene acceso; su propósito real es:
 *   1) Mantener los datos ilegibles en reposo para quien NO tiene el token
 *      (Firestore/documento expuesto, copias, respaldos, inspección).
 *   2) Que un leak pasivo de un único dato (p.ej. el payload de un doc) sea
 *      ilegible sin conocer la URL de acceso.
 * El resto de protección (quién lee) lo garantizan las reglas de Firestore.
 *
 * RIESGO RESIDUAL y mitigación: al ser la clave derivada del token público,
 * la confidencialidad real NO depende de este cifrado sino de que el token
 * no se filtre. Por eso NO se registra el token en logs ni se envía a
 * analytics/Sentry (ver redactSecretsFromUrl en sentry.ts), y las URLs se
 * redactan antes de salir del navegador. No añadir nunca el token en claro
 * a mensajes de error o eventos.
 *
 * @module crypto-utils
 */

import { safeLogError } from "./safe-error";

const ALGORITHM = { name: "AES-GCM", length: 256 };
const SALT_LEN = 16;
const IV_LEN = 12;
const ITER_LEN = 3;
const HEADER_LEN = SALT_LEN + IV_LEN + ITER_LEN;
// Format: salt(16B) || iv(12B) || iterations(3B) || AES-GCM ciphertext
const ITERATIONS_NEW = 600000;

// ── PERF (P1) ────────────────────────────────────────────────
// Antes se derivaba una clave PBKDF2-600k POR SALT ALEATORIO: como cada
// `encrypt` genera un salt distinto, una galería de N fotos pagaba N
// derivaciones (~0.1-0.5 s c/u en móvil) la primera vez que se descifraba.
// Ahora la clave se deriva UNA vez por TOKEN (salt derivado estable del
// token) y se reutiliza con un IV aleatorio por mensaje (el esquema correcto
// de AES-GCM). La caché por token la hace virtualmente gratuita en el resto
// de descifrados (reload, re-hidratación) sin repetir PBKDF2.

/** Salt fijo derivado del token que identifica el formato "clave por token".
 *  Es determinista (mismo token → mismo salt) y bien distribuido (FNV-1a 32-bit
 *  extendido a 16 bytes). NO es un secreto adicional: el token ya es la
 *  credencial, así que esto solo garantiza salts estables por token sin
 *  depender de `crypto.subtle.digest` (que no es síncrono en todos los motores). */
function tokenSalt(token: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(SALT_LEN);
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Extiende los 32 bits del hash a 16 bytes con un mezclador de avalanche.
  let seed = h >>> 0;
  for (let i = 0; i < SALT_LEN; i++) {
    seed = Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d);
    seed = Math.imul(seed ^ (seed >>> 12), 0x297a2d39);
    seed ^= seed >>> 15;
    out[i] = seed & 0xff;
  }
  return out;
}

/** Caché de claves por `token` (formato nuevo): se deriva una sola vez por
 *  invitación y se reutiliza en todos sus mensajes. */
const TOKEN_KEY_CACHE = new Map<string, CryptoKey>();
const MAX_KEYS = 20;

async function deriveKeyFromSecret(secret: string, salt: BufferSource, iterations: number) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret.padEnd(32, "x").slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, keyMaterial, ALGORITHM, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Clave nueva por token (salt estable): se deriva una sola vez por token y
 *  se cachea. Todos los mensajes del mismo token la comparten, con IV propio. */
function getTokenKey(secret: string, iterations: number): Promise<CryptoKey> {
  const cached = TOKEN_KEY_CACHE.get(secret);
  if (cached) return Promise.resolve(cached);
  const salt = tokenSalt(secret);
  return deriveKeyFromSecret(secret, salt, iterations).then((key) => {
    if (TOKEN_KEY_CACHE.size >= MAX_KEYS) {
      const oldest = TOKEN_KEY_CACHE.keys().next().value;
      if (oldest !== undefined) TOKEN_KEY_CACHE.delete(oldest);
    }
    TOKEN_KEY_CACHE.set(secret, key);
    return key;
  });
}

function uint8ToBase64(bytes: Uint8Array) {
  const chunkSize = 8192;
  const chunks = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let s = "";
    for (let j = 0; j < chunk.length; j++) s += String.fromCharCode(chunk[j]!);
    chunks.push(s);
  }
  return btoa(chunks.join(""));
}

export async function encrypt(text: string, token: string) {
  if (!text) return text;
  if (!token) throw new Error("encrypt: token required");
  try {
    // Clave por token (una derivación PBKDF2-600k por token, cacheada) con IV
    // aleatorio por mensaje: la galería deja de pagar N derivaciones.
    const key = await getTokenKey(token, ITERATIONS_NEW);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const encoded = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt({ ...ALGORITHM, iv }, key, encoded);
    const salt = tokenSalt(token);
    const iterBytes = new Uint8Array(ITER_LEN);
    iterBytes[0] = ITERATIONS_NEW & 0xff;
    iterBytes[1] = (ITERATIONS_NEW >> 8) & 0xff;
    iterBytes[2] = (ITERATIONS_NEW >> 16) & 0xff;
    const combined = new Uint8Array(HEADER_LEN + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, SALT_LEN);
    combined.set(iterBytes, SALT_LEN + IV_LEN);
    combined.set(new Uint8Array(encrypted), HEADER_LEN);
    return uint8ToBase64(combined);
  } catch {
    // Un fallo aquí PONE EN BLANCO el dato cifrado (bankInfo/multimedia) en
    // silencio → pérdida de dato sin aviso. Se loggea SIN el token (es la
    // credencial de acceso, ver safe-error.ts) para diagnosticar.
    safeLogError(["[crypto-utils]"], new Error("encrypt failed; dato en blanco (token redactado)"));
    return "";
  }
}

export async function decrypt(ciphertext: string, token: string) {
  if (!ciphertext || !token || ciphertext.length < 24) return ciphertext;
  try {
    const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    if (raw.length < HEADER_LEN) throw new Error("too short");
    const salt = raw.slice(0, SALT_LEN);
    const iv = raw.slice(SALT_LEN, SALT_LEN + IV_LEN);
    const iterBytes = raw.slice(SALT_LEN + IV_LEN, HEADER_LEN);
    const iterations = iterBytes[0]! | (iterBytes[1]! << 8) | (iterBytes[2]! << 16);
    const data = raw.slice(HEADER_LEN);
    // Validación temprana del rango de iteraciones: evita derivar PBKDF2 con
    // valores basura si el ciphertext está corrupto o truncado.
    if (iterations < 1000 || iterations > 2_000_000) throw new Error("invalid iterations");
    if (data.length === 0) throw new Error("empty ciphertext");

    // Formato único vigente (P1): salt derivado del token y clave cacheada.
    // Los datos verificados en producción ya están todos en este formato;
    // cualquier otro se rechaza sin rutas heredadas.
    const expectedSalt = tokenSalt(token);
    for (let i = 0; i < SALT_LEN; i++) {
      if (expectedSalt[i] !== salt[i]) throw new Error("unknown salt");
    }
    const key = await getTokenKey(token, iterations);

    const decrypted = await crypto.subtle.decrypt({ ...ALGORITHM, iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // Fallo de descifrado: se registra sin el token para diagnóstico y se
    // devuelve vacío para no romper el render.
    safeLogError(
      ["[crypto-utils]", "decrypt failed; returning empty"],
      err instanceof Error ? err : new Error("decrypt failed"),
    );
    return "";
  }
}
