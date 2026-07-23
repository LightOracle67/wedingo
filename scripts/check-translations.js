/**
 * Script para detectar claves de traducción no usadas.
 * Ejecutar: node scripts/check-translations.js
 */
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = "src/i18n/locales";
const SRC_DIR = "src";

// Carga el archivo de referencia (inglés)
const enPath = path.join(LOCALES_DIR, "en.json");
const enContent = JSON.parse(fs.readFileSync(enPath, "utf8"));

// Extrae todas las claves de traducción del código fuente
function extractUsedKeys(dir) {
  const keys = new Set();
  const files = getAllFiles(dir);
  
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(/t\(["']([^"']+)["']\)/g);
    if (matches) {
      for (const match of matches) {
        const key = match.replace(/t\(["']|["']\)/g, "");
        keys.add(key);
      }
    }
  }
  
  return keys;
}

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

// Extrae todas las claves definidas en las traducciones
function extractDefinedKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...extractDefinedKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

console.log("🔍 Buscando claves de traducción no usadas...\n");

const usedKeys = extractUsedKeys(SRC_DIR);
const definedKeys = extractDefinedKeys(enContent);

const unusedKeys = definedKeys.filter((key) => !usedKeys.has(key));

if (unusedKeys.length === 0) {
  console.log("✅ Todas las claves definidas están siendo usadas en el código.");
} else {
  console.log(`⚠️  ${unusedKeys.length} claves definidas pero NO usadas:\n`);
  for (const key of unusedKeys) {
    console.log(`   - ${key}`);
  }
}

// Verifica claves usadas pero no definidas
const missingKeys = [...usedKeys].filter((key) => !definedKeys.includes(key));

if (missingKeys.length === 0) {
  console.log("\n✅ Todas las claves usadas en el código están definidas.");
} else {
  console.log(`\n⚠️  ${missingKeys.length} claves usadas en el código pero NO definidas:\n`);
  for (const key of missingKeys) {
    console.log(`   - ${key}`);
  }
}
