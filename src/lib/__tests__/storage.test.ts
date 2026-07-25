/**
 * storage.test.js
 * ─────────────────────────────────────────────────────────────
 * Tests para las utilidades de almacenamiento (localStorage,
 * sessionStorage) con control de consentimiento de cookies.
 *
 * @module storage.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { safeSetItem, safeGetItem, safeRemoveItem, clearAllStorage, hasStorageConsent } from "../storage";

/**
 * Crea un mock de Storage que usa un objeto interno como backing store
 * y expone las claves como propiedades enumerables para que Object.keys()
 * funcione correctamente (necesario para clearAllStorage).
 *
 * @returns {object} Mock compatible con la API de Storage.
 */
function createStorageMock() {
  const store = {};

  const mock = {
    get length() {
      return Object.keys(store).length;
    },
    key(index) {
      const keys = Object.keys(store);
      return keys[index] ?? null;
    },
    getItem(key) {
      return Object.hasOwn(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
      // Refleja la clave como propiedad enumerable en el mock
      // para que Object.keys() pueda encontrarla.
      mock[key] = value;
    },
    removeItem(key) {
      delete store[key];
      delete mock[key];
    },
  };

  return mock;
}

describe("storage", () => {
  let localMock;
  let sessionMock;

  beforeEach(() => {
    localMock = createStorageMock();
    sessionMock = createStorageMock();
    vi.stubGlobal("localStorage", localMock);
    vi.stubGlobal("sessionStorage", sessionMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ═══════════════════════════════════════════════════════
  // hasStorageConsent
  // ═══════════════════════════════════════════════════════

  describe("hasStorageConsent", () => {
    it("devuelve false si no hay consentimiento", () => {
      expect(hasStorageConsent()).toBe(false);
    });

    it("devuelve true si el consentimiento está aceptado", () => {
      localMock.setItem("wedin_cookie_consent", "accepted");
      expect(hasStorageConsent()).toBe(true);
    });

    it("devuelve false si el consentimiento tiene otro valor", () => {
      localMock.setItem("wedin_cookie_consent", "rejected");
      expect(hasStorageConsent()).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // safeSetItem / safeGetItem
  // ═══════════════════════════════════════════════════════

  describe("safeSetItem / safeGetItem con localStorage", () => {
    it("no guarda en localStorage si no hay consentimiento", () => {
      const result = safeSetItem("wedin_test", "valor");
      expect(result).toBe(false);
    });

    it("guarda y lee en localStorage si hay consentimiento", () => {
      localMock.setItem("wedin_cookie_consent", "accepted");
      safeSetItem("wedin_test", "valor de prueba");
      const result = safeGetItem("wedin_test");
      expect(result).toBe("valor de prueba");
    });

    it("devuelve null al leer una clave inexistente", () => {
      localMock.setItem("wedin_cookie_consent", "accepted");
      const result = safeGetItem("clave_que_no_existe");
      expect(result).toBeNull();
    });

    it("devuelve null al leer sin consentimiento", () => {
      const result = safeGetItem("wedin_test");
      expect(result).toBeNull();
    });
  });

  describe("safeSetItem / safeGetItem con sessionStorage", () => {
    it("guarda y lee en sessionStorage sin necesidad de consentimiento", () => {
      safeSetItem("wedin_session_test", "valor sesión", sessionStorage);
      const result = safeGetItem("wedin_session_test", sessionStorage);
      expect(result).toBe("valor sesión");
    });

    it("devuelve null al leer clave inexistente en sessionStorage", () => {
      const result = safeGetItem("clave_inexistente", sessionStorage);
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════
  // safeRemoveItem
  // ═══════════════════════════════════════════════════════

  describe("safeRemoveItem", () => {
    it("elimina una clave de localStorage con consentimiento", () => {
      localMock.setItem("wedin_cookie_consent", "accepted");
      localMock.setItem("wedin_borrar", "valor");
      safeRemoveItem("wedin_borrar");
      const result = safeGetItem("wedin_borrar");
      expect(result).toBeNull();
    });

    it("no lanza error al eliminar una clave inexistente", () => {
      expect(() => safeRemoveItem("no_existe")).not.toThrow();
    });

    it("elimina una clave de sessionStorage", () => {
      sessionMock.setItem("wedin_ses_borrar", "valor");
      safeRemoveItem("wedin_ses_borrar", sessionStorage);
      const result = safeGetItem("wedin_ses_borrar", sessionStorage);
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════
  // clearAllStorage
  // ═══════════════════════════════════════════════════════

  describe("clearAllStorage", () => {
    it("elimina solo claves con prefijo wedin_ de localStorage", () => {
      localMock.setItem("wedin_uno", "1");
      localMock.setItem("wedin_dos", "2");
      localMock.setItem("otra_cosa", "no borrar");
      clearAllStorage();
      expect(localMock.getItem("wedin_uno")).toBeNull();
      expect(localMock.getItem("wedin_dos")).toBeNull();
      expect(localMock.getItem("otra_cosa")).toBe("no borrar");
    });

    it("elimina solo claves con prefijo wedin_ de sessionStorage", () => {
      sessionMock.setItem("wedin_ses_1", "a");
      sessionMock.setItem("wedin_ses_2", "b");
      sessionMock.setItem("otra_ses", "c");
      clearAllStorage();
      expect(sessionMock.getItem("wedin_ses_1")).toBeNull();
      expect(sessionMock.getItem("wedin_ses_2")).toBeNull();
      expect(sessionMock.getItem("otra_ses")).toBe("c");
    });

    it("no lanza error si no hay claves wedin_", () => {
      expect(() => clearAllStorage()).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════

  describe("manejo de errores", () => {
    it("safeSetItem no lanza error si localStorage falla", () => {
      localMock.setItem("wedin_cookie_consent", "accepted");
      const origSetItem = localMock.setItem;
      localMock.setItem = vi.fn(() => { throw new Error("QuotaExceeded"); });
      const result = safeSetItem("wedin_test", "valor");
      localMock.setItem = origSetItem;
      expect(result).toBe(false);
    });

    it("safeGetItem no lanza error si localStorage falla", () => {
      localMock.setItem("wedin_cookie_consent", "accepted");
      const origGetItem = localMock.getItem;
      localMock.getItem = vi.fn(() => { throw new Error("SecurityError"); });
      const result = safeGetItem("wedin_test");
      localMock.getItem = origGetItem;
      expect(result).toBeNull();
    });

    it("safeRemoveItem no lanza error si falla", () => {
      const origRemoveItem = localMock.removeItem;
      localMock.removeItem = vi.fn(() => { throw new Error("Error"); });
      expect(() => safeRemoveItem("wedin_test")).not.toThrow();
      localMock.removeItem = origRemoveItem;
    });
  });
});
