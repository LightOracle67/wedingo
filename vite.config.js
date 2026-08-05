/// <reference types="vitest" />
import { defineConfig } from "vite";
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
        `<meta name="deploy-id" content="${ts}" />\n  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n  <meta http-equiv="Pragma" content="no-cache" />\n  <meta http-equiv="Expires" content="0" />\n  </head>`
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
      let assets = [];
      try {
        assets = readdirSync(assetsDir)
          .filter((file) => /\.(js|css|woff2?)$/.test(file))
          .sort()
          .map((file) => `/assets/${file}`);
      } catch {
        // Sin directorio de assets el SW se deja con la lista vacía.
      }
      const version = createHash("sha1").update(assets.join("|")).digest("hex").slice(0, 8);
      const swSource = readFileSync(join(root, "public", "sw.js"), "utf8");
      const finalSw = swSource
        .split("__SW_VERSION__").join(version)
        .split("__PRECACHE_ASSETS__").join(JSON.stringify(assets));
      writeFileSync(join(root, "dist", "sw.js"), finalSw);
    },
  };
}

export default defineConfig({
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
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? "hidden" : false,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // firebase/analytics se carga de forma diferida (fuera de la ruta crítica).
          if (id.includes("firebase/analytics")) return "lazy-analytics";
          if (id.includes("firebase")) return "vendor-firebase";
          if (id.includes("node_modules/.pnpm/react") || id.includes("node_modules/react")) return "vendor-react";
          if (id.includes("/node_modules/i18next/") || id.includes("/node_modules/react-i18next/")) return "i18n";
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
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/i18n/locales/**",
        "src/**/__tests__/**",
      ],
      thresholds: {
        statements: 94,
        branches: 91,
        functions: 93,
        lines: 96,
      },
    },
  },
});
