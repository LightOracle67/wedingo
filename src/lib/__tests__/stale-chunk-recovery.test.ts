import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isStaleChunkError,
  MAX_AUTO_RELOAD_ATTEMPTS,
  recoverFromStaleChunk,
} from "../stale-chunk-recovery";

/**
 * jsdom no expone del todo sessionStorage/caches/navigator.serviceWorker:
 * se define una sesión respaldada por Map para simular el comportamiento del
 * navegador y poder inspeccionar los contadores de intentos.
 */
function installSessionStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  });
  return store;
}

describe("stale-chunk-recovery", () => {
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    installSessionStorage();
    // reload se simula con un mock que no navega de verdad.
    reloadMock = vi.fn();
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      writable: true,
      value: { reload: reloadMock } as unknown as Location,
    });
    // serviceWorker/caches ausentes: la recarga se dispara igualmente.
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detecta los mensajes de chunk obsoleto", () => {
    expect(isStaleChunkError(new Error("TypeError: Importing a module script failed."))).toBe(true);
    expect(isStaleChunkError(new Error("Failed to fetch dynamically imported module: xyz"))).toBe(true);
    expect(isStaleChunkError(new Error("TypeError: Failed to fetch module: /assets/x.js"))).toBe(true);
  });

  it("ignora errores normales, no-Error y null", () => {
    expect(isStaleChunkError(new Error("permission-denied"))).toBe(false);
    expect(isStaleChunkError("string error")).toBe(false);
    expect(isStaleChunkError(null)).toBe(false);
    expect(isStaleChunkError(undefined)).toBe(false);
  });

  it("recarga automáticamente al detectar chunk obsoleto", () => {
    const recovered = recoverFromStaleChunk(new Error("Importing a module script failed."));
    expect(recovered).toBe(true);
    // La recarga es asíncrona (SW/caches), pero finalmente llama a reload.
    vi.waitFor(() => expect(reloadMock).toHaveBeenCalled());
  });

  it("no recarga si el error no es de chunk obsoleto", () => {
    const recovered = recoverFromStaleChunk(new Error("permission-denied"));
    expect(recovered).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("evita el bucle de recargas: máximo de intentos por sesión", async () => {
    for (let i = 0; i < MAX_AUTO_RELOAD_ATTEMPTS; i += 1) {
      expect(recoverFromStaleChunk(new Error("Importing a module script failed."))).toBe(true);
    }
    // El siguiente intento ya no recarga (se alcanzó el tope).
    expect(recoverFromStaleChunk(new Error("Importing a module script failed."))).toBe(false);
    // reload se llama como máximo una vez por intento permitido.
    vi.waitFor(() => expect(reloadMock.mock.calls.length).toBeLessThanOrEqual(MAX_AUTO_RELOAD_ATTEMPTS + 1));
  });
});
