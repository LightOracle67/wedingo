/**
 * check-bundle-size.js
 * ─────────────────────────────────────────────────────────────
 * Comprueba el tamaño del bundle generado (gzip) contra umbrales.
 * - Límites por chunk conocido (firebase/react/sentry).
 * - Límite del chunk principal (index) y del total de JS inicial.
 *
 * Ejecutar tras `npm run build`: node scripts/check-bundle-size.js
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { gzipSync } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist", "assets");

if (!existsSync(distDir)) {
  console.error(`FAIL: no existe ${distDir}. Ejecuta primero 'npm run build'.`);
  process.exit(1);
}

const LIMITS = {
  // Límites ajustados tras la optimización de v2.96.8 (xlsx/qrcode a chunks
  // lazy): headroom ~1.5-2x sobre los tamaños actuales para que una regresión
  // real se detecte en CI sin falsos positivos por crecimiento natural.
  "vendor-firebase": 250,
  "vendor-react": 120,
  "vendor-sentry": 120,
  "vendor-other": 60,
  "i18n-": 120,
  "vendor-qrcode": 40,
  "index-": 80,
};

/** Límite total de JS inicial (gzip), calculado desde los <script> del HTML. */
const TOTAL_JS_LIMIT_KB = 400;

let failed = false;

const files = readdirSync(distDir).filter((file) => {
  const full = join(distDir, file);
  return statSync(full).isFile() && (file.endsWith(".js") || file.endsWith(".css"));
});

/** Devuelve el tamaño gzip en KB de un fichero del directorio de assets. */
function gzipKb(file) {
  return Math.round(gzipSync(readFileSync(join(distDir, file))).length / 1024);
}

// Total de JS inicial según los <script> y <link rel="modulepreload">
// referenciados en dist/index.html (chunks cargados al arrancar).
let totalJsKb = 0;
try {
  const html = readFileSync(join(rootDir, "dist", "index.html"), "utf8");
  const refs = html.match(/src="\/assets\/([^"]+\.js)"/g) || [];
  const preloads = html.match(/href="\/assets\/([^"]+\.js)"/g) || [];
  const seen = new Set();
  for (const ref of [...refs, ...preloads]) {
    const file = ref.replace(/.*\/assets\//, "").replace(/"$/, "");
    if (seen.has(file)) continue;
    seen.add(file);
    totalJsKb += gzipKb(file);
  }
} catch {
  console.error("FAIL: no se pudo leer dist/index.html.");
  failed = true;
}

for (const file of files) {
  const sizeKB = gzipKb(file);

  for (const [prefix, limit] of Object.entries(LIMITS)) {
    if (!file.startsWith(prefix)) continue;
    if (sizeKB > limit) {
      console.error(`FAIL: ${file} es ${sizeKB}KB gzip (límite ${limit}KB)`);
      failed = true;
    } else {
      console.log(`OK:   ${file} ${sizeKB}KB gzip (límite ${limit}KB)`);
    }
  }
}

if (totalJsKb > TOTAL_JS_LIMIT_KB) {
  console.error(`FAIL: JS inicial total ${totalJsKb}KB gzip (límite ${TOTAL_JS_LIMIT_KB}KB)`);
  failed = true;
} else {
  console.log(`OK:   JS inicial total ${totalJsKb}KB gzip (límite ${TOTAL_JS_LIMIT_KB}KB)`);
}

if (failed) {
  process.exit(1);
}
