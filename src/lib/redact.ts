/**
 * redact.ts
 * ─────────────────────────────────────────────────────────────
 * Redacción centralizada del token de invitación (credencial de acceso
 * compartida vía URL) antes de que cualquier dato salga del navegador
 * hacia Sentry, consola o logs.
 *
 * Módulo de propósito único y SIN dependencias de otros módulos del
 * proyecto (en particular NO importa `storage`) para poder ser usado
 * desde `safe-error` sin crear un ciclo de importes
 * (storage → safe-error → sentry → storage).
 *
 * @module redact
 */

/**
 * Redacta el token de invitación que viaja en la URL (ruta `/<token>` y en
 * query como `?t=`/`invitar`), además de cualquier hash. El token es la
 * credencial de acceso a la invitación: nunca debe salir del navegador.
 *
 * @param str - Cadena de URL o texto a sanear.
 */
export function redactSecretsFromUrl(str: string): string {
  if (!str) return str;
  let out = str;
  // El token es el PRIMER segmento del pathname. Se redacta para las rutas
  // de invitación: "/TOKEN", "/TOKEN/admin", "/TOKEN/setup", … El dominio y
  // el resto de rutas (landing, misc) se dejan intactos.
  try {
    // solo aplica a URLs absolutas con http(s)
    if (/^https?:\/\//i.test(out) && out.includes("/")) {
      out = out.replace(
        /^(https?:\/\/[^/]+)\/([A-Za-z0-9_-]{4,32})(\/[^?#]*)?([?#].*)?$/,
        (m, origin, seg, tail, rest) => {
          // No redactar rutas internas conocidas (landing, superadmin).
          const base = seg.toLowerCase();
          if (
            ["setup", "admin", "superadmin", "superadmin-login", "login", "landing", "privacy", "terms"].includes(base)
          ) {
            return m;
          }
          return `${origin}/[redacted]${tail || ""}${rest || ""}`;
        },
      );
    }
  } catch {
    /* formato inválido: se deja tal cual */
  }
  // Query params: t, token, invitar, invite
  out = out.replace(/([?&](?:t|token|invitar|invite)=)[^&#]*/g, "$1[redacted]");
  // Hash (config de invitación cifrada/legacy)
  out = out.replace(/(#[^]*)/, "#[redacted]");
  return out;
}
