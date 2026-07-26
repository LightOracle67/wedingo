import * as Sentry from "@sentry/react";

const isProd = import.meta.env.PROD;

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://dc9feab6e652cea6b31dc2b0c2c9dabe@o4511795631882240.ingest.de.sentry.io/4511795638304848",
  environment: isProd ? "production" : "development",
  integrations: [
    Sentry.browserTracingIntegration(),
    ...(isProd ? [Sentry.replayIntegration()] : []),
  ],
  tracesSampleRate: isProd ? 0.1 : 0,
  tracePropagationTargets: ["localhost"],
  replaysSessionSampleRate: isProd ? 0.1 : 0,
  replaysOnErrorSampleRate: isProd ? 1.0 : 0,
  enabled: isProd || import.meta.env.VITE_SENTRY_DSN,
});
