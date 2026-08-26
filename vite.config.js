/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

function buildTimestamp() {
  const ts = Date.now();
  return {
    name: "build-timestamp",
    transformIndexHtml(html) {
      return html.replace(
        "</head>",
        `<meta name="deploy-id" content="${ts}" />\n  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n  <meta http-equiv="Pragma" content="no-cache" />\n  <meta http-equiv="Expires" content="0" />\n  </head>`,
      );
    },
  };
}

const sentryPlugin = process.env.SENTRY_AUTH_TOKEN
  ? sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      telemetry: false,
    })
  : null;

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/**
 * Genera el service worker final en dist/sw.js:
 * inyecta la lista real de assets hasheados (precache) y una versión de
 * caché derivada de esa lista para invalidar caches antiguos. El copy de
 * public/ de Vite copia primero el sw.js original; este hook lo reescribe
 * al final del build con los datos reales de la compilación.
 */
function pwaPrecache() {
  return {
    name: "wedingo-pwa-precache",
    apply: "build",
    closeBundle() {
      const root = process.cwd();
      const assetsDir = join(root, "dist", "assets");
      // Códigos de idioma emitidos por i18n: sus chunks NO se precachean
      // (solo se descarga el idioma detectado bajo demanda).
      const langCodes = new Set(
        readdirSync(join(root, "src", "i18n", "locales"))
          .filter((file) => file.endsWith(".json"))
          .map((file) => file.replace(".json", "")),
      );
      let assets = [];
      try {
        assets = readdirSync(assetsDir)
          .filter((file) => /\.(js|css|woff2?)$/.test(file))
          .sort()
          .filter((file) => {
            const langMatch = file.match(/^([a-z]{2,4})-[A-Za-z0-9_-]{8,}\.js$/);
            // Excluye los 100 chunks de idioma del precache del service worker.
            if (langMatch && langCodes.has(langMatch[1])) return false;
            // Estos chunks son lazy por ruta/uso (superadmin/login/sentry/
            // analytics/qrcode): se cachean al primer uso, no al instalar,
            // para no pagar ~1.7MB en el primer hit.
            if (/^(vendor-sentry|lazy-auth|lazy-storage|lazy-analytics|vendor-qrcode)-/.test(file)) return false;
            return true;
          })
          .map((file) => `/assets/${file}`);
      } catch {
        // Sin directorio de assets el SW se deja con la lista vacía.
      }
      const version = createHash("sha1").update(assets.join("|")).digest("hex").slice(0, 8);
      const swSource = readFileSync(join(root, "public", "sw.js"), "utf8");
      const finalSw = swSource
        .split("__SW_VERSION__")
        .join(version)
        .split("__PRECACHE_ASSETS__")
        .join(JSON.stringify(assets));
      writeFileSync(join(root, "dist", "sw.js"), finalSw);
    },
  };
}

// Guarda de seguridad de build: si las credenciales web de Firebase no están
// presentes (p. ej. build desde un clon limpio sin .env), el bundle sale con
// projectId vacío y TODA la app pierde Firestore ("Invalid segment
// projects//databases/..."). Fallar aquí, en el build, es infinitamente mejor
// que descubrirlo en producción. Lección del incidente v2.133.0.
const REQUIRED_FIREBASE_ENV = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

/** Valida las credenciales web de Firebase ANTES de compilar: un bundle sin
 *  projectId produce rutas "projects//databases/..." y deja toda la app sin
 *  Firestore (incidente v2.133.0: build desde clon sin .env). Se usa loadEnv,
 *  la API oficial de vite, porque el config-loader moderno evalúa este
 *  fichero en un contexto donde leer .env a mano no es fiable. */
function assertFirebaseEnv(env) {
  const missing = REQUIRED_FIREBASE_ENV.filter((k) => !env[k] && !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[build] Faltan variables de entorno de Firebase en el entorno/.env: ${missing.join(", ")}. ` +
        "Sin ellas el bundle no puede hablar con Firestore. Genera el .env (firebase apps:sdkconfig) antes de compilar.",
    );
  }
}

export default defineConfig(({ mode }) => {
  assertFirebaseEnv(loadEnv(mode, process.cwd(), ""));

  return {
  plugins: [react(), tailwindcss(), buildTimestamp(), pwaPrecache(), sentryPlugin].filter(Boolean),
  base: "/",
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    // Target transpilado a ES2022 (alineado con BROWSER_COMPAT.md: Chrome/
    // Firefox/Safari/Edge 120+). Evita dejar sintaxis que motores antiguos
    // parseen lento, manteniendo módulos nativos y top-level await.
    target: "es2022",
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? "hidden" : false,
    chunkSizeWarningLimit: 650,
    // No modulepreloadar lazy-analytics en el primer hit: se arrastra por un
    // borde en vendor-firebase y solo se ejecuta tras el consentimiento.
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) => deps.filter((d) => !d.includes("lazy-analytics")),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // firebase/analytics, auth y storage se cargan bajo demanda (fuera
          // de la ruta crítica): analytics en el primer evento, auth/storage
          // solo en rutas de superadmin.
          if (id.includes("firebase/analytics")) return "lazy-analytics";
          if (id.includes("firebase/auth")) return "lazy-auth";
          if (id.includes("firebase/storage")) return "lazy-storage";
          // qrcode solo se importa dinámicamente (QR del panel): su propio
          // chunk evita que entre en la ruta inicial vía el agrupador genérico.
          if (id.includes("/qrcode/")) return "vendor-qrcode";
          if (id.includes("firebase")) return "vendor-firebase";
          // i18next/react-i18next ANTES de la regla de react: el subpath
          // "node_modules/react-i18next" contiene "node_modules/react" como
          // prefijo, así que sin reordenar, react-i18next acababa en vendor-react
          // y el chunk i18n quedaba incompleto (i18n core separado de react-i18next).
          if (id.includes("/node_modules/i18next/") || id.includes("/node_modules/react-i18next/")) return "i18n";
          if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/")) return "vendor-react";
          if (id.includes("/node_modules/react-router")) return "vendor-react";
          if (id.includes("/node_modules/@sentry/")) return "vendor-sentry";
          if (id.includes("node_modules")) return "vendor-other";
        },
      },
    },
  },
  test: {
    testTimeout: 30000,
    fileParallelism: true,
    maxConcurrency: 4,

    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://localhost",
      },
    },
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "functions/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"], // sin "html": es el reportero más caro y no aporta al gate
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}", "src/i18n/locales/**", "src/**/__tests__/**"],
      thresholds: {
        // Verificado en v2.98.5 (ronda de mejora): líneas 92.2% / statements
        // 90% / funcs 87% / branches 80.7%. Margen para variaciones de CI.
        statements: 89.5,
        branches: 80,
        functions: 86.5,
        lines: 91.8,
      },
    },
  },

};
});
