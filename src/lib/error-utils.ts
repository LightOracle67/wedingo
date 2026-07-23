const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "";

export function logError(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : "";
  
  if (import.meta.env.DEV) {
    console.error(`[${context || "App"}]`, message, stack);
  }
  
  if (SENTRY_DSN) {
    try {
      fetch(SENTRY_DSN, {
        method: "POST",
        body: JSON.stringify({
          message,
          stack,
          context,
          url: location.href,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch {}
  }
}
