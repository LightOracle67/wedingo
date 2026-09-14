import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { isRtlLang } from "./languages";

// Idiomas realmente disponibles (los ficheros locales existentes).
const localeModules = import.meta.glob("./locales/*.json");
const supportedLngs = Object.keys(localeModules).map((p) => p.replace("./locales/", "").replace(/\.json$/, ""));

// Sincroniza <html lang> y <html dir> (RTL para árabe/hebreo/urdu/persa).
function syncHtmlLangDir() {
  if (typeof document === "undefined") return;
  const lng = i18n.resolvedLanguage || i18n.language || "es";
  document.documentElement.lang = lng;
  document.documentElement.dir = isRtlLang(lng) ? "rtl" : "ltr";
}

i18n.on("languageChanged", syncHtmlLangDir);

i18n
  .use(LanguageDetector)
  .use(resourcesToBackend((language: string) => import(`./locales/${language}.json`)))
  .use(initReactI18next)
  .init({
    fallbackLng: "es",
    supportedLngs,
    // "all" mantiene la región (pt-BR, pt-PT, zh-CN, fr-CA…) al cargar el
    // recurso: con "languageOnly" se pedía /locales/pt.json que no existe y
    // las variantes de región se caían a es. Ahora pt-BR carga pt-BR.json.
    load: "all",
    // es-US se resuelve a es (evita peticiones a locales inexistentes).
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    returnObjects: false,
    returnNull: false,
  });

// Aplicar lang/dir también en el arranque (el evento languageChanged puede no
// dispararse al inicializar).
syncHtmlLangDir();

export default i18n;
