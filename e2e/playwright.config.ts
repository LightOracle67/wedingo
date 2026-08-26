import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Carga el archivo .env raíz en process.env para que los e2e funcionen sin
 * exportar las variables de Firebase manualmente (el build de Vite ya las
 * inyecta; aquí se necesitan también en el proceso de Playwright).
 */
function loadDotEnv() {
  try {
    // Se resuelve relativo al propio config (e2e/), no al CWD: si el config
    // se carga desde la raíz, "../.env" apuntaba a un directorio inexistente.
    const here = fileURLToPath(new URL(".", import.meta.url));
    const content = readFileSync(new URL("../.env", `file://${here}`), "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* sin .env: se usan los defaults */ }
}
loadDotEnv();

export default defineConfig({
  testDir: ".",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:4173",
    headless: true,
    // Acepta las cookies en todas las pruebas: el banner de consentimiento es
    // modal y en CI interceptaba los clics de forma intermitente (carrera con
    // su render). El valor replica el formato que guarda CookieConsent
    // (status/ts/version + preferencias) para que parseConsent lo valide.
    addInitScript: () => {
      window.localStorage.setItem(
        "wedin_cookie_consent",
        JSON.stringify({ status: "accepted", ts: Date.now(), version: "test" }),
      );
      window.localStorage.setItem(
        "wedin_cookie_prefs",
        JSON.stringify({ necessary: true, analytics: false }),
      );
    },
  },
  webServer: {
    cwd: "..",
    command: "npm run build && npx vite preview --port 4173",
    port: 4173,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || "",
      VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || "",
      VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || "",
      VITE_ADMIN_EMAILS: process.env.VITE_ADMIN_EMAILS || "",
      VITE_SUPERADMIN_ROUTE: process.env.VITE_SUPERADMIN_ROUTE || "",
    },
  },
});
