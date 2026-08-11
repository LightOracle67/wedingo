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
 * Buffer en memoria de eventos anteriores al consentimiento (p. ej. los
 * Web Vitals del primer load). Solo se reenvía al aceptar; nunca se persiste
 * y se descarta si se rechaza. Límite para no crecer sin control.
 */
const PENDING_MAX = 20;
let pendingEvents: Array<{ name: string; params?: Record<string, unknown> }> = [];
let flushed = false;

/**
 * Indica si el visitante ha aceptado la estadística de visitas.
 * Se respeta el consentimiento de cookies (RGPD/LGPD/CCPA): sin el
 * consentimiento "accepted" con analytics activado no se recogen datos.
 */
function hasAnalyticsConsent(): boolean {
  return hasConsent();
}

/**
 * Notifica que se ha concedido consentimiento de analítica para que
 * Analytics pueda inicializarse en la siguiente llamada (la primera
 * carga se produce antes de que el usuario decida). Además reenvía los
 * eventos (Web Vitals) que se produjeron antes del consentimiento.
 */
export function grantAnalyticsConsent() {
  if (!hasAnalyticsConsent()) return;
  initStarted = false;
  analyticsPromise = null;
  if (flushed) return;
  flushed = true;
  const queued = pendingEvents;
  pendingEvents = [];
  queued.forEach(({ name, params }) => trackEvent(name, params));
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
  if (!hasAnalyticsConsent()) {
    // Antes del consentimiento solo se bufferizan los Web Vitals (primera
    // carga); los eventos interactivos ocurren tras aceptar.
    if (!flushed && eventName === "web_vital" && pendingEvents.length < PENDING_MAX) {
      pendingEvents.push(params ? { name: eventName, params } : { name: eventName });
    }
    return;
  }
  getAnalyticsInstance()
    .then(async (analytics) => {
      if (!analytics) return;
      const { logEvent } = await import("firebase/analytics");
      logEvent(analytics, eventName, params);
    })
    .catch(() => {});
}
