/**
 * vitals.ts
 * ─────────────────────────────────────────────────────────────
 * Registro de Web Vitals (Core Web Vitals) hacia Google Analytics.
 *
 * CLS se conserva con 4 decimales (suele ser 0.00–0.30); el resto de
 * métricas se redondean a milisegundos enteros.
 *
 * @module vitals
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

interface VitalMetric {
  name: string;
  value: number;
  rating: string;
}

/**
 * Normaliza el valor de una métrica: CLS con 4 decimales, resto en ms.
 *
 * @param metric - Métrica de web-vitals.
 * @returns Valor normalizado para Analytics.
 */
function normalizeMetricValue(metric: VitalMetric): number {
  if (metric.name === "CLS") {
    return Math.round(metric.value * 1000) / 1000;
  }
  return Math.round(metric.value);
}

/**
 * Activa el reporte de Web Vitals en producción.
 * Las métricas se envían como eventos `web_vital` a Google Analytics.
 */
export function reportWebVitals() {
  if (!import.meta.env.PROD) return;

  const sendToAnalytics = (metric: VitalMetric) => {
    // Import dinámico: analytics.ts (y su import de firebase/analytics) no
    // debe estar en el grafo estático inicial para que el chunk lazy-analytics
    // no se modulepreload en el primer hit.
    import("./analytics").then(({ trackEvent }) => {
      trackEvent("web_vital", {
        metric_name: metric.name,
        value: normalizeMetricValue(metric),
        rating: metric.rating,
      });
    });
  };

  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
