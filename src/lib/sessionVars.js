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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    data.expiresAt = Date.now() + SESSION_DURATION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
