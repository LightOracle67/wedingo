import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "pt", label: "PT" },
  { code: "de", label: "DE" },
  { code: "it", label: "IT" },
  { code: "ca", label: "CA" },
  { code: "gl", label: "GL" },
  { code: "eu", label: "EU" },
  { code: "va", label: "VA" },
];

export default function LanguageSwitcher({ inline }) {
  const { i18n } = useTranslation();

  return (
    <div className={`language-switcher ${inline ? "language-switcher--inline" : ""}`} role="radiogroup" aria-label="Idioma / Language">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          role="radio"
          aria-checked={i18n.language?.startsWith(lang.code)}
          className={`language-switcher__btn ${i18n.language?.startsWith(lang.code) ? "language-switcher__btn--active" : ""}`}
          onClick={() => i18n.changeLanguage(lang.code)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
