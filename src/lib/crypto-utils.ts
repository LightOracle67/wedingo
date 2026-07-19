const ALGORITHM = { name: "AES-GCM", length: 256 };
const SALT_LEN = 16;
const IV_LEN = 12;
const ITER_LEN = 3;
const HEADER_LEN = SALT_LEN + IV_LEN + ITER_LEN;
const ITERATIONS_NEW = 600000;

async function getKey(secret, salt, iterations) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(secret.padEnd(32, "x").slice(0, 32)),
    { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial, ALGORITHM, false, ["encrypt", "decrypt"]
  );
}

function uint8ToBase64(bytes) {
  const chunkSize = 8192;
  const chunks = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(chunks.join(""));
}

export async function encrypt(text, token) {
  if (!text || !token) return text;
  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const key = await getKey(token, salt, ITERATIONS_NEW);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const encoded = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt({ ...ALGORITHM, iv }, key, encoded);
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
    return "";
  }
}

export async function decrypt(ciphertext, token) {
  if (!ciphertext || !token || ciphertext.length < 24) return ciphertext;
  try {
    const raw = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    if (raw.length >= HEADER_LEN) {
      const salt = raw.slice(0, SALT_LEN);
      const iv = raw.slice(SALT_LEN, SALT_LEN + IV_LEN);
      const iterBytes = raw.slice(SALT_LEN + IV_LEN, HEADER_LEN);
      const iterations = iterBytes[0] | (iterBytes[1] << 8) | (iterBytes[2] << 16);
      const data = raw.slice(HEADER_LEN);
      const key = await getKey(token, salt, iterations);
      const decrypted = await crypto.subtle.decrypt({ ...ALGORITHM, iv }, key, data);
      return new TextDecoder().decode(decrypted);
    }
  } catch {}
  try {
    const enc = new TextEncoder();
    const salt = enc.encode("wedingo-" + token.slice(0, 16));
    const keyMaterial = await crypto.subtle.importKey(
      "raw", enc.encode(token.padEnd(32, "x").slice(0, 32)),
      { name: "PBKDF2" }, false, ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 10000, hash: "SHA-256" },
      keyMaterial, ALGORITHM, false, ["encrypt", "decrypt"]
    );
    const raw = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const decrypted = await crypto.subtle.decrypt({ ...ALGORITHM, iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch { return ""; }
}
