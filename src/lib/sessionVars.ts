import { STORAGE_KEYS } from "./storage-keys";

const STORAGE_KEY = STORAGE_KEYS.session;
/** Duración de la sesión local (sessionStorage): 60 minutos. */
const SESSION_DURATION = 60 * 60 * 1000;

/** TTL para activeSession en Firestore (60 minutos). */
const FIRESTORE_SESSION_TTL_MS = 3600000;

/**
 * La sesión se guarda en sessionStorage (no localStorage) para que no
 * persista entre reinicios del navegador ni sea accesible desde otras
 * pestañas del origen, reduciendo la superficie de robo de sesión.
 */
function ss() {
  try { return sessionStorage; } catch { return null; }
}

/** Calcula la fecha de expiración para activeSession en Firestore. */
export function firestoreSessionExpiry() {
  return new Date(Date.now() + FIRESTORE_SESSION_TTL_MS);
}

export function saveSession(type: string, identifier: string, extra: Record<string, unknown> = {}) {

  try {
    const data = {
      type,
      identifier,
      ...extra,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION,
    };
    ss()?.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) { console.error("[app]", "[sessionVars]", "saveSession error", { error: err }); }
}

export function getSession() {
  try {
    const raw = ss()?.getItem(STORAGE_KEY);
    if (!raw) { ; return null; }
    const data = JSON.parse(raw);
    if (data.expiresAt && Date.now() < data.expiresAt) {

      return data;
    }

    clearSession();
    return null;
  } catch (err) {
    console.error("[app]", "[sessionVars]", "getSession error, clearing", { error: err });
    clearSession();
    return null;
  }
}

export function renewSession() {
  try {
    const raw = ss()?.getItem(STORAGE_KEY);
    if (!raw) { ; return; }
    const data = JSON.parse(raw);
    data.expiresAt = Date.now() + SESSION_DURATION;
    ss()?.setItem(STORAGE_KEY, JSON.stringify(data));

  } catch (err) { console.error("[app]", "[sessionVars]", "renewSession error", { error: err }); }
}

export function clearSession() {

  try { ss()?.removeItem(STORAGE_KEY); } catch (err) { console.error("[app]", "[sessionVars]", "clearSession error", { error: err }); }
}
