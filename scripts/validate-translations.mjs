/**
 * validate-translations.mjs
 * ------------------------------------------------------------------
 * Validador de QA para los locales de i18n, pensado para que ninguna
 * traducción (humana o generada por IA) entre al repo si pierde estructura.
 *
 * Detecta, frent a `es.json` (base canónica):
 *   - JSON inválido.
 *   - Claves FALTANTES o EXTRA respecto a la base (el fallo de la pasada IA:
 *     locales con 100-160 claves perdidas).
 *   - PLACEHOLDERS corruptos: si una clave usa `{{var}}`, la traducción debe
 *     preservar exactamente el mismo conjunto de `{{...}}`.
 *   - Cadena SIN TRADUCIR (idéntica al original es) — se reporta como warning
 *     (algunos valores legítimos como URLs, números o nombres propios quedan
 *     idénticos, por eso no bloquea).
 *
 * Uso:
 *   node scripts/validate-translations.mjs            # valida todos los locales
 *   node scripts/validate-translations.mjs fr.json    # valida uno
 *
 * Exit code: 0 OK · 1 errores estructurales (bloqueantes).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = join(root, "src", "i18n", "locales");

const QUIET = process.argv.includes("--quiet");
const only = process.argv[2];
const placeholderRe = /\{\{\s*[\w-]+\s*\}\}/g;

function flat(o, prefix = "", out = {}) {
  for (const k of Object.keys(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (o[k] !== null && typeof o[k] === "object") flat(o[k], key, out);
    else out[key] = o[k];
  }
  return out;
}

// Log verbose (se suprime con --quiet para pre-commit/CI).
function log(msg){ if(!QUIET) console.log(msg); }
function warn(msg){ if(!QUIET) console.warn(msg); }
function placeholders(str) {
  const s = String(str);
  return (s.match(placeholderRe) || []).sort();
}

const esRaw = readFileSync(join(localesDir, "es.json"), "utf8");
let esDoc;
try {
  esDoc = JSON.parse(esRaw);
} catch (e) {
  console.error("❌ es.json inválido:", e.message);
  process.exit(1);
}
const es = flat(esDoc);
const esKeys = new Set(Object.keys(es));

const files = only
  ? [only]
  : readdirSync(localesDir).filter((f) => f.endsWith(".json") && f !== "es.json");

let hadError = false;

for (const file of files) {
  if (!file.endsWith(".json")) continue;
  const lang = file.replace(".json", "");
  log(`\n═══ ${lang} ═══`);
  let doc;
  try {
    doc = JSON.parse(readFileSync(join(localesDir, file), "utf8"));
  } catch (e) {
    console.error(`❌ JSON inválido en ${file}: ${e.message}`);
    hadError = true;
    continue;
  }
  const flatLoc = flat(doc);
  const keys = Object.keys(flatLoc);
  const missing = [...esKeys].filter((k) => !(k in flatLoc));
  const extra = keys.filter((k) => !esKeys.has(k));

  if (missing.length) {
    hadError = true;
    console.error(`❌ ${missing.length} claves FALTANTES (bloqueante):`);
    console.error(`   ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`);
  }
  if (extra.length) {
    hadError = true;
    console.error(`❌ ${extra.length} claves EXTRA (bloqueante):`);
    console.error(`   ${extra.slice(0, 8).join(", ")}${extra.length > 8 ? "…" : ""}`);
  }

  // Placeholders: cada clave debe conservar el MISMO conjunto de {{vars}}.
  let phBroken = 0;
  const phSamples = [];
  for (const k of keys) {
    if (!(k in es)) continue;
    const a = placeholders(es[k]);
    const b = placeholders(flatLoc[k]);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      phBroken++;
      if (phSamples.length < 5) phSamples.push(`${k}: es[${a}] → ${lang}[${b}]`);
    }
  }
  if (phBroken) {
    hadError = true;
    console.error(`❌ ${phBroken} claves con placeholders rotos (bloqueante):`);
    phSamples.forEach((s) => console.error(`   - ${s}`));
  }

  // Sin traducir (warnings, no bloquea): idéntico a es, con texto real.
  const untrans = keys.filter(
    (k) =>
      k in es &&
      String(flatLoc[k]) === String(es[k]) &&
      flatLoc[k] !== "" &&
      /[A-Za-záéíóúñÁÉÍÓÚÑ]{4,}/.test(String(flatLoc[k])) &&
      !es[k].includes("{{"),
  );
  if (untrans.length) {
    warn(`⚠️ ${untrans.length} cadenas idénticas a es (revisar si es un campo legítimo):`);
    warn(`   ${untrans.slice(0, 6).join(", ")}${untrans.length > 6 ? "…" : ""}`);
  }

  if (!missing.length && !extra.length && !phBroken) {
    log(`✅ ${lang}: ${keys.length}/${esKeys.size} claves · placeholders OK`);
  }
}

if (hadError) {
  console.error("\n🚨 Traducciones con errores estructurales. No debe commitearse.");
  process.exit(1);
}
console.log("\n✅ Validación de traducciones OK.");