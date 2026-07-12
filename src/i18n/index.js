import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";

i18n
  .use(LanguageDetector)
  .use(resourcesToBackend((language) => import(`./locales/${language}.json`)))
  .use(initReactI18next)
  .init({
    fallbackLng: "es",
    interpolation: { escapeValue: false },
    returnObjects: false,
    returnNull: false,
  });

export default i18n;
