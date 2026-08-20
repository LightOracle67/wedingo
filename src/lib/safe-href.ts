/**
 * safe-href.ts
 * ─────────────────────────────────────────────────────────────
 * Sanitización central de URLs que se van a usar como `href`/`src` en el
 * DOM. Es la defensa anti-XSS (reflejado) para los valores de configuración
 * que el ADMIN escribe y que pueden llegar al render a través de un hash de
 * URL malicioso (ver ConfigContext hidratando desde window.location.hash),
 * sin pasar por la validación de Firestore.
 *
 * Un `javascript:`/`data:`/`vbscript:`/protocol-relative en un `href` podría
 * ejecutarse (aunque el CSP `script-src 'self'` lo bloquee en la mayoría de
 * navegadores, no conviene depender solo de él). Esta función garantiza que
 * solo se rendericen URLs http(s) seguras; cualquier otra se descarta.
 *
 * @module safe-href
 */

/** Esquemas permitidos en cualquier URL renderizable (http/https únicamente). */
export function isSafeUrl(value: string): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const v = value.trim();
  // Solo http(s) absolutos con host. Rechaza javascript:, data:, vbscript:,
  // protocol-relative (//evil), esquemas raros y saltos de línea (un atacante
  // podía colar "java\nscript:..." que algunos parsers normalizan).
  if (/\s/.test(v)) return false;
  try {
    const url = new URL(v);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Devuelve la URL solo si es http(s) segura; si no, cadena vacía. */
export function safeHref(value: string | undefined | null): string {
  if (!value) return "";
  return isSafeUrl(value) ? value : "";
}

/**
 * Whitelist de host para redes sociales: comprueba que la URL sea http(s)
 * segura y que apunte a instagram.com o facebook.com (con o sin www).
 *
 * @param value URL social del organizador.
 * @param host Host esperado ("instagram.com" o "facebook.com").
 * @returns La URL si es válida para ese host; cadena vacía si no.
 */
export function safeSocialUrl(value: string | undefined, host: "instagram.com" | "facebook.com"): string {
  if (!value) return "";
  const v = value.trim();
  if (!isSafeUrl(v)) return "";
  try {
    const url = new URL(v);
    const h = url.hostname.toLowerCase();
    const isInstagram = host === "instagram.com" && (h === "instagram.com" || h === "www.instagram.com");
    const isFacebook = host === "facebook.com" && (h === "facebook.com" || h === "www.facebook.com");
    return isInstagram || isFacebook ? v : "";
  } catch {
    return "";
  }
}
