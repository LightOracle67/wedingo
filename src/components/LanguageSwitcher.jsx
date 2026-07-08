import { useTranslation } from "react-i18next";

const GROUPS = [
  {
    label: "España",
    options: [
      { code: "es", label: "ES — Español" },
      { code: "ca", label: "CA — Català" },
      { code: "gl", label: "GL — Galego" },
      { code: "eu", label: "EU — Euskara" },
      { code: "va", label: "VA — Valencià" },
    ],
  },
  {
    label: "Europa Occidental",
    options: [
      { code: "en", label: "EN — English" },
      { code: "fr", label: "FR — Français" },
      { code: "de", label: "DE — Deutsch" },
      { code: "it", label: "IT — Italiano" },
      { code: "pt", label: "PT — Português" },
      { code: "nl", label: "NL — Nederlands" },
    ],
  },
  {
    label: "Europa Nórdica",
    options: [
      { code: "da", label: "DA — Dansk" },
      { code: "fi", label: "FI — Suomi" },
      { code: "is", label: "IS — Íslenska" },
      { code: "no", label: "NO — Norsk" },
      { code: "sv", label: "SV — Svenska" },
    ],
  },
  {
    label: "Europa Central / Este",
    options: [
      { code: "pl", label: "PL — Polski" },
      { code: "cs", label: "CS — Čeština" },
      { code: "sk", label: "SK — Slovenčina" },
      { code: "hu", label: "HU — Magyar" },
      { code: "ro", label: "RO — Română" },
      { code: "hr", label: "HR — Hrvatski" },
      { code: "sl", label: "SL — Slovenščina" },
      { code: "el", label: "EL — Ελληνικά" },
      { code: "lt", label: "LT — Lietuvių" },
      { code: "lv", label: "LV — Latviešu" },
      { code: "mt", label: "MT — Malti" },
      { code: "uk", label: "UK — Українська" },
      { code: "ru", label: "RU — Русский" },
    ],
  },
  {
    label: "Asia Oriental",
    options: [
      { code: "zh", label: "ZH — 简体中文" },
      { code: "ja", label: "JA — 日本語" },
      { code: "ko", label: "KO — 한국어" },
    ],
  },
  {
    label: "Sur / Sudeste de Asia",
    options: [
      { code: "hi", label: "HI — हिन्दी" },
      { code: "bn", label: "BN — বাংলা" },
      { code: "th", label: "TH — ไทย" },
      { code: "vi", label: "VI — Tiếng Việt" },
      { code: "ms", label: "MS — Bahasa Melayu" },
    ],
  },
  {
    label: "Oriente Medio / África",
    options: [
      { code: "ar", label: "AR — العربية" },
      { code: "he", label: "HE — עברית" },
      { code: "tr", label: "TR — Türkçe" },
      { code: "sw", label: "SW — Kiswahili" },
    ],
  },
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
      {GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
