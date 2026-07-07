const ALGORITHM = { name: "AES-GCM", length: 256 };

async function getKey(secret) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(secret.padEnd(32, "x").slice(0, 32)),
    { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("wedingo-salt-v1"), iterations: 10000, hash: "SHA-256" },
    keyMaterial, ALGORITHM, false, ["encrypt", "decrypt"]
  );
}

export async function encrypt(text, token) {
  if (!text || !token) return text;
  try {
    const key = await getKey(token);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt({ ...ALGORITHM, iv }, key, encoded);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch { return text; }
}

export async function decrypt(ciphertext, token) {
  if (!ciphertext || !token || ciphertext.length < 24) return ciphertext;
  try {
    const key = await getKey(token);
    const raw = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const decrypted = await crypto.subtle.decrypt({ ...ALGORITHM, iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch { return ciphertext; }
}
