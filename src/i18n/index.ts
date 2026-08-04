import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";

// Idiomas realmente disponibles (los ficheros locales existentes).
const localeModules = import.meta.glob("./locales/*.json");
const supportedLngs = Object.keys(localeModules).map((p) => p.replace("./locales/", "").replace(/\.json$/, ""));

i18n
  .use(LanguageDetector)
  .use(resourcesToBackend((language: string) => import(`./locales/${language}.json`)))
  .use(initReactI18next)
  .init({
    fallbackLng: "es",
    supportedLngs,
    // Solo se usa la parte de idioma (sin región) al cargar recursos.
    load: "languageOnly",
    // es-US se resuelve a es (evita peticiones a locales inexistentes).
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    returnObjects: false,
    returnNull: false,
  });

export default i18n;
