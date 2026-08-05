/**
 * sentry.ts
 * ─────────────────────────────────────────────────────────────
 * Inicialización de Sentry (errores + rendimiento) con carga diferida
 * y respeto del consentimiento de cookies (RGPD/LGPD/CCPA).
 *
 * El SDK de Sentry (~85 KB gzip) se descarga tras el primer idle del
 * navegador y SOLO si el visitante ha aceptado la estadística de visitas.
 * El session replay recoge la sesión del usuario, por lo que nunca se
 * activa sin consentimiento explícito.
 *
 * @module sentry
 */

import { hasAnalyticsConsent } from "./storage";

const isProd = import.meta.env.PROD;

/** DSN público de Sentry (por diseño no es un secreto). */
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "https://dc9feab6e652cea6b31dc2b0c2c9dabe@o4511795631882240.ingest.de.sentry.io/4511795638304848";

/** Evita inicializar Sentry más de una vez. */
let initialized = false;

/**
 * Ejecuta una función cuando el navegador está ocioso (o tras el load).
 *
 * @param fn - Función a diferir.
 */
function scheduleWhenIdle(fn: () => void) {
  const w = globalThis as unknown as { requestIdleCallback?: (cb: () => void, opts: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(fn, { timeout: 2000 });
    return;
  }
  if (document.readyState === "complete") {
    fn();
    return;
  }
  window.addEventListener("load", fn, { once: true });
}

/**
 * Inicializa Sentry si hay consentimiento de analítica.
 * También se invoca al conceder el consentimiento (CookieConsent) para
 * poder recoger errores de los visitantes que aceptaron tarde.
 */
export function enableSentryTracking() {
  if (initialized) return;
  // Sin consentimiento de analítica no se envía nada a Sentry (incluido el
  // session replay, que captura la sesión del usuario).
  if (!hasAnalyticsConsent()) return;
  initialized = true;
  import("@sentry/react").then((Sentry) => {
    const integrations = [Sentry.browserTracingIntegration()];
    if (isProd) integrations.push(Sentry.replayIntegration() as unknown as (typeof integrations)[number]);

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: isProd ? "production" : "development",
      release: `wedingo@${import.meta.env.VITE_APP_VERSION || "dev"}`,
      integrations,
      tracesSampleRate: isProd ? 0.1 : 0,
      tracePropagationTargets: ["localhost"],
      replaysSessionSampleRate: isProd ? 0.1 : 0,
      replaysOnErrorSampleRate: isProd ? 1.0 : 0,
    });
  });
}

if (isProd || import.meta.env.VITE_SENTRY_DSN) {
  scheduleWhenIdle(() => {
    enableSentryTracking();
  });
}
