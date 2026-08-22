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
import { redactSecretsFromUrl } from "./redact";

// Re-export para mantener la superficie pública: `redactSecretsFromUrl`
// vive en `./redact` (módulo sin dependencia de `storage`) para romper el
// ciclo de importes storage → safe-error → sentry → storage. Se re-exporta
// aquí para no romper los callers/tests existentes.
export { redactSecretsFromUrl };

const isProd = import.meta.env.PROD;

/** DSN público de Sentry (por diseño no es un secreto). */
const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  "https://dc9feab6e652cea6b31dc2b0c2c9dabe@o4511795631882240.ingest.de.sentry.io/4511795638304848";

/** Evita inicializar Sentry más de una vez. */
let initialized = false;

/**
 * Redacta un evento de Sentry (error o transacción) sustituyendo el token de
 * la URL por "[redacted]" en los campos sensibles. best-effort: si lanza, se
 * devuelve el evento sin tocar para no perder el reporte.
 *
 * @param event - Evento de Sentry antes de enviarse.
 */
function redactEvent(event: Record<string, unknown>): Record<string, unknown> {
  try {
    const request = (event.request ?? {}) as Record<string, unknown>;
    if (typeof request.url === "string") request.url = redactSecretsFromUrl(request.url);
    event.request = request;
    if (typeof event.transaction === "string") event.transaction = redactSecretsFromUrl(event.transaction);
    if (event.tags && typeof event.tags === "object") {
      const tags = event.tags as Record<string, string>;
      for (const k of Object.keys(tags)) {
        tags[k] = redactSecretsFromUrl(String(tags[k]));
      }
    }
    if (event.contexts && typeof event.contexts === "object") {
      for (const ctx of Object.values(event.contexts as Record<string, Record<string, unknown>>)) {
        if (ctx && typeof ctx === "object" && typeof (ctx as Record<string, unknown>).url === "string") {
          (ctx as Record<string, unknown>).url = redactSecretsFromUrl(String((ctx as Record<string, unknown>).url));
        }
      }
    }
    return event;
  } catch {
    return event;
  }
}

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
      // Redacta el token de invitación (credencial de acceso) de las URLs
      // antes de enviar errores/transacciones a Sentry (C1).
      beforeSend: (event) => redactEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
      beforeBreadcrumb: (breadcrumb) => {
        try {
          const data = (breadcrumb.data ?? {}) as Record<string, unknown>;
          if (typeof data.url === "string") data.url = redactSecretsFromUrl(data.url);
          if (typeof data.message === "string") data.message = redactSecretsFromUrl(data.message);
          if (typeof breadcrumb.message === "string") breadcrumb.message = redactSecretsFromUrl(breadcrumb.message);
          return breadcrumb;
        } catch {
          return null;
        }
      },
    });
  });
}

/**
 * Detiene Sentry al RETIRAR el consentimiento de analítica (GDPR art. 7.3):
 * frena el session replay y cierra el cliente para que no se recojan datos
 * de una sesión sin consentimiento. Permite reiniciar si se vuelve a aceptar.
 */
export function disableSentryTracking() {
  if (!initialized) return;
  initialized = false;
  import("@sentry/react")
    .then((Sentry) => {
      try {
        (Sentry.getReplay?.() as { stop?: () => void } | undefined)?.stop?.();
      } catch {
        /* integración de replay no disponible */
      }
      void Sentry.close();
    })
    .catch(() => {});
}

if (isProd || import.meta.env.VITE_SENTRY_DSN) {
  scheduleWhenIdle(() => {
    enableSentryTracking();
  });
}
