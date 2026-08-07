export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message || `Operation timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function retry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  throw new Error("Max retries reached");
}

/** Retrasos de reintento ante fallos transitorios de red de Firestore. */
const WRITE_RETRY_DELAYS_MS = [400, 900];

/** Los errores permanentes (invalid-argument, permission-denied, etc.) no se
 *  reintentan: solo los transitorios de red. */
export function isRetryableFirestoreError(err: unknown): boolean {
  const code = (err as { code?: string })?.code || "";
  return ["unavailable", "deadline-exceeded", "aborted", "resource-exhausted"].includes(code);
}

/** Reintenta una escritura ante fallos transitorios de Firestore. */
export async function withWriteRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= WRITE_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < WRITE_RETRY_DELAYS_MS.length && isRetryableFirestoreError(err)) {
        await new Promise((r) => setTimeout(r, WRITE_RETRY_DELAYS_MS[attempt]));
      } else {
        break;
      }
    }
  }
  throw lastErr;
}
