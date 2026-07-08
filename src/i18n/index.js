import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import es from "./locales/es.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import pt from "./locales/pt.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import ca from "./locales/ca.json";
import gl from "./locales/gl.json";
import eu from "./locales/eu.json";
import va from "./locales/va.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      fr: { translation: fr },
      pt: { translation: pt },
      de: { translation: de },
      it: { translation: it },
      ca: { translation: ca },
      gl: { translation: gl },
      eu: { translation: eu },
      va: { translation: va },
    },
    fallbackLng: "es",
    interpolation: { escapeValue: false },
  });

export default i18n;
