const ALGORITHM = { name: "AES-GCM", length: 256 };

/**
 * Deriva una clave AES-256 a partir del secreto usando PBKDF2.
 * El secreto se rellena/trunca a 32 bytes y se usa como contraseña
 * con salt fijo "wedingo-salt-v1" y 10.000 iteraciones.
 *
 * @param {string} secret - Token/secreto de la invitación.
 * @returns {Promise<CryptoKey>} Clave AES-256-GCM derivada.
 */
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

/**
 * Convierte un Uint8Array a string base64 de forma segura,
 * evitando el límite de argumentos de String.fromCharCode con spread.
 * Procesa el array en chunks de 8192 bytes.
 *
 * @param {Uint8Array} bytes - Datos binarios a codificar.
 * @returns {string} Representación base64.
 */
function uint8ToBase64(bytes) {
  const chunkSize = 8192;
  const chunks = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...chunk));
  }
  return btoa(chunks.join(""));
}

/**
 * Cifra un texto con AES-256-GCM usando el token como clave.
 * El resultado incluye el IV (12 bytes) concatenado con el ciphertext,
 * todo codificado en base64.
 *
 * @param {string} text - Texto a cifrar.
 * @param {string} token - Token usado como clave de cifrado.
 * @returns {Promise<string>} Texto cifrado en base64, o cadena vacía en caso de error.
 */
export async function encrypt(text, token) {
  if (!text || !token) return text;
  try {
    const key = await getKey(token);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt({ ...ALGORITHM, iv }, key, encoded);
    // Combina IV + ciphertext en un solo buffer
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    // Convierte a base64 por chunks para evitar overflow de argumentos
    return uint8ToBase64(combined);
  } catch {
    // Si el cifrado falla (ej: datos demasiado grandes), no devolvemos
    // el texto original para que el llamador detecte el error.
    return "";
  }
}

/**
 * Descifra un ciphertext codificado en base64 con AES-256-GCM.
 * Espera el formato: IV (12 bytes) + ciphertext, todo en base64.
 *
 * @param {string} ciphertext - Texto cifrado en base64.
 * @param {string} token - Token usado como clave de descifrado.
 * @returns {Promise<string>} Texto descifrado, o cadena vacía en caso de error.
 */
export async function decrypt(ciphertext, token) {
  if (!ciphertext || !token || ciphertext.length < 24) return ciphertext;
  try {
    const key = await getKey(token);
    const raw = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const decrypted = await crypto.subtle.decrypt({ ...ALGORITHM, iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch { return ""; }
}
