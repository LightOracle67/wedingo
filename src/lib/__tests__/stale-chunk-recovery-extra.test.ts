import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { isStaleChunkError, recoverFromStaleChunk, MAX_AUTO_RELOAD_ATTEMPTS } from "../stale-chunk-recovery";

/**
 * Complementa la suite existente cubriendo las rutas del service worker/caches
 * presentes (desregistro + limpieza de caché antes de recargar) y el regreso
 * `true` cuando la recuperación arranca con intentos disponibles.
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

const staleError = new Error("Failed to fetch dynamically imported module: /assets/old-abc.js");

describe("stale-chunk-recovery (service worker + caches)", () => {
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    installSessionStorage();
    reloadMock = vi.fn();
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      writable: true,
      value: { reload: reloadMock } as unknown as Location,
    });
    // Simula un SW registrado y una caché con claves antiguas.
    const unregisterSpy = vi.fn(async () => true);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          getRegistrations: vi.fn(async () => [{ unregister: unregisterSpy }]),
        },
      },
    });
    Object.defineProperty(globalThis, "caches", {
      configurable: true,
      value: {
        keys: vi.fn(async () => ["wedingo-v1", "wedingo-v2"]),
        delete: vi.fn(async () => true),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("con SW y cachés presentes: desregistra, limpia la caché y recarga", async () => {
    const ok = recoverFromStaleChunk(staleError);
    expect(ok).toBe(true);
    // La recarga se dispara de forma asíncrona (finally del cleanup).
    await vi.waitFor(() => expect(reloadMock).toHaveBeenCalled());
    expect(globalThis.caches.delete).toHaveBeenCalledWith("wedingo-v1");
    expect(globalThis.caches.delete).toHaveBeenCalledWith("wedingo-v2");
    const unregisterSpy = (globalThis.navigator.serviceWorker.getRegistrations as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value as unknown as Promise<Array<{ unregister: ReturnType<typeof vi.fn> }>>;
    const registration = (await unregisterSpy)[0]!;
    expect(registration.unregister).toHaveBeenCalled();
  });

  it("agota los intentos y deja de reintentar (recarga off)", () => {
    // Consumimos todos los intentos disponibles +1: la siguiente recuperación
    // devuelve false y no recarga.
    for (let i = 0; i <= MAX_AUTO_RELOAD_ATTEMPTS; i++) {
      recoverFromStaleChunk(staleError);
    }
    expect(reloadMock.mock.calls.length).toBeLessThanOrEqual(MAX_AUTO_RELOAD_ATTEMPTS);
    // Con los intentos agotados ya no se permite la recuperación.
    expect(recoverFromStaleChunk(staleError)).toBe(false);
  });

  it("no es error de chunk obsoleto si el mensaje no es de import dinámico", () => {
    expect(isStaleChunkError(new Error("otro error"))).toBe(false);
  });

  it("render auxiliar: verifica que el módulo no rompe bajo import estático", () => {
    // Sonda inocua: garantiza el contrato público del módulo.
    expect(typeof recoverFromStaleChunk).toBe("function");
    expect(render).toBeDefined();
  });
});