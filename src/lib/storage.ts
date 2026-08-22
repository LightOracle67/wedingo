import { STORAGE_KEYS } from "./storage-keys";
import { safeLogError } from "./safe-error";

const STORAGE_CONSENT_KEY = STORAGE_KEYS.cookieConsent;

/** Registro de consentimiento persistido por el banner de cookies (GDPR
 *  art. 7.1: consentimiento demostrable): status, timestamp y versión de la
 *  política con la que se otorgó (re-consentimiento si cambia). */
interface ConsentRecord {
  status: "accepted" | "rejected";
  ts: number;
  version: string;
}

/** Parsea el registro de consentimiento con tolerancia al formato legacy
 *  (el banner anterior guardaba el valor plano "accepted"/"rejected"). */
function parseConsent(value: string | null): ConsentRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ConsentRecord>;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.status === "accepted" || parsed.status === "rejected") &&
      typeof parsed.ts === "number" &&
      typeof parsed.version === "string"
    ) {
      return parsed as ConsentRecord;
    }
  } catch {
    /* formato legacy */
  }
  return null;
}

function getConsentRecord(): ConsentRecord | null {
  try {
    return parseConsent(localStorage.getItem(STORAGE_CONSENT_KEY));
  } catch (err) {
    safeLogError(["[app]", "[storage]", "consent check error"], err);
    return null;
  }
}

export function hasStorageConsent() {
  const record = getConsentRecord();
  if (record) return record.status === "accepted";
  try {
    return localStorage.getItem(STORAGE_CONSENT_KEY) === "accepted";
  } catch (err) {
    safeLogError(["[app]", "[storage]", "consent check error"], err);
    return false;
  }
}

/** El visitante rechazó el consentimiento: NO se debe volver a cachear la
 *  invitación en localStorage (ePrivacy art. 5.3) hasta que decida. */
export function hasRejectedConsent() {
  const record = getConsentRecord();
  if (record) return record.status === "rejected";
  try {
    return localStorage.getItem(STORAGE_CONSENT_KEY) === "rejected";
  } catch {
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
  const record = getConsentRecord();
  if (record) {
    if (record.status !== "accepted") return false;
  } else {
    // Compatibilidad con el formato legacy (valor plano).
    try {
      if (localStorage.getItem(STORAGE_CONSENT_KEY) !== "accepted") return false;
    } catch {
      return false;
    }
  }
  const prefs = (() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.cookiePrefs);
    } catch {
      return null;
    }
  })();
  if (!prefs) return true;
  try {
    const parsed = JSON.parse(prefs) as { analytics?: boolean };
    return parsed.analytics !== false;
  } catch {
    return true;
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
    safeLogError(["[app]", "[storage]", "safeSetItem error"], err);
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
    safeLogError(["[app]", "[storage]", "safeGetItem error"], err);
    return null;
  }
}

export function safeRemoveItem(key: string, storage: Storage = localStorage) {
  try {
    storage.removeItem(key);
  } catch (err) {
    safeLogError(["[app]", "[storage]", "safeRemoveItem error"], err);
  }
}

export function clearAllStorage() {
  try {
    const localKeys = Object.keys(localStorage).filter((k) => k.startsWith("wedin_"));
    const sessionKeys = Object.keys(sessionStorage).filter((k) => k.startsWith("wedin_"));

    localKeys.forEach((k) => localStorage.removeItem(k));
    sessionKeys.forEach((k) => sessionStorage.removeItem(k));
  } catch (err) {
    safeLogError(["[app]", "[storage]", "clearAllStorage error"], err);
  }
}
