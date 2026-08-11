import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

/** Script del widget de traducción de Google (se inyecta solo bajo demanda). */
const GT_SCRIPT = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
  }
}

/**
 * GoogleTranslateToggle — Traducción automática con el widget gratuito de
 * Google. Cumple ePrivacy art. 5.3: el script de terceros NO se carga hasta
 * que el usuario pulsa "Traducir" (acción explícita). El texto traducido se
 * envía a Google (procesador) → se disclose en la política de privacidad.
 */
const GoogleTranslateToggle = memo(function GoogleTranslateToggle() {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const enable = useCallback(() => {
    if (active) return;
    setLoading(true);
    // Callback global requerido por el widget antes de inyectar el elemento.
    window.googleTranslateElementInit = () => {
      const gt = (window as unknown as {
        google?: { translate?: { TranslateElement: new (a: object, b: string) => unknown } };
      }).google?.translate?.TranslateElement;
      if (gt) {
        // Instancia el widget en el contenedor reservado.
        void new gt({ pageLanguage: "es" }, "google_translate_element");
      }
      setActive(true);
      setLoading(false);
    };
    // Se inyecta el script una sola vez.
    if (!document.querySelector('script[data-gt="1"]')) {
      const s = document.createElement("script");
      s.src = GT_SCRIPT;
      s.async = true;
      s.dataset.gt = "1";
      document.head.appendChild(s);
    } else {
      window.googleTranslateElementInit();
    }
  }, [active]);

  return (
    <div className="lang-wrapper">
      {!active ? (
        <button type="button" className="lang-trigger" onClick={enable} disabled={loading} aria-label={t("common.translate")}>
          🌐
        </button>
      ) : (
        <div id="google_translate_element" style={{ minWidth: "8rem" }} />
      )}
    </div>
  );
});

export default GoogleTranslateToggle;
