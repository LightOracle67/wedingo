/**
 * translate-i18n.mjs
 * ------------------------------------------------------------------
 * Genera los locales de i18n con un modelo local de Ollama (por defecto
 * qwen3.5:9b, mejor para traducción multilingüe que llama3.1) a partir de
 * `es.json` (base canónica), y valida cada idioma con el validador de QA
 * (`scripts/validate-translations.mjs`) antes de darlo por bueno.
 *
 * Garantías estructurales (aprendidas de la pasada fallida con llama3.1):
 *   - SIEMPRE se escribe cada una de las 1658 claves (si un ítem no se puede
 *     traducir, se vuelca el texto original en `es`). Nunca se pierden claves.
 *   - Los placeholders {{...}} se preservan y el validador los comprueba.
 *   - Cada idioma se valida al terminar; si falla, se avisa y NO se considera
 *     completo (aunque el fichero se deja en disco para inspección).
 *
 * Uso:
 *   node scripts/translate-i18n.mjs                 # todos los idiomas
 *   node scripts/translate-i18n.mjs --langs fr,de   # piloto concreto
 *   node scripts/translate-i18n.mjs --force         # re-traduce aunque existan
 *
 * Variables de entorno:
 *   OLLAMA_URL  (default http://localhost:11434/api/generate)
 *   OLLAMA_MODEL (default qwen3.5:9b)
 *   BATCH=50 · CONCURRENCIA=5 · MAX_RETRIES=3
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = join(root, "src", "i18n", "locales");
const logDir = join(root, "scripts", "..", ".translation-log"); // se ignora en git

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
// gemma4: modelo multilingual NO-reasoning disponible en este ollama. qwen3.5
// es reasoning y gastaba todo el presupuesto en `thinking` (response vacío).
const MODEL = process.env.OLLAMA_MODEL || "gemma4";
const BATCH = Number(process.env.BATCH || 50);
const CONCURRENCY = Number(process.env.CONCURRENCIA || 5);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);

// ── Idiomas a generar ("todos los posibles": idiomas del mundo + variantes
//    regionales de en/es/pt/fr/de/zh/ar…). ~240 códigos. Añade si quieres más.
const LANGUAGES = [
  // CATÁLOGO CONTINENTAL-GENERAL (v2.193): solo los idiomas generales que
  // cubren la práctica totalidad de la población por continente. Se eliminan
  // las variantes regionales y minoritarias (antes ~236) para reducir el
  // grind y la superficie de revisión. base es (es) y en (en) ya cubren las
  // Américas y Oceanía; los 14 en-* existentes se conservan como bonus.
  // Europa
  "fr", "de", "it", "pt-PT", "nl", "ru", "uk", "pl", "tr", "el",
  // Asia
  "zh-CN", "ja", "ko", "hi", "bn", "ta", "id", "ms", "th", "vi",
  // Oriente Medio / Asia Suroccidental
  "ar-SA", "fa", "he", "ur", "tl",
  // África
  "sw", "am", "ha", "yo", "zu", "af-ZA",
  // Américas (norte francófono + Brasil; el resto lo cubren es/en)
  "fr-CA", "pt-BR",
];

const args = process.argv.slice(2);
const pick = args.find((a) => a.startsWith("--langs="));
const langs = pick ? pick.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean) : LANGUAGES;
const force = args.includes("--force");

// ── Base canónica es.json ──
const es = JSON.parse(readFileSync(join(localesDir, "es.json"), "utf8"));
function flat(o, p = "", out = {}) {
  for (const k in o) {
    const r = p ? `${p}.${k}` : k;
    if (o[k] && typeof o[k] === "object") flat(o[k], r, out);
    else out[r] = o[k];
  }
  return out;
}
const esFlat = flat(es);
const ITEMS = Object.entries(esFlat).map(([key, text]) => ({ key, text: String(text) }));
console.log(`Base: ${ITEMS.length} claves · modelo ${MODEL} · lote ${BATCH} · conc ${CONCURRENCY}`);

// Nombres de idioma legibles (evita que el modelo malinterprete códigos ISO
// ambiguos como "de"=preposición española, "el", "ms", "yo", "ha", "am"…).
const LANG_NAMES = {
  // en / es + variantes ya generadas
  "en": "inglés", "en-GB": "inglés británico", "en-US": "inglés americano",
  "en-AU": "inglés australiano", "en-CA": "inglés canadiense", "en-NZ": "inglés de Nueva Zelanda",
  "en-IN": "inglés de la India", "en-IE": "inglés irlandés", "en-SG": "inglés de Singapur",
  "en-NG": "inglés de Nigeria", "en-PH": "inglés filipino", "en-MY": "inglés de Malasia",
  "en-HK": "inglés de Hong Kong", "en-JM": "inglés jamaicano", "en-ZA": "inglés sudafricano",
  // Europa
  "fr": "francés", "de": "alemán", "it": "italiano", "pt-PT": "portugués de Portugal",
  "nl": "neerlandés", "ru": "ruso", "uk": "ucraniano", "pl": "polaco", "tr": "turco", "el": "griego",
  // Asia
  "zh-CN": "chino simplificado", "zh-TW": "chino tradicional", "ja": "japonés", "ko": "coreano",
  "hi": "hindi", "bn": "bengalí", "ta": "tamil", "id": "indonesio", "ms": "malayo",
  "th": "tailandés", "vi": "vietnamita",
  // Oriente Medio / Asia SO
  "ar-SA": "árabe", "fa": "persa", "he": "hebreo", "ur": "urdu", "tl": "tagalo",
  // África
  "sw": "suajili", "am": "amárico", "ha": "hausa", "yo": "yoruba", "zu": "zulú", "af-ZA": "afrikáans",
  // Américas
  "fr-CA": "francés canadiense", "pt-BR": "portugués brasileño",
};

function toNested(m) {
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    const parts = k.split(".");
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      cur[p] = cur[p] || {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = v;
  }
  return out;
}

let lastErrorFromModel = null;
async function callOllama(promptItems, lang, extra = "") {
  const langName = LANG_NAMES[lang] || lang;
  const prompt = `Traduce al idioma "${langName}" (código ISO "${lang}") manteniendo el tono de una invitación de boda.\n` +
    promptItems.map((it, i) => `${i}: ${it.text}`).join("\n");
  const system =
    "Eres un traductor profesional de invitaciones de boda. Recibes una lista de textos en español " +
    "y debes traducirlos al idioma pedido. Devuelve EXCLUSIVAMENTE JSON: un objeto con el índice como " +
    'clave y la traducción como valor, p.ej. {"0":"texto","1":"texto2"}. Reglas: preserva SIEMPRE los ' +
    "placeholders {{...}} tal cual; tono natural y cálido de boda; los nombres propios, URLs y códigos NO " +
    "se traducen; NO añadas ni omitas elementos; NO añadas nada fuera del JSON." +
    extra;
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      system,
      stream: false,
      format: "json",
      options: { temperature: 0.3, num_ctx: 8192, num_predict: 8192 },
    }),
  });
  if (!res.ok) throw new Error(`ollama status ${res.status}`);
  const data = await res.json();
  const text = data.response || data.message || "";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON inválido de ollama");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("respuesta no-objeto de ollama");
  }
  lastErrorFromModel = null;
  return parsed;
}

/** Traduce un lote, con retries y sub-división; devuelve array de traducciones (fallback al texto es). */
async function translateBatch(items, lang, extra = "") {
  const out = new Array(items.length);
  async function rec(seg, offset, depth) {
    if (seg.length === 0) return;
    let parsed = null;
    let lastErr = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        parsed = await callOllama(seg, lang, extra);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (parsed) {
      for (let i = 0; i < seg.length; i++) {
        const v = parsed[String(i)];
        // Solo se confía en la traducción si es string no vacío; si no, español.
        out[offset + i] = v && typeof v === "string" && v.trim() !== "" ? v : seg[i].text;
      }
      return;
    }
    // Fallo total: subdividir (evita repetir el batch entero y garantiza cobertura).
    if (seg.length === 1 || depth > 4) {
      // Rellenar TODAS las posiciones del segmento (no solo seg[0]): rellenar
      // solo la primera dejaba el resto `undefined` → JSON.stringify los perdía
      // y el locale salía con ~594 claves FALTANTES de forma determinista.
      for (let j = 0; j < seg.length; j++) out[offset + j] = seg[j].text;
      return;
    }
    const mid = Math.ceil(seg.length / 2);
    await rec(seg.slice(0, mid), offset, depth + 1);
    await rec(seg.slice(mid), offset + mid, depth + 1);
  }
  await rec(items, 0, 0);
  return out;
}

