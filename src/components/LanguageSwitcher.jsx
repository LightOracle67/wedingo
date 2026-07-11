import { memo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";

const GROUPS = [
  {
    id: "spain",
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
    id: "westernEurope",
    label: "Europa Occidental",
    options: [
      { code: "en", label: "EN — English" },
      { code: "fr", label: "FR — Français" },
      { code: "de", label: "DE — Deutsch" },
      { code: "it", label: "IT — Italiano" },
      { code: "pt", label: "PT — Português" },
      { code: "nl", label: "NL — Nederlands" },
      { code: "ga", label: "GA — Gaeilge" },
      { code: "cy", label: "CY — Cymraeg" },
    ],
  },
  {
    id: "nordicEurope",
    label: "Europa Nórdica",
    options: [
      { code: "da", label: "DA — Dansk" },
      { code: "fi", label: "FI — Suomi" },
      { code: "is", label: "IS — Íslenska" },
      { code: "no", label: "NO — Norsk" },
      { code: "sv", label: "SV — Svenska" },
      { code: "et", label: "ET — Eesti" },
    ],
  },
  {
    id: "centralEurope",
    label: "Europa Central",
    options: [
      { code: "pl", label: "PL — Polski" },
      { code: "cs", label: "CS — Čeština" },
      { code: "sk", label: "SK — Slovenčina" },
      { code: "hu", label: "HU — Magyar" },
      { code: "ro", label: "RO — Română" },
      { code: "hr", label: "HR — Hrvatski" },
      { code: "sl", label: "SL — Slovenščina" },
      { code: "lt", label: "LT — Lietuvių" },
      { code: "lv", label: "LV — Latviešu" },
    ],
  },
  {
    id: "southernEurope",
    label: "Europa Sur / Balcanes",
    options: [
      { code: "el", label: "EL — Ελληνικά" },
      { code: "mt", label: "MT — Malti" },
      { code: "bg", label: "BG — Български" },
      { code: "mk", label: "MK — Македонски" },
      { code: "bs", label: "BS — Bosanski" },
      { code: "sr", label: "SR — Српски" },
      { code: "sq", label: "SQ — Shqip" },
    ],
  },
  {
    id: "easternEurope",
    label: "Europa Este / Cáucaso",
    options: [
      { code: "uk", label: "UK — Українська" },
      { code: "ru", label: "RU — Русский" },
      { code: "ka", label: "KA — ქართული" },
      { code: "hy", label: "HY — Հայերեն" },
      { code: "az", label: "AZ — Azərbaycan" },
      { code: "eo", label: "EO — Esperanto" },
    ],
  },
  {
    id: "eastAsia",
    label: "Asia Oriental",
    options: [
      { code: "zh", label: "ZH — 简体中文" },
      { code: "ja", label: "JA — 日本語" },
      { code: "ko", label: "KO — 한국어" },
      { code: "my", label: "MY — မြန်မာဘာသာ" },
      { code: "lo", label: "LO — ລາວ" },
      { code: "km", label: "KM — ភាសាខ្មែរ" },
      { code: "wuu", label: "WUU — 吴语" },
    ],
  },
  {
    id: "southAsia",
    label: "Sur de Asia",
    options: [
      { code: "hi", label: "HI — हिन्दी" },
      { code: "bn", label: "BN — বাংলা" },
      { code: "ta", label: "TA — தமிழ்" },
      { code: "te", label: "TE — తెలుగు" },
      { code: "mr", label: "MR — मराठी" },
      { code: "gu", label: "GU — ગુજરાતી" },
      { code: "ur", label: "UR — اردو" },
      { code: "ne", label: "NE — नेपाली" },
      { code: "si", label: "SI — සිංහල" },
    ],
  },
  {
    id: "southeastAsia",
    label: "Sudeste de Asia",
    options: [
      { code: "th", label: "TH — ไทย" },
      { code: "vi", label: "VI — Tiếng Việt" },
      { code: "ms", label: "MS — Bahasa Melayu" },
      { code: "id", label: "ID — Bahasa Indonesia" },
      { code: "tl", label: "TL — Tagalog" },
      { code: "jv", label: "JV — Basa Jawa" },
      { code: "su", label: "SU — Basa Sunda" },
    ],
  },
  {
    id: "centralAsia",
    label: "Asia Central / Medio Oriente",
    options: [
      { code: "ar", label: "AR — العربية" },
      { code: "he", label: "HE — עברית" },
      { code: "tr", label: "TR — Türkçe" },
      { code: "fa", label: "FA — فارسی" },
      { code: "kk", label: "KK — Қазақша" },
      { code: "uz", label: "UZ — O'zbek" },
      { code: "ku", label: "KU — Kurdî" },
      { code: "ps", label: "PS — پښتو" },
    ],
  },
  {
    id: "africa",
    label: "África",
    options: [
      { code: "sw", label: "SW — Kiswahili" },
      { code: "am", label: "AM — አማርኛ" },
      { code: "ha", label: "HA — Hausa" },
      { code: "yo", label: "YO — Yorùbá" },
      { code: "ig", label: "IG — Igbo" },
      { code: "zu", label: "ZU — isiZulu" },
      { code: "rw", label: "RW — Kinyarwanda" },
      { code: "om", label: "OM — Afaan Oromoo" },
      { code: "mg", label: "MG — Malagasy" },
    ],
  },
  {
    id: "americas",
    label: "América",
    options: [
      { code: "qu", label: "QU — Runasimi" },
      { code: "gn", label: "GN — Avañe'ẽ" },
      { code: "ht", label: "HT — Kreyòl Ayisyen" },
    ],
  },
];

const LanguageSwitcher = memo(function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const trapRef = useFocusTrap(open && !closing);
  const currentLang = i18n.language?.split("-")[0] || "es";
  const currentLabel = GROUPS.flatMap(g => g.options).find(l => l.code === currentLang)?.label || currentLang.toUpperCase();

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); setOpen(false); }, 200);
  }, []);

  const handleSelect = useCallback((code) => {
    i18n.changeLanguage(code);
    handleClose();
  }, [i18n, handleClose]);

  useEffect(() => {
    if (!open || closing) return;
    const handleKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, closing, handleClose]);

  return (
    <div className="lang-wrapper">
      <button
        type="button"
        className="lang-trigger"
        onClick={() => setOpen(true)}
        aria-label={t("langSwitcher.label")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        🌐 {currentLabel}
      </button>

      {open && createPortal(
        <div className={`lang-popup ${closing ? "lang-popup--closing" : ""}`} onClick={handleClose} role="dialog" aria-modal="true" aria-label={t("langSwitcher.label")}>
          <div className={`lang-popup__card ${closing ? "lang-popup__card--closing" : ""}`} ref={trapRef} onClick={(e) => e.stopPropagation()}>
            <div className="lang-popup__grid">
            {GROUPS.map((group) => (
              <div key={group.label} className="lang-popup__group">
                <p className="lang-popup__group-title">{t(`langGroups.${group.id}`, group.label)}</p>
                <div className="lang-popup__options">
                  {group.options.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`lang-popup__btn ${currentLang === lang.code ? "lang-popup__btn--active" : ""}`}
                      onClick={() => handleSelect(lang.code)}
                    >
                      <span className="lang-popup__code">{lang.code.toUpperCase()}</span>
                      <span className="lang-popup__name">{lang.label.split(" — ")[1] || lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

export default LanguageSwitcher;
