import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { clearAllStorage } from "../lib/storage";

const STORAGE_KEY = "wedin_cookie_consent";

export function hasCookieConsent() {
  return localStorage.getItem(STORAGE_KEY) === "accepted";
}

export function acceptCookies() {
  localStorage.setItem(STORAGE_KEY, "accepted");
}

export function rejectCookies() {
  localStorage.setItem(STORAGE_KEY, "rejected");
}

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

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

  if (!visible) return null;

  return (
    <div className="cookie-consent-overlay" role="dialog" aria-label={t("cookie.title")}>
      <div className="cookie-consent-card">
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
        </div>
      </div>
    </div>
  );
}
