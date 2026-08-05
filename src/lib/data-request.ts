/**
 * data-request.ts
 * ─────────────────────────────────────────────────────────────
 * Autoservicio de derechos de los invitados (RGPD / CCPA / LGPD...).
 *
 * Permite a un visitante:
 * - Exportar los datos que Wedingo almacena sobre él en el navegador
 *   (portabilidad, art. 20 GDPR).
 * - Eliminar sus datos locales y retirar el consentimiento de cookies,
 *   de forma que la próxima visita vuelva a pedir consentimiento.
 *
 * El borrado de la respuesta RSVP enviada al servidor se realiza desde
 * el propio formulario de la invitación ("retirar respuesta"); aquí se
 * gestiona la parte local del navegador.
 *
 * @module data-request
 */

import { STORAGE_KEYS, INVITE_CACHE_PREFIX, AUDIO_PREFIX } from "./storage-keys";

/** Prefijo común de todas las claves de invitación en localStorage/sessionStorage. */
const INVITE_PREFIXES = [INVITE_CACHE_PREFIX, AUDIO_PREFIX, "wedin_setup_token_", "wedin_rsvp_cache_"];

/** Prefijos de claves que NO deben borrarse (requeridos por la app). */
const PROTECTED_PREFIXES = ["wedin_a11y"];

/** Resultado de una operación de datos. */
export interface DataRequestResult {
  erasedKeys: string[];
  exported?: Record<string, string>;
}

/**
 * Elimina las claves de almacenamiento local de la invitación y el
 * consentimiento de cookies. Devuelve la lista de claves borradas.
 */
export function eraseGuestLocalData(inviteToken?: string): DataRequestResult {
  const erasedKeys: string[] = [];
  const wipe = (store: Storage) => {
    const removable = Object.keys(store).filter((key) => {
      // Claves protegidas o sin relación con la invitación se conservan.
      if (PROTECTED_PREFIXES.some((p) => key.startsWith(p))) return false;
      if (key === STORAGE_KEYS.session) return true;
      if (key === STORAGE_KEYS.cookieConsent) return true;
      if (key === STORAGE_KEYS.cookiePrefs) return true;
      if (key === STORAGE_KEYS.inviteToken) return true;
      if (key === STORAGE_KEYS.inviteCacheLegacy) return true;
      if (key === STORAGE_KEYS.rsvpCache(inviteToken ?? "")) return true;
      if (key === STORAGE_KEYS.inviteCache(inviteToken ?? "")) return true;
      if (key === STORAGE_KEYS.setupToken(inviteToken ?? "")) return true;
      if (key === STORAGE_KEYS.audio(inviteToken ?? "")) return true;
      return INVITE_PREFIXES.some((p) => key.startsWith(p));
    });
    removable.forEach((key) => {
      store.removeItem(key);
      erasedKeys.push(key);
    });
  };
  try { wipe(localStorage); } catch { /* almacenamiento no disponible */ }
  try { wipe(sessionStorage); } catch { /* almacenamiento no disponible */ }
  return { erasedKeys };
}

/**
 * Exporta los datos personales que Wedingo guarda sobre el visitante en
 * el navegador, devolviendo un objeto clave → valor.
 */
export function exportGuestLocalData(_inviteToken?: string): DataRequestResult {
  const exported: Record<string, string> = {};
  const collect = (store: Storage) => {
    Object.keys(store).forEach((key) => {
      try {
        exported[key] = store.getItem(key) ?? "";
      } catch { /* clave no legible */ }
    });
  };
  try { collect(localStorage); } catch { /* almacenamiento no disponible */ }
  try { collect(sessionStorage); } catch { /* almacenamiento no disponible */ }
  return { erasedKeys: [], exported };
}
