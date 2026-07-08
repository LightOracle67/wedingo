import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const popupRef = useRef(null);
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
        aria-label="Seleccionar idioma"
        aria-expanded={open}
        aria-haspopup="true"
      >
        🌐 {currentLabel}
      </button>

      {open && createPortal(
        <div className={`lang-popup ${closing ? "lang-popup--closing" : ""}`} onClick={handleClose}>
          <div className={`lang-popup__card ${closing ? "lang-popup__card--closing" : ""}`} ref={popupRef} onClick={(e) => e.stopPropagation()}>
            <div className="lang-popup__grid">
            {GROUPS.map((group) => (
              <div key={group.label} className="lang-popup__group">
                <p className="lang-popup__group-title">{group.label}</p>
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
}
