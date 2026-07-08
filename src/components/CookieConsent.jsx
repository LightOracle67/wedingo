import { useState, useEffect } from "react";

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
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent-overlay" role="dialog" aria-label="Consentimiento de cookies">
      <div className="cookie-consent-card">
        <p className="cookie-consent-text">
          Wedingo utiliza almacenamiento local necesario para el funcionamiento de la invitación
          (guardar tu sesión y preferencias). No usamos cookies de terceros ni rastreadores.
        </p>
        <div className="cookie-consent-actions">
          <button className="setup-button setup-button--primary" onClick={handleAccept}>
            Aceptar
          </button>
          <button className="setup-button" onClick={handleReject}>
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}
