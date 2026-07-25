import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { app } from "./firebase";

let analytics: ReturnType<typeof getAnalytics> | null = null;

isSupported().then((supported) => {
  if (supported && import.meta.env.PROD) {
    analytics = getAnalytics(app);
  }
});

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
}
