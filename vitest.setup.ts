import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { webcrypto } from "node:crypto";

// Polyfill de matchMedia para jsdom (usado por useReducedMotion y otras
// comprobaciones de medios). Sin él, los hooks que consultan
// prefers-reduced-motion fallan en los tests.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom NO implementa crypto.subtle (solo getRandomValues): se rellena con el
// webcrypto de Node para que los SHA-256 del flujo de aportaciones sociales
// (ownerKeyHash) y demás hashes funcionen en los tests. Se define `subtle`
// SOBRE el objeto existente para no perder getRandomValues (que vive en el
// prototipo de window.crypto y un spread lo descartaría).
if (globalThis.crypto && !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, "subtle", { configurable: true, value: webcrypto.subtle });
} else if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
}

// jsdom NO implementa crypto.randomUUID (solo getRandomValues/subtle). Se
// rellena con el de Node para que los IDs generados con randomUUID funcionen
// en los tests sin duplicar seeds ni colisionar (patrón anti-Math.random).
if (globalThis.crypto && typeof globalThis.crypto.randomUUID !== "function") {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => webcrypto.randomUUID(),
  });
}

// jsdom NO expone localStorage de forma fiable en todos los entornos: algunos
// módulos (consentimiento de cookies) leen window.localStorage al importarse.
// Se rellena con un respaldo Map para que getItem/setItem/removeItem/clear
// funcionen sin 'Cannot read properties of undefined (reading getItem)'.
const localStorageMock = (() => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => map.set(k, String(v)),
    removeItem: (k: string) => map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  };
})();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorageMock });

afterEach(() => cleanup());
