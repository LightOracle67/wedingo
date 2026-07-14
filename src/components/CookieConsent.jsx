import { memo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { clearAllStorage } from "../lib/storage";

const STORAGE_KEY = "wedin_cookie_consent";
const PREF_STORAGE_KEY = "wedin_cookie_prefs";

function acceptCookies() {
  localStorage.setItem(STORAGE_KEY, "accepted");
  localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify({ necessary: true, analytics: true }));
}

function rejectCookies() {
  localStorage.setItem(STORAGE_KEY, "rejected");
  localStorage.removeItem(PREF_STORAGE_KEY);
}

const CookieConsent = memo(function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({ necessary: true, analytics: false });

  useEffect(() => {
    const status = localStorage.getItem(STORAGE_KEY);
    if (!status) setVisible(true);
  }, []);

  const handleAccept = () => {
    acceptCookies();
    setVisible(false);
  };

  const handleReject = () => {
    rejectCookies();
    clearAllStorage();
    setVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(preferences));
    if (!preferences.analytics) {
      localStorage.removeItem("wedin_invite_cache");
    }
    setVisible(false);
  };

  const togglePreference = (key) => {
    if (key === "necessary") return;
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent-overlay" role="region" aria-label={t("cookie.title")}>
      <div className="cookie-consent-card">
        {!showSettings ? (
          <>
            <p className="cookie-consent-text">
              {t("cookie.text")}
            </p>
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
                  onChange={() => {}}
                />
                <span>{t("cookie.necessary")}</span>
              </label>
              <label className="cookie-settings-item">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={() => togglePreference("analytics")}
                />
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
