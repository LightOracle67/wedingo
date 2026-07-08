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

const NAMESPACES = Object.keys(es);

function toNamespaces(src) {
  return Object.fromEntries(Object.entries(src).map(([k, v]) => [k, { translation: v }]));
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: toNamespaces(es),
      en: toNamespaces(en),
      fr: toNamespaces(fr),
      pt: toNamespaces(pt),
      de: toNamespaces(de),
      it: toNamespaces(it),
      ca: toNamespaces(ca),
      gl: toNamespaces(gl),
      eu: toNamespaces(eu),
      va: toNamespaces(va),
    },
    ns: NAMESPACES,
    defaultNS: "common",
    fallbackLng: "es",
    interpolation: { escapeValue: false },
    initImmediate: false,
    returnObjects: false,
    returnNull: false,
  });

export default i18n;
