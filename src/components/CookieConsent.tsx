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
  // Sección del accordion de preferencias abierta ("" = ninguna).
  const [openSection, setOpenSection] = useState("necessary");
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
            {/* Preferencias en secciones accordion (patrón del modal legal):
                cada categoría se despliega para mostrar su descripción y su
                control, evitando un modal demasiado largo. */}
            <div className="cookie-settings-list">
              {[
                {
                  id: "necessary" as const,
                  label: t("cookie.necessary"),
                  desc: t("cookie.necessaryDesc"),
                  control: (
                    <label className="cookie-settings-item">
                      <input type="checkbox" checked disabled onChange={() => {}} />
                      <span>{t("cookie.necessary")}</span>
                    </label>
                  ),
                },
                {
                  id: "analytics" as const,
                  label: t("cookie.analytics"),
                  desc: t("cookie.analyticsDesc"),
                  control: (
                    <label className="cookie-settings-item">
                      <input type="checkbox" checked={preferences.analytics} onChange={() => togglePreference("analytics")} />
                      <span>{t("cookie.analytics")}</span>
                    </label>
                  ),
                },
              ].map((s) => (
                <div key={s.id}>
                  <button
                    type="button"
                    onClick={() => setOpenSection((prev) => (prev === s.id ? "" : s.id))}
                    aria-expanded={openSection === s.id ? "true" : "false"}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.7rem 0",
                      border: "none",
                      borderBottom: "1px solid var(--setup-border)",
                      background: "transparent",
                      color: "var(--setup-title)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      fontFamily: "var(--font-body)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{s.label}</span>
                    <span
                      style={{
                        transform: openSection === s.id ? "rotate(135deg)" : "rotate(0deg)",
                        transition: "transform 300ms ease",
                        fontSize: "1rem",
                        opacity: 0.5,
                      }}
                    >
                      +
                    </span>
                  </button>
                  <div
                    style={{
                      maxHeight: openSection === s.id ? "400px" : "0px",
                      overflow: "hidden",
                      transition: "max-height 400ms ease, opacity 300ms ease",
                      opacity: openSection === s.id ? 1 : 0,
                    }}
                  >
                    <div
                      style={{
                        padding: "0.5rem 0 0.8rem",
                        color: "var(--setup-subtitle)",
                        fontSize: "0.82rem",
                        lineHeight: 1.6,
                      }}
                    >
                      <p style={{ margin: "0 0 0.6rem" }}>{s.desc}</p>
                      {s.control}
                    </div>
                  </div>
                </div>
              ))}
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
