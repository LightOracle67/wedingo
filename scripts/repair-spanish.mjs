/**
 * repair-spanish.mjs — Re-traduce los residuos de ESPAÑOL en los locales.
 *
 * Los locales generados antes de los fixes del generador conservan algunos
 * mensajes de `errors.*`/`legal.*` sin traducir (texto español con tildes/¿¡).
 * Este script detecta esas claves y las re-traduce con un prompt reforzado
 * ("NO dejar texto en español"), con reintentos y fallback seguro a es.
 *
 * Uso: node scripts/repair-spanish.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = join(root, "src", "i18n", "locales");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const MODEL = process.env.OLLAMA_MODEL || "gemma4";
const CONCURRENCY = Number(process.env.CONCURRENCIA || 3);
/** --relaxed: acepta cualquier traducción distinta de es (útil para pt/vi,
 *  cuyas ortografías usan acentos similares a los españoles). */
const RELAXED = process.argv.includes("--relaxed");
const SKIP = new Set((process.argv.find((a) => a.startsWith("--skip=")) || "").split("=")[1]?.split(",").map((x) => x.trim()).filter(Boolean) || []);

const LANG_NAMES = {
  fr: "francés", de: "alemán", it: "italiano", "pt-PT": "portugués de Portugal", nl: "neerlandés",
  ru: "ruso", uk: "ucraniano", pl: "polaco", tr: "turco", el: "griego",
  "zh-CN": "chino simplificado", ja: "japonés", ko: "coreano", hi: "hindi", bn: "bengalí",
  ta: "tamil", id: "indonesio", ms: "malayo", th: "tailandés", vi: "vietnamita",
  "ar-SA": "árabe", fa: "persa", he: "hebreo", ur: "urdu", tl: "tagalo",
  sw: "suajili", am: "amárico", ha: "hausa", yo: "yoruba", zu: "zulú", "af-ZA": "afrikáans",
  "fr-CA": "francés canadiense", "pt-BR": "portugués brasileño",
};

const es = JSON.parse(readFileSync(join(localesDir, "es.json"), "utf8"));
function flat(o) {
  const out = {};
  function go(o, p = "") {
    for (const k in o) {
      const r = p ? `${p}.${k}` : k;
      if (o[k] && typeof o[k] === "object") go(o[k], r);
      else out[r] = o[k];
    }
  }
  go(o);
  return out;
}
const fe = flat(es);
const spanishRe = /[áéíóúñüÁÉÍÓÚÑ¿¡]/;
const ph = (s) => (String(s).match(/\{\{\s*[\w-]+\s*\}\}/g) || []).sort().join("|");

// Claves candidatas: errors.*/legal.* idénticas a es con caracteres españoles
// y texto largo (no URLs/nombres).
// Palabras inequívocamente españolas (no cognados) para reducir falsos positivos
// en idiomas que comparten vocabulario con el español (pt, it, fr...).
const esSolo = /\b(el|la|los|las|un|una|unos|unas|y|o|de|del|que|con|para|por|en|no|es|son|está|puede|ser|más|menos|todos|todas|nuestros|nuestras|tu|su|sus|mi|mis|este|esta|como|porque|siempre|invitación|invitados|asistencia|confirmar|confirmación|guardar|eliminar|cargando|por favor|muchas gracias|fecha|horario|lugar|dirección|número|nombre|apellidos)[a-záéíóúñ]*\b/i;

function findSuspicious(fd) {
  const out = [];
  for (const [k, v] of Object.entries(fd)) {
    const src = fe[k];
    if (
      v === src &&
      typeof src === "string" &&
      src.length > 10 &&
      !/https?:|\{\{|@/.test(src) &&
      esSolo.test(src)
    ) {
      out.push(k);
    }
  }
  return out;
}

async function translate(lang, items) {
  const langName = LANG_NAMES[lang] || lang;
  const prompt = `Traduce al idioma "${langName}" (ISO "${lang}"):\n` + items.map((t, i) => `${i}: ${t}`).join("\n");
  const system =
    "Eres un traductor profesional. Devuelve SOLO JSON {\"0\":\"...\",\"1\":\"...\"} con los textos traducidos. " +
    "ESTÁ PROHIBIDO devolver texto en español. Preserva los placeholders {{...}} tal cual. No añadas nada fuera del JSON.";
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, system, stream: false, format: "json", options: { temperature: 0.3, num_ctx: 8192, num_predict: 8192 } }),
  });
  if (!res.ok) throw new Error("ollama " + res.status);
  const data = await res.json();
  return JSON.parse(data.response);
}

async function processLocale(file) {
  const lang = file.replace(".json", "");
  if (lang === "es" || lang === "en") return;
  if (SKIP.has(lang)) return;
  const doc = JSON.parse(readFileSync(join(localesDir, file), "utf8"));
  const fd = flat(doc);
  const keys = findSuspicious(fd);
  if (keys.length === 0) return;
  const texts = keys.map((k) => fe[k]);
  let parsed = null;
  for (let attempt = 0; attempt < 3 && !parsed; attempt++) {
    try {
      parsed = await translate(lang, texts);
      // Rechazar si alguna salida sigue con caracteres inequívocamente españoles
      // y es idéntica al original (probablemente el modelo echó el prompt).
      const vals = keys.map((_, i) => parsed[String(i)]);
      if (vals.some((v) => typeof v !== "string" || v.trim() === "" || (v === fe[keys[vals.indexOf(v)]] && spanishRe.test(v)))) {
        parsed = null;
      }
    } catch {
      /* reintento */
    }
  }
  let fixed = 0;
  keys.forEach((k, i) => {
    const v = parsed?.[String(i)];
    const different = typeof v === "string" && v.trim() !== "" && v !== fe[k] && ph(v) === ph(fe[k]);
    const noSpanish = RELAXED || !spanishRe.test(v || "");
    if (different && noSpanish) {
      const parts = k.split(".");
      let cur = doc;
      for (let j = 0; j < parts.length - 1; j++) {
        if (cur[parts[j]] == null || typeof cur[parts[j]] !== "object") cur[parts[j]] = {};
        cur = cur[parts[j]];
      }
      cur[parts[parts.length - 1]] = v;
      fixed++;
    }
  });
  writeFileSync(join(localesDir, file), JSON.stringify(doc, null, 2) + "\n");
  console.log(`${keys.length} candidatas → ${fixed} corregidas en ${lang}`);
}

const files = readdirSync(localesDir).filter((f) => f.endsWith(".json") && f !== "es.json" && f !== "en.json");
let i = 0;
const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
  while (i < files.length) {
    const idx = i++;
    await processLocale(files[idx]);
  }
});
await Promise.all(workers);
console.log("Hecho. Valida con translations:validate y audit-language.");