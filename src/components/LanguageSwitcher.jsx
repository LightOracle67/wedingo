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

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      className="language-switcher"
      aria-label="Idioma"
      value={i18n.language?.split("-")[0] || "es"}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
