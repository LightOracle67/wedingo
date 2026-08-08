import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "../styles/lang.css";

// Únicos idiomas disponibles: el proyecto se limitó a español e inglés
// (el resto de locales se eliminaron).
const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
] as const;

const LanguageSwitcher = memo(function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.split("-")[0] || "es";

  const handleSelect = useCallback(
    (code: string) => {
      i18n.changeLanguage(code);
    },
    [i18n],
  );

  return (
    <div className="lang-wrapper" role="group" aria-label={t("lang.triggerLabel")}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`lang-trigger ${currentLang === lang.code ? "lang-trigger--active" : ""}`}
          onClick={() => handleSelect(lang.code)}
          aria-pressed={currentLang === lang.code}
          title={lang.label}
          aria-label={lang.label}
        >
          {lang.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
});

export default LanguageSwitcher;
