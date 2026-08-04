const STORAGE_CONSENT_KEY = "wedin_cookie_consent";

export function hasStorageConsent() {
  try {
    const value = localStorage.getItem(STORAGE_CONSENT_KEY);
    const result = value === "accepted";
    return result;
  } catch (err) {
    console.error("[app]", "[storage]", "consent check error", err);
    return false;
  }
}

export function safeSetItem(key: string, value: string, storage: Storage = localStorage) {
  if (storage === localStorage && !hasStorageConsent()) {
    ;
    return false;
  }
  try {
    storage.setItem(key, value);
    return true;
  } catch (err) {
    console.error("[app]", "[storage]", "safeSetItem error", { key, error: err });
    return false;
  }
}

export function safeGetItem(key: string, storage: Storage = localStorage) {
  if (storage === localStorage && !hasStorageConsent()) {
    ;
    return null;
  }
  try {
    const value = storage.getItem(key);
    return value;
  } catch (err) {
    console.error("[app]", "[storage]", "safeGetItem error", { key, error: err });
    return null;
  }
}

export function safeRemoveItem(key: string, storage: Storage = localStorage) {
  try {
    storage.removeItem(key);
  } catch (err) {
    console.error("[app]", "[storage]", "safeRemoveItem error", { key, error: err });
  }
}

export function clearAllStorage() {
  ;
  try {
    const localKeys = Object.keys(localStorage).filter(k => k.startsWith("wedin_"));
    const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith("wedin_"));
    ;
    localKeys.forEach(k => localStorage.removeItem(k));
    sessionKeys.forEach(k => sessionStorage.removeItem(k));
  } catch (err) {
    console.error("[app]", "[storage]", "clearAllStorage error", err);
  }
}
