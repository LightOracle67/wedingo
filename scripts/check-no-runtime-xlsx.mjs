/**
 * check-no-runtime-xlsx.mjs
 * ------------------------------------------------------------------
 * Guard de supply-chain: garantiza que la dependencia `xlsx` (SheetJS,
 * GHSA-4r6h-8v6p-xvw6 / GHSA-5pgg-2g8v-p4x9, sin fix, high) NO vuelva a
 * entrar al bundle de producción.
 *
 * La app genera los .xlsx a mano con su propio escritor OOXML
 * (src/lib/excel-utils.ts, ~2 KB gz); `xlsx` es solo devDependency y se usa
 * únicamente en tests para REABRIR los ficheros generados y validarlos.
 *
 * Este check falla si:
 *   1. Algún fichero de `src/` importa `xlsx`/`sheetjs`/`xlsx-...` (runtime).
 *   2. El build (dist/assets) contiene el runtime de la librería (marca "SheetJS").
 *
 * Se ejecuta dentro de `preready` (npm run preready) para bloquear el deploy.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const distAssets = join(root, "dist", "assets");

const RUNTIME_JS_RE = /^\s*(?:import|export)[^'"]*from\s*['"](xlsx|sheetjs|@!\/?xlsx)['"]/;
const RUNTIME_REQ_RE = /require\(['"]xlsx['"]\)/;
const LIB_FINGERPRINTS = ["SheetJS", "XLSX.utils", "xlsx/core/"];

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__" || e.name === "node_modules") continue;
      out.push(...walk(p));
    } else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx") || e.name.endsWith(".js") || e.name.endsWith(".cjs")) {
      out.push(p);
    }
  }
  return out;
}

let fail = false;

// 1) Fuente: ningún import de xlsx en src/{ts,tsx,js}.
for (const file of walk(srcDir)) {
  const text = readFileSync(file, "utf8");
  if (RUNTIME_JS_RE.test(text) || RUNTIME_REQ_RE.test(text)) {
    console.error(`❌ [no-runtime-xlsx] import de xlsx en ${file}`);
    fail = true;
  }
}

// 2) Build: si existe dist/assets, el runtime de la librería no debe aparecer.
if (existsSync(distAssets)) {
  for (const file of readdirSync(distAssets).filter((f) => f.endsWith(".js"))) {
    const text = readFileSync(join(distAssets, file), "utf8");
    if (LIB_FINGERPRINTS.some((fp) => text.includes(fp))) {
      console.error(`❌ [no-runtime-xlsx] fingerprint SheetJS presente en dist/assets/${file}`);
      fail = true;
    }
  }
}

if (fail) {
  console.error("\n🚨 GUARD ROTO: xlsx/SheetJS (high, sin fix) no debe estar en runtime.");
  console.error("    Si es un falso positivo de source, revisa el import; nunca uses 'xlsx' en src/.");
  console.error("    El escritor OOXML propio es src/lib/excel-utils.ts.");
  process.exit(1);
}

console.log("✅ [no-runtime-xlsx] OK: sin import de xlsx en src/ y sin runtime SheetJS en dist.");