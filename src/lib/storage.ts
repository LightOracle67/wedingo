import { STORAGE_KEYS } from "./storage-keys";

const STORAGE_CONSENT_KEY = STORAGE_KEYS.cookieConsent;

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

/**
 * Indica si el visitante ha aceptado la estadística de visitas (analytics).
 * Se respeta el consentimiento de cookies (RGPD/LGPD/CCPA): sin el
 * consentimiento "accepted" con analytics activado no se recogen datos.
 * Vive aquí (módulo ligero, sin Firebase) para que Sentry y Analytics lo
 * consulten sin arrastrar el bundle de firebase.
 */
export function hasAnalyticsConsent(): boolean {
  try {
    const consent = localStorage.getItem(STORAGE_CONSENT_KEY);
    if (consent !== "accepted") return false;
    const prefs = localStorage.getItem(STORAGE_KEYS.cookiePrefs);
    if (!prefs) return true;
    try {
      const parsed = JSON.parse(prefs) as { analytics?: boolean };
      return parsed.analytics !== false;
    } catch {
      return true;
    }
  } catch {
    return false;
  }
}

export function safeSetItem(key: string, value: string, storage: Storage = localStorage) {
  if (storage === localStorage && !hasStorageConsent()) {
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
  try {
    const localKeys = Object.keys(localStorage).filter((k) => k.startsWith("wedin_"));
    const sessionKeys = Object.keys(sessionStorage).filter((k) => k.startsWith("wedin_"));

    localKeys.forEach((k) => localStorage.removeItem(k));
    sessionKeys.forEach((k) => sessionStorage.removeItem(k));
  } catch (err) {
    console.error("[app]", "[storage]", "clearAllStorage error", err);
  }
}
