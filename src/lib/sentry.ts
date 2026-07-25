import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://dc9feab6e652cea6b31dc2b0c2c9dabe@o4511795631882240.ingest.de.sentry.io/4511795638304848",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
});
