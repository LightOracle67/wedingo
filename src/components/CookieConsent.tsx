import { memo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useAppUI } from "../contexts";
import { INVITE_CACHE_PREFIX, AUDIO_PREFIX, STORAGE_KEYS } from "../lib/storage-keys";
import "../styles/modals.css";

const STORAGE_KEY = STORAGE_KEYS.cookieConsent;
const PREF_STORAGE_KEY = STORAGE_KEYS.cookiePrefs;

/**
 * Acceso directo a localStorage con tolerancia (modo privado, cuota llena).
 * NO usa safeSetItem/safeGetItem de storage.ts a propósito: esas helpers
 * exigen hasStorageConsent(), y este banner es precisamente el que OTORGA el
 * consentimiento (escribirlo a través de ellas sería un rechazo circular).
 */
const ls = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* almacenamiento no disponible */
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

/** Otorga el consentimiento de analítica (import dinámico para no arrastrar
 *  firebase/analytics al grafo estático inicial). */
function grantAnalytics() {
  import("../lib/analytics").then(({ grantAnalyticsConsent }) => grantAnalyticsConsent());
  import("../lib/sentry").then(({ enableSentryTracking }) => enableSentryTracking());
}

function acceptCookies() {
  ls.set(STORAGE_KEY, "accepted");
  ls.set(PREF_STORAGE_KEY, JSON.stringify({ necessary: true, analytics: true }));
  grantAnalytics();
}

function rejectCookies() {
  ls.set(STORAGE_KEY, "rejected");
  ls.remove(PREF_STORAGE_KEY);
}

const CookieConsent = memo(function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({ necessary: true, analytics: false });

  useEffect(() => {
    const status = ls.get(STORAGE_KEY);
    if (!status) setVisible(true);
  }, []);

  const handleAccept = () => {
    acceptCookies();
    setVisible(false);
  };

  const handleReject = () => {
    rejectCookies();
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(INVITE_CACHE_PREFIX) || k.startsWith(AUDIO_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    setVisible(false);
  };

  const handleSavePreferences = () => {
    ls.set(STORAGE_KEY, "accepted");
    ls.set(PREF_STORAGE_KEY, JSON.stringify(preferences));
    if (preferences.analytics) grantAnalytics();
    if (!preferences.analytics) {
      ls.remove(STORAGE_KEYS.inviteCacheLegacy);
    }
    setVisible(false);
  };

  const togglePreference = (key: keyof typeof preferences) => {
    if (key === "necessary") return;
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const focusTrapRef = useFocusTrap<HTMLDivElement>(visible);

  // El banner debe dar acceso directo a la política de privacidad (GDPR
  // art. 7.2): abre el LegalModal desde el contexto de UI.
  const { setLegalModal } = useAppUI();

  if (!visible) return null;

  return (
    <div className="cookie-consent-overlay" role="region" aria-label={t("cookie.title")}>
      <div className="cookie-consent-card" ref={focusTrapRef}>
        {!showSettings ? (
          <>
            <p className="cookie-consent-text">{t("cookie.text")}</p>
            <button
              type="button"
              className="cookie-consent-policy"
              onClick={() => setLegalModal("privacy")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginBottom: "0.75rem",
                color: "var(--setup-accent, #c8a84e)",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              {t("legal.privacyPolicy")}
            </button>
            <div className="cookie-consent-actions">
              <button className="setup-button setup-button--primary" onClick={handleAccept}>
                {t("cookie.accept")}
              </button>
              <button className="setup-button" onClick={handleReject}>
                {t("cookie.reject")}
              </button>
              <button className="setup-button" onClick={() => setShowSettings(true)}>
                {t("cookie.configure")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="cookie-consent-text" style={{ fontWeight: 600 }}>
              {t("cookie.settingsTitle")}
            </p>
            <div className="cookie-settings-list">
              <label className="cookie-settings-item">
                <input
                  type="checkbox"
                  checked={preferences.necessary}
                  disabled
                  onChange={() => togglePreference("necessary")}
                />
                <span>{t("cookie.necessary")}</span>
              </label>
              <label className="cookie-settings-item">
                <input type="checkbox" checked={preferences.analytics} onChange={() => togglePreference("analytics")} />
                <span>{t("cookie.analytics")}</span>
              </label>
            </div>
            <div className="cookie-consent-actions" style={{ marginTop: "0.75rem" }}>
              <button className="setup-button setup-button--primary" onClick={handleSavePreferences}>
                {t("cookie.savePreferences")}
              </button>
              <button className="setup-button" onClick={() => setShowSettings(false)}>
                {t("common.back")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default CookieConsent;
