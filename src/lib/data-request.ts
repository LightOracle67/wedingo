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
/**
 * Borra SOLO las bases IndexedDB de Firestore del proyecto actual de Wedingo:
 * el formato de nombre de la base incluye el projectId (`firestore/{projectId}/...`).
 * Filtrar por él evita arrastrar datos de OTRAS apps de Firebase que compartan
 * el mismo origin. Se usa tanto en el borrado de datos del invitado (GDPR art.
 * 17) como al rechazar el consentimiento (ePrivacy art. 5.3).
 */
export function eraseFirestoreIndexedDB(): void {
  if (typeof indexedDB === "undefined") return;
  try {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
    void indexedDB.databases().then((dbs) => {
      const firestoreDbs = dbs.filter((d) => {
        const name = d.name || "";
        if (!name.startsWith("firestore")) return false;
        // Si no hay projectId configurado, se conserva el comportamiento
        // anterior (borrar todas) para no dejar datos huérfanos.
        return !projectId || name.includes(projectId);
      });
      for (const d of firestoreDbs) {
        try {
          indexedDB.deleteDatabase(d.name!);
        } catch {}
      }
    });
  } catch {
    /* IndexedDB no disponible */
  }
}

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
  try {
    wipe(localStorage);
  } catch {
    /* almacenamiento no disponible */
  }
  try {
    wipe(sessionStorage);
  } catch {
    /* almacenamiento no disponible */
  }

  // El IndexedDB de Firestore (persistentLocalCache, offline) también guarda
  // datos de la invitación: se borra al eliminar los datos personales.
  // SOLO se borran las bases del proyecto actual de Wedingo (ver
  // eraseFirestoreIndexedDB): antes se borraban todas las bases `firestore*`,
  // un efecto colateral agresivo.
  eraseFirestoreIndexedDB();

  return { erasedKeys };
}

/**
 * Exporta los datos personales que Wedingo guarda sobre el visitante en
 * el navegador, devolviendo un objeto clave → valor.
 */
export function exportGuestLocalData(inviteToken?: string): DataRequestResult {
  const exported: Record<string, string> = {};
  const collect = (store: Storage) => {
    Object.keys(store).forEach((key) => {
      // Solo se exportan claves relacionadas con esta invitación (o de la
      // sesión/consentimiento): no se vuelcan datos de otras invitaciones
      // ni de la sesión del admin.
      const relevant =
        PROTECTED_PREFIXES.some((p) => key.startsWith(p)) ||
        key === STORAGE_KEYS.session ||
        key === STORAGE_KEYS.cookieConsent ||
        key === STORAGE_KEYS.cookiePrefs ||
        key === STORAGE_KEYS.inviteCache(inviteToken ?? "") ||
        key === STORAGE_KEYS.rsvpCache(inviteToken ?? "") ||
        key === STORAGE_KEYS.setupToken(inviteToken ?? "") ||
        key.startsWith(`${INVITE_CACHE_PREFIX}${inviteToken}`) ||
        key.startsWith(`${AUDIO_PREFIX}${inviteToken}`);
      if (!relevant) return;
      try {
        exported[key] = store.getItem(key) ?? "";
      } catch {
        /* clave no legible */
      }
    });
  };
  try {
    collect(localStorage);
  } catch {
    /* almacenamiento no disponible */
  }
  try {
    collect(sessionStorage);
  } catch {
    /* almacenamiento no disponible */
  }
  return { erasedKeys: [], exported };
}
