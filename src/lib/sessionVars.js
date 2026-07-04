const STORAGE_KEY = "wedin_session";
const SESSION_DURATION = 3 * 60 * 60 * 1000;

export function saveSession(type, identifier, extra = {}) {
  try {
    const data = {
      type,
      identifier,
      ...extra,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    data.expiresAt = Date.now() + SESSION_DURATION;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}
