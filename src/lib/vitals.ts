import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import { trackEvent } from "./analytics";

export function reportWebVitals() {
  if (!import.meta.env.PROD) return;

  const sendToAnalytics = (metric: { name: string; value: number; rating: string }) => {
    trackEvent("web_vital", {
      metric_name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
    });
  };

  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
