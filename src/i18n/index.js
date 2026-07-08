import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import esRaw from "./locales/es.json";
import enRaw from "./locales/en.json";
import frRaw from "./locales/fr.json";
import ptRaw from "./locales/pt.json";
import deRaw from "./locales/de.json";
import itRaw from "./locales/it.json";
import caRaw from "./locales/ca.json";
import glRaw from "./locales/gl.json";
import euRaw from "./locales/eu.json";
import vaRaw from "./locales/va.json";
import daRaw from "./locales/da.json";
import fiRaw from "./locales/fi.json";
import elRaw from "./locales/el.json";
import hrRaw from "./locales/hr.json";
import huRaw from "./locales/hu.json";
import isRaw from "./locales/is.json";
import ltRaw from "./locales/lt.json";
import lvRaw from "./locales/lv.json";
import mtRaw from "./locales/mt.json";
import nlRaw from "./locales/nl.json";
import noRaw from "./locales/no.json";
import plRaw from "./locales/pl.json";
import roRaw from "./locales/ro.json";
import skRaw from "./locales/sk.json";
import slRaw from "./locales/sl.json";
import svRaw from "./locales/sv.json";
import csRaw from "./locales/cs.json";
import arRaw from "./locales/ar.json";
import zhRaw from "./locales/zh.json";
import heRaw from "./locales/he.json";
import hiRaw from "./locales/hi.json";
import jaRaw from "./locales/ja.json";
import koRaw from "./locales/ko.json";
import msRaw from "./locales/ms.json";
import ruRaw from "./locales/ru.json";
import thRaw from "./locales/th.json";
import trRaw from "./locales/tr.json";
import ukRaw from "./locales/uk.json";
import viRaw from "./locales/vi.json";
import bnRaw from "./locales/bn.json";
import swRaw from "./locales/sw.json";

function wrap(data) {
  return { translation: data };
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: wrap(esRaw), en: wrap(enRaw), fr: wrap(frRaw), pt: wrap(ptRaw),
      de: wrap(deRaw), it: wrap(itRaw), ca: wrap(caRaw), gl: wrap(glRaw),
      eu: wrap(euRaw), va: wrap(vaRaw), da: wrap(daRaw), fi: wrap(fiRaw),
      el: wrap(elRaw), hr: wrap(hrRaw), hu: wrap(huRaw), is: wrap(isRaw),
      lt: wrap(ltRaw), lv: wrap(lvRaw), mt: wrap(mtRaw), nl: wrap(nlRaw),
      no: wrap(noRaw), pl: wrap(plRaw), ro: wrap(roRaw), sk: wrap(skRaw),
      sl: wrap(slRaw), sv: wrap(svRaw), cs: wrap(csRaw), ar: wrap(arRaw),
      zh: wrap(zhRaw), he: wrap(heRaw), hi: wrap(hiRaw), ja: wrap(jaRaw),
      ko: wrap(koRaw), ms: wrap(msRaw), ru: wrap(ruRaw), th: wrap(thRaw),
      tr: wrap(trRaw), uk: wrap(ukRaw), vi: wrap(viRaw), bn: wrap(bnRaw),
      sw: wrap(swRaw),
    },
    fallbackLng: "es",
    interpolation: { escapeValue: false },
    returnObjects: false,
    returnNull: false,
  });

export default i18n;
