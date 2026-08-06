import { hasAnalyticsConsent } from "./storage";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "";

export function getFirestoreErrorMessage(error: unknown, t?: (key: string) => string): string {
  const code = error && typeof error === "object" && "code" in error ? String((error as Record<string, unknown>).code) : "";
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
    // Códigos adicionales que antes caían en el fallback en inglés.
    "cancelled": t ? t("errors.cancelled") : "Operation cancelled",
    "invalid-argument": t ? t("errors.generic") : "Invalid request",
    "internal": t ? t("errors.generic") : "Internal error",
    "data-loss": t ? t("errors.generic") : "Data loss",
    "out-of-range": t ? t("errors.generic") : "Out of range",
    "unimplemented": t ? t("errors.generic") : "Not implemented",
    "unknown": t ? t("errors.generic") : "Unknown error",
  };
  return messages[code] || (error instanceof Error ? error.message : String(error));
}

export function logError(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : "";
  
  if (import.meta.env.DEV) {
    console.error(`[${context || "App"}]`, message, stack);
  }
  
  if (SENTRY_DSN && hasAnalyticsConsent()) {
    try {
      // El SDK de Sentry se envía con el formato envelope correcto (el fetch
      // a un DSN con JSON crudo era inválido y Sentry lo rechazaba siempre).
      void import("@sentry/react").then((Sentry) => {
        Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
          tags: { context: context || "app" },
          extra: { url: typeof location !== "undefined" ? location.href : "" },
        });
      });
    } catch {}
  }
}
