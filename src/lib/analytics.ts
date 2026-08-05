/**
 * analytics.ts
 * ─────────────────────────────────────────────────────────────
 * Analytics de Firebase (Google Analytics) con carga diferida.
 *
 * `firebase/analytics` se importa dinámicamente la primera vez que se
 * registra un evento, de modo que el SDK de Analytics (varios KB gzip)
 * NO viaja en la ruta crítica del bundle inicial.
 *
 * @module analytics
 */

import type { FirebaseApp } from "firebase/app";
import type { Analytics } from "firebase/analytics";
import { app } from "./firebase";
import { hasAnalyticsConsent as hasConsent } from "./storage";

/** ID de medición de Google Analytics. */
const MEASUREMENT_ID = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

/** Instancia de Analytics ya inicializada (o null si no soportada). */
let analyticsPromise: Promise<Analytics | null> | null = null;
/** Evita inicializar Analytics más de una vez. */
let initStarted = false;

/**
 * Indica si el visitante ha aceptado la estadística de visitas.
 * Se respeta el consentimiento de cookies (RGPD/LGPD/CCPA): sin el
 * consentimiento "accepted" con analytics activado no se recogen datos.
 */
export function hasAnalyticsConsent(): boolean {
  return hasConsent();
}

/**
 * Notifica que se ha concedido consentimiento de analítica para que
 * Analytics pueda inicializarse en la siguiente llamada (la primera
 * carga se produce antes de que el usuario decida).
 */
export function grantAnalyticsConsent() {
  if (!hasAnalyticsConsent()) return;
  initStarted = false;
  analyticsPromise = null;
}

/**
 * Inicializa Analytics de forma diferida y memoizada.
 * Devuelve la instancia o null si no es soportado/no está en producción.
 */
function getAnalyticsInstance(): Promise<Analytics | null> {
  // Sin consentimiento explícito de analítica nunca se inicializa el SDK.
  if (!hasAnalyticsConsent()) return Promise.resolve(null);
  if (!initStarted) {
    initStarted = true;
    analyticsPromise = (async () => {
      try {
        const mod = await import("firebase/analytics");
        if (!import.meta.env.PROD || !MEASUREMENT_ID) return null;
        const supported = await mod.isSupported();
        if (!supported) return null;
        return (mod.getAnalytics as (a: FirebaseApp, o: { config: { measurementId: string } }) => Analytics)(
          app as FirebaseApp,
          { config: { measurementId: MEASUREMENT_ID } },
        );
      } catch {
        return null;
      }
    })();
  }
  return analyticsPromise as Promise<Analytics | null>;
}

/**
 * Registra un evento de analytics de forma best-effort.
 * Sin consentimiento previo el evento se descarta silenciosamente.
 *
 * @param eventName - Nombre del evento.
 * @param params - Parámetros adicionales del evento.
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (!hasAnalyticsConsent()) return;
  getAnalyticsInstance()
    .then(async (analytics) => {
      if (!analytics) return;
      const { logEvent } = await import("firebase/analytics");
      logEvent(analytics, eventName, params);
    })
    .catch(() => { });
}

