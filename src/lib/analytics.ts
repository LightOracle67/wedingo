import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { app } from "./firebase";

let analytics: ReturnType<typeof getAnalytics> | null = null;

const MEASUREMENT_ID = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

isSupported().then((supported) => {
  if (supported && MEASUREMENT_ID && import.meta.env.PROD) {
    analytics = getAnalytics(app, { config: { measurementId: MEASUREMENT_ID } });
  }
});

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
}
