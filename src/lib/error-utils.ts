const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "";

export function getFirestoreErrorMessage(error: unknown, t?: (key: string) => string): string {
  const code = (error as any)?.code || "";
  const messages: Record<string, string> = {
    "permission-denied": t ? t("errors.permissionDenied") : "Permission denied",
    "unavailable": t ? t("errors.serviceUnavailable") : "Service unavailable",
    "not-found": t ? t("errors.notFound") : "Not found",
    "deadline-exceeded": t ? t("errors.timeout") : "Request timed out",
    "resource-exhausted": t ? t("errors.quotaExceeded") : "Quota exceeded",
    "already-exists": t ? t("errors.alreadyExists") : "Already exists",
    "failed-precondition": t ? t("errors.failedPrecondition") : "Operation failed",
    "aborted": t ? t("errors.aborted") : "Operation aborted",
    "unauthenticated": t ? t("errors.unauthenticated") : "Authentication required",
  };
  return messages[code] || (error instanceof Error ? error.message : String(error));
}

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
