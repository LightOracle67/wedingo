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
import bgRaw from "./locales/bg.json";
import etRaw from "./locales/et.json";
import gaRaw from "./locales/ga.json";
import cyRaw from "./locales/cy.json";
import sqRaw from "./locales/sq.json";
import mkRaw from "./locales/mk.json";
import bsRaw from "./locales/bs.json";
import srRaw from "./locales/sr.json";
import idRaw from "./locales/id.json";
import tlRaw from "./locales/tl.json";
import urRaw from "./locales/ur.json";
import faRaw from "./locales/fa.json";
import taRaw from "./locales/ta.json";
import teRaw from "./locales/te.json";
import mrRaw from "./locales/mr.json";
import guRaw from "./locales/gu.json";
import kmRaw from "./locales/km.json";
import loRaw from "./locales/lo.json";
import myRaw from "./locales/my.json";
import kaRaw from "./locales/ka.json";
import hyRaw from "./locales/hy.json";
import azRaw from "./locales/az.json";
import kkRaw from "./locales/kk.json";
import uzRaw from "./locales/uz.json";
import amRaw from "./locales/am.json";
import haRaw from "./locales/ha.json";
import yoRaw from "./locales/yo.json";
import igRaw from "./locales/ig.json";
import zuRaw from "./locales/zu.json";
import rwRaw from "./locales/rw.json";
import omRaw from "./locales/om.json";
import quRaw from "./locales/qu.json";
import gnRaw from "./locales/gn.json";
import htRaw from "./locales/ht.json";
import eoRaw from "./locales/eo.json";

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
      sw: wrap(swRaw), bg: wrap(bgRaw), et: wrap(etRaw), ga: wrap(gaRaw),
      cy: wrap(cyRaw), sq: wrap(sqRaw), mk: wrap(mkRaw), bs: wrap(bsRaw),
      sr: wrap(srRaw), id: wrap(idRaw), tl: wrap(tlRaw), ur: wrap(urRaw),
      fa: wrap(faRaw), ta: wrap(taRaw), te: wrap(teRaw), mr: wrap(mrRaw),
      gu: wrap(guRaw), km: wrap(kmRaw), lo: wrap(loRaw), my: wrap(myRaw),
      ka: wrap(kaRaw), hy: wrap(hyRaw), az: wrap(azRaw), kk: wrap(kkRaw),
      uz: wrap(uzRaw), am: wrap(amRaw), ha: wrap(haRaw), yo: wrap(yoRaw),
      ig: wrap(igRaw), zu: wrap(zuRaw), rw: wrap(rwRaw), om: wrap(omRaw),
      qu: wrap(quRaw), gn: wrap(gnRaw), ht: wrap(htRaw), eo: wrap(eoRaw),
    },
    fallbackLng: "es",
    interpolation: { escapeValue: false },
    returnObjects: false,
    returnNull: false,
  });

export default i18n;
