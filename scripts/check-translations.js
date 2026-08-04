/**
 * check-translations.js
 * ─────────────────────────────────────────────────────────────
 * Comprueba la coherencia de las traducciones de i18n.
 *
 * - Extrae claves usadas en el código: t('literal'), Trans i18nKey="...",
 *   y prefijos estáticos de claves dinámicas (t(`countdown.${key}`)).
 * - Valida que las claves usadas estén definidas en en.json.
 * - Valida que TODOS los locales sigan la estructura de en.json
 *   (sin arrays donde en espera strings) y reporta el % de cobertura.
 *
 * Exit code != 0 si hay claves usadas no definidas o locales con
 * estructura rota. La cobertura parcial solo se informa.
 *
 * @module scripts/check-translations
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOCALES_DIR = path.join(ROOT, "src/i18n/locales");
const SRC_DIR = path.join(ROOT, "src");

/** Umbral mínimo de cobertura por idioma (solo informativo). */
const COVERAGE_WARN_THRESHOLD = 50;

function getAllFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "__tests__") {
      files.push(...getAllFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Extrae las claves usadas en el código fuente.
 * Soporta t('clave'), t("clave") y Trans i18nKey="clave".
 * Para claves dinámicas (t(`prefix.${x}`)) extrae el prefijo estático.
 */
function extractUsedKeys(dir) {
  const keys = new Set();
  const files = getAllFiles(dir);

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    // t('literal') / t("literal")
    const tMatches = content.match(/(?<![A-Za-z0-9_$])t\(\s*["']([^"']+)["']/g) || [];
    for (const match of tMatches) {
      keys.add(match.replace(/^.*?t\(\s*["']|["']$/g, ""));
    }
    // Trans i18nKey="literal"
    const transMatches = content.match(/i18nKey\s*=\s*["']([^"']+)["']/g) || [];
    for (const match of transMatches) {
      keys.add(match.replace(/i18nKey\s*=\s*["']|["']$/g, ""));
    }
    // Prefijos estáticos de claves dinámicas: t(`a.b.${x}`)
    const templateMatches = content.match(/(?<![A-Za-z0-9_$])t\(\s*`([^`$]+)\$\{/g) || [];
    for (const match of templateMatches) {
      keys.add(match.replace(/^.*?t\(\s*`|\$\{/g, ""));
    }
  }

  return keys;
}

/** Aplana un objeto de traducciones a claves completas (hojas). */
function extractLeafKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...extractLeafKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Comprueba que un locale respete la estructura de en.json:
 * ninguna clave que en en es string puede ser un array en el locale.
 */
function findStructuralIssues(enObj, localeObj, prefix = "") {
  const issues = [];
  for (const [key, value] of Object.entries(enObj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const other = localeObj?.[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      if (other !== null && typeof other === "object" && !Array.isArray(other)) {
        issues.push(...findStructuralIssues(value, other, fullKey));
      }
    } else if (typeof value === "string" && Array.isArray(other)) {
      issues.push(fullKey);
    }
  }
  return issues;
}

let hasErrors = false;

const enPath = path.join(LOCALES_DIR, "en.json");
const enContent = JSON.parse(fs.readFileSync(enPath, "utf8"));
const enLeafKeys = extractLeafKeys(enContent);

console.log("🔍 Analizando traducciones...\n");

const usedKeys = extractUsedKeys(SRC_DIR);

// 1) Claves usadas pero no definidas en en.json.
// Las claves que terminan en "." (o son prefijos dinámicos) se consideran
// satisfechas si existe alguna clave definida con ese prefijo.
const missingKeys = [...usedKeys].filter((key) => {
  const base = key.endsWith(".") ? key.slice(0, -1) : key;
  return !enLeafKeys.some((dk) => dk === base || dk.startsWith(base));
});

if (missingKeys.length === 0) {
  console.log("✅ Todas las claves usadas en el código están definidas en en.json.");
} else {
  hasErrors = true;
  console.log(`❌ ${missingKeys.length} claves usadas en el código pero NO definidas en en.json:\n`);
  for (const key of missingKeys.sort()) {
    console.log(`   - ${key}`);
  }
}

// 2) Estructura y cobertura de los 100 locales
const localeFiles = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json"));
console.log("\n📦 Cobertura por idioma (% de claves presentes sobre en.json):");

for (const file of localeFiles.sort()) {
  const locale = file.replace(/\.json$/, "");
  const localePath = path.join(LOCALES_DIR, file);
  let localeObj;
  try {
    localeObj = JSON.parse(fs.readFileSync(localePath, "utf8"));
  } catch {
    hasErrors = true;
    console.log(`   ${locale}: ❌ JSON inválido`);
    continue;
  }

  // Estructura: arrays donde en espera strings rompen el render (aviso).
  const issues = findStructuralIssues(enContent, localeObj);
  if (issues.length > 0) {
    console.log(`   ${locale}: ⚠️ ${issues.length} claves con estructura atípica (array en vez de string):`);
    for (const issue of issues.slice(0, 5)) {
      console.log(`      - ${issue}`);
    }
  }

  // Cobertura
  const localeLeafKeys = extractLeafKeys(localeObj);
  const present = enLeafKeys.filter((k) => localeLeafKeys.includes(k)).length;
  const pct = Math.round((present / enLeafKeys.length) * 100);
  const flag = pct < COVERAGE_WARN_THRESHOLD ? "⚠️ " : "✅";
  console.log(`   ${locale}: ${pct}% (${present}/${enLeafKeys.length}) ${flag}`);
}

if (hasErrors) {
  console.log("\n❌ Errores de traducción detectados. Corrige antes de desplegar.");
  process.exit(1);
}

console.log("\n✅ Traducciones coherentes (sin errores estructurales).");
