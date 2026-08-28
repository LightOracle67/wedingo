/**
 * Recuperación de chunks obsoletos tras un despliegue.
 *
 * Cuando se publica una versión nueva, los nombres de los ficheros con hash
 * cambian (p. ej. index-Z1-llPNs.js → index-B3W5QBGB.js). Un navegador que
 * todavía mantiene el service worker y la caché de la versión anterior puede
 * intentar importar un módulo que ya no existe en el hosting y fallar con
 * «TypeError: Importing a module script failed.» (o el equivalente de
 * «Failed to fetch dynamically imported module»).
 *
 * Este módulo detecta esa clase de error y fuerza una recarga limpia del
 * documento: desregistra el service worker, elimina todas las cachés y
 * recarga. La detección se limita a N intentos por sesión para evitar bucles
 * infinitos si el problema persiste.
 */

/** Máximo de recargas automáticas de recuperación por sesión de navegador. */
export const MAX_AUTO_RELOAD_ATTEMPTS = 2;

/** Clave usada para contar los intentos de recuperación en sessionStorage. */
const RELOAD_ATTEMPT_KEY = "wedin_stale_reload_attempts";

/** Mensajes de error que indican un chunk obsoleto tras el despliegue. */
const STALE_CHUNK_MESSAGES = [
  "Importing a module script failed",
  "Failed to fetch dynamically imported module",
  "dynamically imported module",
  // Chrome moderno: «TypeError: Failed to fetch dynamically imported module»
  "Failed to fetch module",
];

/**
 * Determina si un error proviene de un módulo estático o dinámico que ya no
 * existe en el hosting (chunk obsoleto por un despliegue reciente).
 *
 * @param error Error capturado (normalmente desde un catch).
 * @returns true si el error es de carga de módulo obsoleto.
 */
export function isStaleChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message || "";
  return STALE_CHUNK_MESSAGES.some((chunkMsg) => message.includes(chunkMsg));
}

/**
 * Cuenta y lee el número de intentos de recuperación realizados en la sesión.
 * Devuelve false cuando se ha alcanzado el máximo para no recargar en bucle.
 *
 * @returns true si todavía se puede intentar una recarga automática.
 */
function canAttemptRecovery(): boolean {
  try {
    const raw = globalThis.sessionStorage?.getItem(RELOAD_ATTEMPT_KEY);
    const attempts = raw ? Number.parseInt(raw, 10) || 0 : 0;
    return attempts < MAX_AUTO_RELOAD_ATTEMPTS;
  } catch {
    // Si sessionStorage no está disponible, se permite un único intento.
    return true;
  }
}

/**
 * Registra un intento de recuperación en sessionStorage. Devuelve false si
 * después de registrar ya se superó el máximo (el llamador no debe recargar).
 *
 * @returns true si se puede continuar con la recarga.
 */
function markRecoveryAttempt(): boolean {
  try {
    const raw = globalThis.sessionStorage?.getItem(RELOAD_ATTEMPT_KEY);
    const attempts = raw ? Number.parseInt(raw, 10) || 0 : 0;
    const next = attempts + 1;
    globalThis.sessionStorage?.setItem(RELOAD_ATTEMPT_KEY, String(next));
    return next <= MAX_AUTO_RELOAD_ATTEMPTS;
  } catch {
    return true;
  }
}

/**
 * Ejecuta la recuperación: desregistra el service worker, elimina todas las
 * cachés de la aplicación y recarga la página. Todo en try/catch para no
 * bloquear la recarga si algún paso falla.
 */
function performStaleChunkReload(): void {
  try {
    void (async () => {
      if (globalThis.navigator?.serviceWorker?.getRegistrations) {
        const registrations = await globalThis.navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }
      if (globalThis.caches?.keys) {
        const keys = await globalThis.caches.keys();
        await Promise.all(keys.map((key) => globalThis.caches.delete(key)));
      }
    })().finally(() => {
      globalThis.location?.reload();
    });
  } catch {
    globalThis.location?.reload();
  }
}

/**
 * Comprueba si el error es de chunk obsoleto y, en tal caso, lanza la
 * recuperación con recarga (con el tope de intentos por sesión).
 *
 * @param error Error capturado.
 * @returns true si se está recuperando (la recarga está en camino).
 */
export function recoverFromStaleChunk(error: unknown): boolean {
  if (!isStaleChunkError(error)) {
    return false;
  }
  if (!canAttemptRecovery()) {
    return false;
  }
  if (!markRecoveryAttempt()) {
    return false;
  }
  performStaleChunkReload();
  return true;
}
