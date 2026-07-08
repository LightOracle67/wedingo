import { useTranslation } from "react-i18next";

export default function LanguageSwitcher({ inline }) {
  const { i18n } = useTranslation();

  const languages = [
    { code: "es", label: "ES" },
    { code: "en", label: "EN" },
  ];

  return (
    <div className={`language-switcher ${inline ? "language-switcher--inline" : ""}`} role="radiogroup" aria-label="Idioma / Language">
      {languages.map((lang) => (
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
