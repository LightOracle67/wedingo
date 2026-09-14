/**
 * audit-language.mjs — Auditoría de "parecido a humano" de un locale de i18n.
 *
 * Para cada idioma generado muestra:
 *   · Muestreo de frases del invitado (hero/rsvp/info/transport/menu/…)
 *     es → traducción, marcando las idénticas (=es).
 *   · Placeholders {{...}} corroídos (deben ser idénticos a es).
 *   · Residuo de español (cadenas idénticas a es con caracteres españoles),
 *     separando por completo los namespaces `errors.*` y `legal.*` (focos).
 *   · Valoración heurística: si hay demasiadas idénticas a es en frases largas,
 *     la traducción probablemente no se hizo bien.
 *
 * Uso: node scripts/audit-language.mjs <lang>
 *   p.ej. node scripts/audit-language.mjs fr
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lang = process.argv[2];
if (!lang) {
  console.error("Uso: node scripts/audit-language.mjs <lang>");
  process.exit(1);
}
const esPath = join(root, "src", "i18n", "locales", "es.json");
const langPath = join(root, "src", "i18n", "locales", `${lang}.json`);
if (!existsSync(langPath)) {
  console.error(`No existe src/i18n/locales/${lang}.json`);
  process.exit(1);
}
const es = JSON.parse(readFileSync(esPath, "utf8"));
const doc = JSON.parse(readFileSync(langPath, "utf8"));

function flat(o, p = "", out = {}) {
  for (const k in o) {
    const r = p ? `${p}.${k}` : k;
    if (o[k] && typeof o[k] === "object") flat(o[k], r, out);
    else out[r] = o[k];
  }
  return out;
}
const fe = flat(es);
const fd = flat(doc);
const val = (o, k) => k.split(".").reduce((a, x) => (a && typeof a === "object" ? a[x] : undefined), o);

const ph = (s) => (String(s).match(/\{\{\s*[\w-]+\s*\}\}/g) || []).sort().join("|");

// Muestreo de frases del invitado (ordenadas por sección).
const SAMPLE = [
  "hero.kicker", "hero.subtitle", "hero.sectionLabel",
  "details.title",
  "info.inMin_one", "info.inMin_other",
  "story.title",
  "rsvp.title", "rsvp.attending", "rsvp.notAttending", "rsvp.submitButton", "rsvp.childrenMaxHint",
  "transport.modeTitle", "transport.modeBus",
  "menu.title", "menu.dishLabel",
  "gallery.title", "gifts.title",
  "common.errorBoundary.title",
];

// Residuo de español: cadenas idénticas a es con caracteres españoles.
const spanishRe = /[áéíóúñüÁÉÍÓÚÑ¿¡]/;
const identical = Object.keys(fd).filter((k) => fd[k] === fe[k] && fe[k] !== "");
const residual = identical.filter((k) => spanishRe.test(fd[k]));
const errorsLegal = residual.filter((k) => k.startsWith("errors.") || k.startsWith("legal."));
const otherResidual = residual.filter((k) => !k.startsWith("errors.") && !k.startsWith("legal."));

console.log(`\n═══ Auditoría humano: ${lang} ═══\n`);
console.log("· Muestreo de frases del invitado (es → lang):");
for (const k of SAMPLE) {
  const e = fe[k], v = val(doc, k);
  if (e === undefined || v === undefined) continue;
  const esp = ph(e), vp = ph(v);
  const tag = v === e ? " (=ES)" : esp !== vp ? " ⚠️PLACEHOLDER" : "";
  console.log(`   ES: ${e}`);
  console.log(`   ${lang}: ${String(v)}${tag}`);
}

console.log("\n· Placeholders corroídos (claves con mismatch vs es):");
const broken = Object.keys(fd).filter((k) => k in fe && ph(fd[k]) !== ph(fe[k]));
console.log(broken.length ? `   ⚠️ ${broken.slice(0, 6).join(", ")}${broken.length > 6 ? "…" : ""}` : "   ✅ 0");

console.log("\n· Residuo de español (idénticas a es):");
console.log(`   errors.*/legal.* con español: ${errorsLegal.length}`);
console.log(`   otras cadenas "idénticas": ${otherResidual.length}`);

// Valoración heurística.
const longIdentical = identical.filter((k) => fe[k].length > 80);
const suspicious = errorsLegal.length > 0 || longIdentical.length > 3;
console.log("\n· Valoración:");
if (suspicious) {
  console.log(`   ⚠️ REVISAR: ${errorsLegal.length} errores/legales en español + ${longIdentical.length} frases largas idénticas a es.`);
} else {
  console.log("   ✅ Parece traducido por un humano (sin bloque de español ni frases largas intactas).");
}