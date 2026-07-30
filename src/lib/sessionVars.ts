const STORAGE_KEY = "wedin_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000;

/** TTL para activeSession en Firestore (24h). */
const FIRESTORE_SESSION_TTL_MS = 86400000;

function ls() {
  try { return localStorage; } catch { return null; }
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
    ls()?.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function getSession() {
  try {
    const raw = ls()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.expiresAt && Date.now() < data.expiresAt) {
      return data;
    }
    clearSession();
    return null;
  } catch {
    clearSession();
    return null;
  }
}

export function renewSession() {
  try {
    const raw = ls()?.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    data.expiresAt = Date.now() + SESSION_DURATION;
    ls()?.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function clearSession() {
  try { ls()?.removeItem(STORAGE_KEY); } catch {}
}