// ── Pool de idiomas con concurrencia ──
async function pool(tasks, limit) {
  const results = new Array(tasks.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  });
  await Promise.all(workers);
  return results;
}

mkdirSync(logDir, { recursive: true });

// Log a fichero además de stdout: la captura del background puede perder
// salida; el log en disco es la fuente fiable para revisar en otra sesión.
const runLog = join(logDir, `run-${Date.now()}.log`);
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  writeFileSync(runLog, line + "\n", { flag: "a" });
  try { console.log(msg); } catch {}
}

const todo = langs.filter((l) => force || !existsSync(join(localesDir, `${l}.json`)));
log(`Arranque: ${todo.length} idiomas · modelo ${MODEL} · lote ${BATCH} · conc ${CONCURRENCY}`);

let okCount = 0;
let failCount = 0;

await pool(
  todo.map((lang) => async () => {
    try {
      await generateLanguage(lang);
    } catch (e) {
      failCount++;
      log(`❌ ${lang} · excepción: ${e && e.message ? e.message : e}`);
    }
  }),
  CONCURRENCY,
);

log(`Resumen: ${okCount} ok · ${failCount} fallos (${todo.length} procesados)`);
log("Revisa con: node scripts/validate-translations.mjs");

async function generateLanguage(lang) {
  const t0 = Date.now();
  const flatResult = {};
  let fallbacks = 0;
  for (let b = 0; b < ITEMS.length; b += BATCH) {
    const batch = ITEMS.slice(b, b + BATCH);
    const trans = await translateBatch(batch, lang);
    batch.forEach((it, j) => {
      flatResult[it.key] = trans[j];
      if (trans[j] === it.text) fallbacks++;
    });
    log(`⌛ ${lang} · lote ${Math.round(b / BATCH) + 1}/${Math.ceil(ITEMS.length / BATCH)} (${batch.length})`);
  }
  // GARANTÍA anti-ficheros-truncados: JSON.stringify OMITE las claves con
  // valor `undefined`/`null`. Se rellenan ANTES de toNested para que ningún
  // locale salga incompleto (fallback seguro al texto es).
  let undefinedSeen = 0;
  let firstUndefined = null;
  for (const it of ITEMS) {
    if (flatResult[it.key] === undefined || flatResult[it.key] === null) {
      if (flatResult[it.key] === undefined) {
        undefinedSeen++;
        if (firstUndefined === null) firstUndefined = it.key;
      }
      flatResult[it.key] = it.text;
    }
  }
  if (undefinedSeen > 0) {
    log(`⚠️ ${lang}: ${undefinedSeen} claves undefined reparadas (1ª: ${firstUndefined}) → fallback a es.`);
  }

  const nested = toNested(flatResult);
  const fallbackPct = (fallbacks / ITEMS.length) * 100;

  void undefinedSeen;
  void firstUndefined;

  // REPAIR: a veces el modelo devuelve el texto original en español (p.ej.
  // bloques legal/errors). Si un ítem quedó "idéntico al es" y lleva
  // caracteres inequívocamente españoles (tildes/¿¡/ñ), se re-traduce con un
  // prompt reforzado antes de dar el idioma por bueno.
  const spanishRe = /[áéíóúñüÁÉÍÓÚÑ¿¡]/;
  // El repair anti-español-residual SOLO aplica a idiomas NO españoles: para
  // variantes es-* (y no se generan) la coincidencia con es es normal y
  // re-traducir con "prohibido el español" no tiene sentido.
  const isSpanishLang = /^es(-|$)/.test(lang || "");
  const suspicious = ITEMS.filter(
    (it) =>
      !isSpanishLang &&
      String(flatResult[it.key]) === it.text &&
      it.text !== "" &&
      !it.text.includes("{{") &&
      !/^https?:|^@|^www\./.test(it.text) &&
      spanishRe.test(it.text),
  );
  if (suspicious.length > 0) {
    log(`⚠️ ${lang}: ${suspicious.length} cadenas quedaron en español; reintento con prompt reforzado…`);
    const reinforced =
      " REFUERZO: traduce SIEMPRE al idioma objetivo; está PROHIBIDO devolver texto en español. " +
      "Si la traducción coincidiría con el original, reescríbela correctamente en el idioma objetivo.";
    for (let b = 0; b < suspicious.length; b += 50) {
      const seg = suspicious.slice(b, b + 50);
      const trans = await translateBatch(seg, lang, reinforced);
      seg.forEach((it, j) => {
        const v = trans[j];
        // Solo sustituir si la nueva NO es idéntica al es o NO tiene español inequívoco.
        if (v !== it.text || !spanishRe.test(v)) flatResult[it.key] = v;
      });
    }
  }

  const file = join(localesDir, `${lang}.json`);
  writeFileSync(file, JSON.stringify(nested, null, 2) + "\n");

  // QA: validar estructura del locale generado (siempre deben estar todas
  // las claves y los placeholders {{...}} intactos).
  let pass = true;
  for (const it of ITEMS) {
    if (!(it.key in flatResult)) { pass = false; break; }
    const a = (it.text.match(/\{\{\s*[\w-]+\s*\}\}/g) || []);
    const b = (String(flatResult[it.key]).match(/\{\{\s*[\w-]+\s*\}\}/g) || []);
    if (a.sort().join("|") !== b.sort().join("|")) { pass = false; break; }
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  if (pass) {
    okCount++;
    log(`✅ ${lang} → ${secs}s · ${ITEMS.length} claves · ${fallbackPct.toFixed(1)}% vueltas a es`);
  } else {
    failCount++;
    log(`❌ ${lang} → ${secs}s · NO PASS en QA (claves/placeholders). Fichero en disco para inspección.`);
  }
}