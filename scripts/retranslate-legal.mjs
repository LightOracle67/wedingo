/**
 * retranslate-legal.mjs
 * ------------------------------------------------------------------
 * Re-traduce por Ollama un conjunto concreto de claves (por defecto las dos
 * legales que mencionaban el widget de Google Translate) para TODOS los locales
 * existentes, partiendo del texto actualizado de `es.json`, y parchea los
 * ficheros en su sitio.
 *
 * Uso: node scripts/retranslate-legal.mjs [clave1,clave2,...]
 *   (por defecto: legal.cookiesPolicy,legal.privacyPolicy)
 *
 * Preserva placeholders {{...}}; si la traducción los rompe, revierte a es.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = join(root, "src", "i18n", "locales");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const MODEL = process.env.OLLAMA_MODEL || "gemma4";
const CONCURRENCY = Number(process.env.CONCURRENCIA || 3);

const KEY_ARGS = process.argv[2];
const LANG_ARG = (process.argv[3] || "").match(/^--langs=(.+)$/)?.[1];
const KEYS = KEY_ARGS
  ? KEY_ARGS.split(",").map((s) => s.trim()).filter(Boolean)
  : ["legal.cookiesPolicy", "legal.privacyPolicy"];
const LANG_FILTER = LANG_ARG ? new Set(LANG_ARG.split(",").map((s) => s.trim()).filter(Boolean)) : null;

const LANG_NAMES = {
  "en-AU": "inglés australiano", "en-CA": "inglés canadiense", "en-GB": "inglés británico",
  "en-HK": "inglés de Hong Kong", "en-IE": "inglés irlandés", "en-IN": "inglés de la India",
  "en-JM": "inglés jamaicano", "en-MY": "inglés de Malasia", "en-NG": "inglés de Nigeria",
  "en-NZ": "inglés de Nueva Zelanda", "en-PH": "inglés filipino", "en-SG": "inglés de Singapur",
  "en-US": "inglés americano", "en-ZA": "inglés sudafricano",
  fr: "francés", de: "alemán", it: "italiano", "pt-PT": "portugués de Portugal", nl: "neerlandés",
  ru: "ruso", uk: "ucraniano", pl: "polaco", tr: "turco", el: "griego",
  "zh-CN": "chino simplificado", ja: "japonés", ko: "coreano", hi: "hindi", bn: "bengalí",
  ta: "tamil", id: "indonesio", ms: "malayo", th: "tailandés", vi: "vietnamita",
  "ar-SA": "árabe", fa: "persa", he: "hebreo", ur: "urdu", tl: "tagalo",
  sw: "suajili", am: "amárico", ha: "hausa", yo: "yoruba", zu: "zulú", "af-ZA": "afrikáans",
  "fr-CA": "francés canadiense", "pt-BR": "portugués brasileño",
};

const es = JSON.parse(readFileSync(join(localesDir, "es.json"), "utf8"));
function getPath(o, path) {
  return path.split(".").reduce((a, k) => (a && typeof a === "object" ? a[k] : undefined), o);
}
function setPath(o, path, value) {
  const parts = path.split(".");
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    // Crear los tramos intermedios si no existen (o son hojas que chocan).
    if (cur[p] === undefined || cur[p] === null || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}
const ph = (s) => (String(s).match(/\{\{\s*[\w-]+\s*\}\}/g) || []).sort().join("|");

async function callOllama(items, lang) {
  const langName = LANG_NAMES[lang] || lang;
  const prompt =
    `Traduce al idioma "${langName}" (código ISO "${lang}"), conservando EXACTAMENTE los saltos de línea y viñetas:\n` +
    items.map((t, i) => `### ${i}\n${t}`).join("\n");
  const system =
    "Eres un traductor profesional de textos legales de una web de invitaciones de boda. Devuelve " +
    'EXCLUSIVAMENTE JSON: un objeto {"0":"traducción","1":"traducción"} con cada texto traducido. ' +
    "Preserva los placeholders {{...}} tal cual y deja igual las URLs, emails y nombres propios. No añadas nada fuera del JSON.";
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, system, stream: false, format: "json", options: { temperature: 0.2, num_ctx: 8192, num_predict: 8192 } }),
  });
  if (!res.ok) throw new Error("ollama " + res.status);
  const data = await res.json();
  return JSON.parse(data.response);
}

async function processLocale(file) {
  const lang = file.replace(".json", "");
  if (lang === "es" || lang === "en") return; // human-maintained
  const doc = JSON.parse(readFileSync(join(localesDir, file), "utf8"));
  const sourceTexts = KEYS.map((k) => getPath(es, k));
  if (sourceTexts.some((t) => typeof t !== "string")) return;
  let parsed;
  try {
    parsed = await callOllama(sourceTexts, lang);
  } catch (e) {
    console.error(`❌ ${lang}: ${e.message}`);
    return;
  }
  KEYS.forEach((k, i) => {
    const v = parsed[String(i)];
    if (typeof v === "string" && v.trim() !== "" && ph(v) === ph(getPath(es, k))) {
      setPath(doc, k, v);
    } else {
      setPath(doc, k, getPath(es, k)); // fallback seguro
    }
  });
  writeFileSync(join(localesDir, file), JSON.stringify(doc, null, 2) + "\n");
  console.log(`✅ ${lang}`);
}

const files = readdirSync(localesDir).filter((f) => f.endsWith(".json"));
const filtered = LANG_FILTER ? files.filter((f) => LANG_FILTER.has(f.replace(".json", ""))) : files;
const todo = filtered.filter((f) => f !== "es.json" && f !== "en.json");
console.log(`Re-traduciendo ${KEYS.length} claves en ${todo.length} locales (modelo ${MODEL})…`);

let i = 0;
const workers = Array.from({ length: Math.min(CONCURRENCY, todo.length) }, async () => {
  while (i < todo.length) {
    const idx = i++;
    await processLocale(todo[idx]);
  }
});
await Promise.all(workers);
console.log("Hecho. Valida con: node scripts/validate-translations.mjs");
