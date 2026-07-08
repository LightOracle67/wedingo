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
import da from "./locales/da.json";
import fi from "./locales/fi.json";
import el from "./locales/el.json";
import hr from "./locales/hr.json";
import hu from "./locales/hu.json";
import is from "./locales/is.json";
import lt from "./locales/lt.json";
import lv from "./locales/lv.json";
import mt from "./locales/mt.json";
import nl from "./locales/nl.json";
import no from "./locales/no.json";
import pl from "./locales/pl.json";
import ro from "./locales/ro.json";
import sk from "./locales/sk.json";
import sl from "./locales/sl.json";
import sv from "./locales/sv.json";
import cs from "./locales/cs.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import he from "./locales/he.json";
import hi from "./locales/hi.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import ms from "./locales/ms.json";
import ru from "./locales/ru.json";
import th from "./locales/th.json";
import tr from "./locales/tr.json";
import uk from "./locales/uk.json";
import vi from "./locales/vi.json";
import bn from "./locales/bn.json";
import sw from "./locales/sw.json";

const resources = {
  es, en, fr, pt, de, it, ca, gl, eu, va,
  da, fi, el, hr, hu, is, lt, lv, mt, nl,
  no, pl, ro, sk, sl, sv, cs, ar, zh, he,
  hi, ja, ko, ms, ru, th, tr, uk, vi, bn, sw,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es",
    interpolation: { escapeValue: false },
    returnObjects: false,
    returnNull: false,
  });

export default i18n;
