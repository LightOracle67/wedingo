/**
 * smoke-live.mjs — Comprobación rápida de producción tras el deploy.
 *
 * Uso: node scripts/smoke-live.mjs [url]
 *    (por defecto: https://wedingo-6c26a.web.app)
 *
 * Verifica:
 *   · HTTP 200 del índice y de rutas con ?lang= (rewrite SPA).
 *   · Cabeceras de seguridad presentes y CSP sin dominios retirados
 *     (translate.google.com — el widget se eliminó en v2.192.29).
 *   · Assets con cache inmutable.
 *
 * Exit 0 = OK · 1 = algo roto.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.argv[2] || "https://wedingo-6c26a.web.app";

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}
function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

// Índice + rutas ?lang (rewrite del hosting → app shell).
for (const path of ["/?lang=pt-BR", "/?lang=ar-SA"]) {
  try {
    const r = await fetch(`${BASE}${path}`, { redirect: "follow" });
    if (r.status === 200) ok(`GET ${path} → 200`);
    else fail(`GET ${path} → ${r.status}`);
  } catch (e) {
    fail(`GET ${path} → ${e.message}`);
  }
}

// Cabeceras de seguridad del índice.
try {
  const res = await fetch(`${BASE}/`);
  const csp = res.headers.get("content-security-policy") || "";
  const checks = [
    ["CSP presente", csp.includes("default-src")],
    ["CSP sin translate.google.com (widget eliminado)", !csp.includes("translate.google.com")],
    ["nosniff", res.headers.get("x-content-type-options") === "nosniff"],
    ["X-Frame-Options DENY", (res.headers.get("x-frame-options") || "").toUpperCase() === "DENY"],
  ];
  for (const [name, pass] of checks) (pass ? ok : fail)(name);
} catch (e) {
  fail(`cabeceras: ${e.message}`);
}

// Assets con cache inmutable (si hay dist local, se comprueba uno real).
try {
  const assetsDir = join(root, "dist", "assets");
  const js = existsSync(assetsDir) ? readdirSync(assetsDir).find((f) => f.endsWith(".js")) : null;
  if (js) {
    const r = await fetch(`${BASE}/assets/${js}`, { method: "GET" });
    const cc = r.headers.get("cache-control") || "";
    if (cc.includes("immutable")) ok(`asset ${js} → immutable OK`);
    else fail(`asset ${js} → cache-control: ${cc}`);
  } else {
    ok("dist ausente (no se valida cache de assets)");
  }
} catch (e) {
  fail(`asset: ${e.message}`);
}

if (process.exitCode) {
  console.error("\n🚨 SMOKE FALLÓ — revisa el deploy.");
  process.exit(1);
}
console.log("\n✅ Smoke OK — producción responde y con las cabeceras correctas.");