import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { isRtlLang } from "./languages";
import { applyHreflangLinks } from "../lib/seo";

// Idiomas realmente disponibles (los ficheros locales existentes).
const localeModules = import.meta.glob("./locales/*.json");
const supportedLngs = Object.keys(localeModules).map((p) => p.replace("./locales/", "").replace(/\.json$/, ""));

// Sincroniza <html lang>/<html dir> (RTL) y los enlaces hreflang/canonical (SEO).
function syncDocumentMeta() {
  if (typeof document === "undefined") return;
  const lng = i18n.resolvedLanguage || i18n.language || "es";
  document.documentElement.lang = lng;
  document.documentElement.dir = isRtlLang(lng) ? "rtl" : "ltr";
  applyHreflangLinks();
}

i18n.on("languageChanged", syncDocumentMeta);

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
    // OJO: NO usar nonExplicitSupportedLngs — con él i18next NO carga los
    // bundles con región (pt-BR/pt-PT/ar-SA/…) y se resuelve a `es` (bug en
    // vivo: portugués en español y dir=ltr). Con false, un navegador que
    // reporte es-US/zh/etc. cae a fallbackLng o al fichero base (ver alias
    // pt.json/zh.json/ar.json/af.json creados para detección pura).
    nonExplicitSupportedLngs: false,
    // `?lang=xx` es prioritario (enlaces compartibles + hreflang), luego la
    // preferencia guardada y, por último, el idioma del navegador.
    detection: {
      order: ["querystring", "localStorage", "navigator", "htmlTag"],
      lookupQuerystring: "lang",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
    returnObjects: false,
    returnNull: false,
  });

// Aplicar lang/dir y hreflang también en el arranque (el evento languageChanged
// puede no dispararse al inicializar).
syncDocumentMeta();

export default i18n;
