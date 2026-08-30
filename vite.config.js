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
      // v2.185: el precache ya NO mete TODA la SPA (~81 chunks, 1,3-1,7 MB que
      // un invitado jamás usará: paneles admin, superadmin, print…). Se
      // precachean:
      //  1. El entry + sus modulepreloads (leídos de dist/index.html).
      //  2. La ruta del INVITADO: PublicInvitation y sus secciones lazy.
      // El resto (admin, superadmin, modales, sentry…) se cachea bajo demanda
      // con el fetch handler cache-first del SW (funciona igual en offline
      // tras la primera visita).
      const guestSectionPrefixes = [
        "PublicInvitation-",
        "HeroSection-",
        "DetailsSection-",
        "InfoSection-",
        "StorySection-",
        "GiftsSection-",
        "AccommodationSection-",
        "GallerySection-",
        "TransportSection-",
        "RsvpSection-",
        "VenueMapSection-",
        "TableSeatingSection-",
        "WelcomeVideoModal-",
      ];
      let assets = [];
      try {
        // 1) Entry + modulepreloads reales de dist/index.html (lo que el
        //    navegador descarga al cargar la app, sin adivinanzas).
        const html = readFileSync(join(root, "dist", "index.html"), "utf8");
        const referenced = new Set();
        for (const m of html.matchAll(/(?:src|href)="\/assets\/([^"]+\.(?:js|css))"/g)) {
          referenced.add(m[1]);
        }
        // 2) Chunks de la invitación pública (lazy por ruta).
        for (const file of readdirSync(assetsDir)) {
          if (guestSectionPrefixes.some((p) => file.startsWith(p))) referenced.add(file);
        }
        assets = [...referenced]
          .filter((file) => {
            const langMatch = file.match(/^([a-z]{2,4})-[A-Za-z0-9_-]{8,}\.js$/);
            // Excluye los chunks de idioma del precache del service worker.
            if (langMatch && langCodes.has(langMatch[1])) return false;
            // Sentry/qrcode/superadmin login: bajo demanda tras consentimiento.
            const lazyOnlyPrefixes =
              /^(vendor-sentry|lazy-auth|lazy-storage|lazy-analytics|vendor-qrcode|SuperAdminLogin|SuperAdminPanel|PrintPage|AdminPage|SetupPage|SetupForm|DashboardTab|DataTab|ManageTab|MetricsTab|ComplianceTab|PlatformTab|SettingsTab|SupportTab|TokensTab|InvitationsTab|InvitationDetailModal|AccessibilityPanel|LegalModal|ChangelogModal|CookieConsent|DataRequestModal|AttendanceTab|DistribucionTab|PanelTab|InvitationTab|ShareTab|AccessTab|ToolsTab|StatsCard|TableActionsBar|SortableTh|Pagination)-/;
            if (lazyOnlyPrefixes.test(file)) return false;
            return true;
          })
          .sort()
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
      // Vite 8 usa rolldown: la API moderna de code-splitting manual es
      // output.codeSplitting.groups (manualChunks quedó deprecado y, con
      // módulos compartidos, producía el bug de v2.185: rolldown fusionaba el
      // core compartido de Firebase —@firebase/util, /component, /logger,
      // /webchannel-wrapper, importados por firestore en la ruta crítica—
      // DENTRO del chunk lazy-analytics, de modo que vendor-firebase lo
      // importaba estáticamente y el SDK de GA (~15 KB gzip) se descargaba en
      // el primer hit aunque el visitante rechazara las cookies).
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              // Los SDKs lazy se priorizan sobre el grupo genérico de
              // firebase: analytics+installations, auth y storage SOLO se
              // descargan bajo demanda (consentimiento / ruta superadmin).
              // `includeDependenciesRecursively: false` es CLAVE: por defecto
              // un grupo captura también sus dependencias (util, component,
              // logger…) aunque otro grupo las capture, y eso hacía que el
              // core compartido acabara en lazy-analytics y vendor-firebase
              // lo importara estáticamente (bug de bundle v2.185).
              { name: "lazy-analytics", test: /@firebase\/(analytics|installations)/, priority: 60, includeDependenciesRecursively: false },
              { name: "lazy-auth", test: /@firebase\/auth/, priority: 60, includeDependenciesRecursively: false },
              { name: "lazy-storage", test: /@firebase\/storage/, priority: 60, includeDependenciesRecursively: false },
              // Core de Firebase (app, firestore, util, component, logger,
              // webchannel-wrapper…): ruta crítica. Los chunks lazy dependen
              // DE él, nunca al revés (verificación post-build: ningún
              // vendor-* debe importar un chunk "lazy-*").
              { name: "vendor-firebase", test: /@firebase\/|firebase\//, priority: 40 },
              // qrcode solo se importa dinámicamente (QR del panel): su
              // propio chunk lo mantiene fuera de la ruta inicial.
              { name: "vendor-qrcode", test: /qrcode/, priority: 30 },
              // Sentry: includeDependenciesRecursively: false es OBLIGATORIO —
              // @sentry/react tiene `react` como dependencia (peer) y con el
              // modo recursivo capturaba react (+react-dom) dentro del chunk
              // lazy de Sentry; como el entry usa react en el primer render,
              // el chunk vendor-sentry acababa importado ESTÁTICAMENTE por
              // index (vendía el "lazy" de Sentry: +103 KB gzip en ruta
              // crítica). Sus dependencias internas @sentry/* siguen
              // coincidiendo con el test y se capturan igual.
              { name: "vendor-sentry", test: /@sentry/, priority: 30, includeDependenciesRecursively: false },
              // i18next/react-i18next ANTES de la regla de react: el subpath
              // "node_modules/react-i18next" contiene "node_modules/react"
              // como prefijo, así que sin separar, react-i18next acabaría en
              // vendor-react y el chunk i18n quedaría incompleto.
              { name: "i18n", test: /node_modules\/(i18next|react-i18next|i18next-browser-languagedetector|i18next-resources-to-backend)/, priority: 30 },
              // React con prioridad 40: debe ganar a vendor-sentry en los
              // conflictos de captura (react es peer dep de @sentry/react).
              { name: "vendor-react", test: /node_modules\/(react|react-dom|react-router)/, priority: 40 },
              { name: "vendor-other", test: /node_modules/, priority: 10 },
            ],
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
