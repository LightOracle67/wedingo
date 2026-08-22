/**
 * safe-error.ts
 * ─────────────────────────────────────────────────────────────
 * Logging de errores consciente de seguridad: garantiza que el token de
 * invitación/setup (la CREDENCIAL de acceso compartida vía URL) nunca salga
 * del navegador en logs hacia la consola o, por propagación, hacia Sentry.
 *
 * El problema: `console.error(..., { error: err })` volcaba el objeto de
 * excepción completo. Algunos errores de Firestore incluyen el `ref`/path
 * (que contiene el inviteToken) o mensajes con la URL, y Sentry SOLO redacta
 * la request URL, no el `message` de cada breadcrumb/error. Este helper:
 *   1. Convierte el error a su representación segura (message/name o String).
 *   2. Pasa el resultado por `redactSecretsFromUrl` (mismo redactor que Sentry)
 *      para eliminar cualquier token/URL sensible que pudiera colarse.
 *   3. Loggea solo eso, NUNCA el objeto completo ni el path del ref.
 *
 * @module safe-error
 */

import { redactSecretsFromUrl } from "./redact";

/** Estructura mínima reconocible de un error de Firestore/Firebase. */
interface SafeErrorLike {
  name?: string;
  message?: string;
  code?: string;
}

/**
 * Serializa un error a una cadena segura y redactada (mejor-effort).
 *
 * @param err - Error (o valor desconocido) a loggear.
 * @returns Cadena segura para consola/Sentry, sin tokens ni URLs sensibles.
 */
export function toSafeErrorMessage(err: unknown): string {
  if (!err) return String(err);
  // Para objetos de tipo Error (incluidos los de Firebase) se usa name+message;
  // se descarta `stack`, `ref`, `request`, `config` y cualquier campo que pueda
  // arrastrar el token o el path de la colección.
  const e = err as SafeErrorLike;
  const name = typeof e.name === "string" ? e.name : "";
  const message = typeof e.message === "string" ? e.message : "";
  const code = typeof e.code === "string" ? ` (${e.code})` : "";
  const raw = [name, message].filter(Boolean).join(": ") + code;
  // Redacción de cualquier token/URL sensible en la representación final:
  // primero la ruta/query (URL-anchored) y luego los tokens embebidos en
  // cualquier posición del texto.
  return redactEmbeddedTokens(redactSecretsFromUrl(raw)) || String(err);
}

/** Redacta un token de invitación embebido en CUALQUIER posición del texto
 *  (no solo al inicio de una URL): el token es el primer segmento de la ruta
 *  (`/TOKEN`, `/TOKEN/admin`, …) con 10 caracteres alfanuméricos, y también se
 *  redacta en query params. A diferencia de redactSecretsFromUrl, no exige que
 *  la cadena empiece por http: cubre mensajes de error con URLs embebidas. */
function redactEmbeddedTokens(str: string): string {
  if (!str) return str;
  // El token de invitación: 10 caracteres [A-Za-z0-9]. Relativo a la ruta de
  // la invitación (p. ej. "/TtCgt9n8VT/admin") y a query (t/token/invitar).
  let out = str;
  // Ruta: esquema-origen + /token (solo si se parece a una ruta de invitación
  // y no es una ruta interna conocida ya preservada por redactSecretsFromUrl).
  out = out.replace(/(https?:\/\/[^/\s"]+\/)([A-Za-z0-9]{10})(\/|[\s"']|$)/g, "$1[redacted]$3");
  // Query params sensibles con cualquier valor.
  out = out.replace(/([?&](?:t|token|invitar|invite)=)[^&#\s"]*/g, "$1[redacted]");
  return out;
}

/**
 * Registra un error en consola de forma segura (sin el objeto completo ni el
 * token), siguiendo la convención del proyecto de prefijos por módulo.
 *
 * @param tags - Etiquetas de contexto (p.ej. ["[app]", "[useRsvp]", "save error"]).
 * @param err - El error a registrar.
 */
export function safeLogError(tags: readonly string[], err: unknown): void {
  const tag = tags.join(" ");
  // Solo se loggea la representación segura; jamás el objeto ni el stack.
  console.error(tag, toSafeErrorMessage(err));
}
