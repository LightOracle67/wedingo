const STORAGE_CONSENT_KEY = "wedin_cookie_consent";

export function hasStorageConsent() {
  try {
    return localStorage.getItem(STORAGE_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function safeSetItem(key, value, storage = localStorage) {
  if (!hasStorageConsent()) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeGetItem(key, storage = localStorage) {
  if (!hasStorageConsent()) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key, storage = localStorage) {
  try {
    storage.removeItem(key);
  } catch {}
}

export function clearAllStorage() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith("wedin_")).forEach(k => localStorage.removeItem(k));
    Object.keys(sessionStorage).filter(k => k.startsWith("wedin_")).forEach(k => sessionStorage.removeItem(k));
  } catch {}
}
