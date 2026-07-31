const isProd = import.meta.env.PROD;

if (isProd || import.meta.env.VITE_SENTRY_DSN) {
  import("@sentry/react").then((Sentry) => {
    const integrations = [Sentry.browserTracingIntegration()];
    if (isProd) integrations.push(Sentry.replayIntegration() as unknown as (typeof integrations)[number]);

    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN || "https://dc9feab6e652cea6b31dc2b0c2c9dabe@o4511795631882240.ingest.de.sentry.io/4511795638304848",
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
