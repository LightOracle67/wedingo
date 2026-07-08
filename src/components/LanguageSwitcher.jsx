import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ca", label: "Català" },
  { code: "gl", label: "Galego" },
  { code: "eu", label: "Euskara" },
  { code: "va", label: "Valencià" },
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
