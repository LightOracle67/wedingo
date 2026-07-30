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
  console.log("[app]", "[sessionVars]", "saveSession", { type, identifier });
  try {
    const data = {
      type,
      identifier,
      ...extra,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION,
    };
    ls()?.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) { console.error("[app]", "[sessionVars]", "saveSession error", { error: err }); }
}

export function getSession() {
  try {
    const raw = ls()?.getItem(STORAGE_KEY);
    if (!raw) { console.log("[app]", "[sessionVars]", "getSession: no data", {}); return null; }
    const data = JSON.parse(raw);
    if (data.expiresAt && Date.now() < data.expiresAt) {
      console.log("[app]", "[sessionVars]", "getSession: valid", { type: data.type, identifier: data.identifier });
      return data;
    }
    console.log("[app]", "[sessionVars]", "getSession: expired, clearing", { expiresAt: data.expiresAt, now: Date.now() });
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
    const raw = ls()?.getItem(STORAGE_KEY);
    if (!raw) { console.log("[app]", "[sessionVars]", "renewSession: no session", {}); return; }
    const data = JSON.parse(raw);
    data.expiresAt = Date.now() + SESSION_DURATION;
    ls()?.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("[app]", "[sessionVars]", "renewSession success", {});
  } catch (err) { console.error("[app]", "[sessionVars]", "renewSession error", { error: err }); }
}

export function clearSession() {
  console.log("[app]", "[sessionVars]", "clearSession", {});
  try { ls()?.removeItem(STORAGE_KEY); } catch (err) { console.error("[app]", "[sessionVars]", "clearSession error", { error: err }); }
}
