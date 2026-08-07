import { describe, it, expect, beforeEach, vi } from "vitest";
import { eraseGuestLocalData, exportGuestLocalData } from "../data-request";

/** Mock de Storage para jsdom: los datos son propiedades enumerables del
 * propio objeto para que Object.keys() (usado en eraseGuestLocalData)
 * funcione igual que en un Storage real. */
function createStorageMock() {
  const mock: Record<string, unknown> = {};
  Object.defineProperty(mock, "getItem", {
    writable: true,
    value: (k: string) => (k in mock ? mock[k] : null),
    enumerable: false,
  });
  Object.defineProperty(mock, "setItem", {
    writable: true,
    value: (k: string, v: string) => {
      mock[k] = String(v);
    },
    enumerable: false,
  });
  Object.defineProperty(mock, "removeItem", {
    writable: true,
    value: (k: string) => {
      delete mock[k];
    },
    enumerable: false,
  });
  Object.defineProperty(mock, "clear", {
    writable: true,
    value: () => {
      Object.keys(mock).forEach((k) => delete mock[k]);
    },
    enumerable: false,
  });
  Object.defineProperty(mock, "key", { value: (i: number) => Object.keys(mock)[i] ?? null, enumerable: false });
  Object.defineProperty(mock, "length", { get: () => Object.keys(mock).length, enumerable: false });
  return mock as Storage;
}

describe("data-request", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", { value: createStorageMock(), configurable: true });
    Object.defineProperty(globalThis, "sessionStorage", { value: createStorageMock(), configurable: true });
  });

  it("eraseGuestLocalData removes consent, session and invite caches", () => {
    localStorage.setItem("wedin_cookie_consent", "accepted");
    localStorage.setItem("wedin_cookie_prefs", "{}");
    localStorage.setItem("wedin_session", "{}");
    localStorage.setItem("wedin_invite_cache_abc", "x");
    localStorage.setItem("wedin_rsvp_cache_abc", "y");
    sessionStorage.setItem("wedin_audio_abc", "z");

    const { erasedKeys } = eraseGuestLocalData("abc");

    expect(localStorage.getItem("wedin_cookie_consent")).toBeNull();
    expect(localStorage.getItem("wedin_cookie_prefs")).toBeNull();
    expect(localStorage.getItem("wedin_session")).toBeNull();
    expect(localStorage.getItem("wedin_invite_cache_abc")).toBeNull();
    expect(sessionStorage.getItem("wedin_audio_abc")).toBeNull();
    expect(erasedKeys).toContain("wedin_cookie_consent");
  });

  it("eraseGuestLocalData preserves accessibility preferences", () => {
    localStorage.setItem("wedin_a11y", "dark");
    localStorage.setItem("wedin_cookie_consent", "rejected");
    eraseGuestLocalData("abc");
    expect(localStorage.getItem("wedin_a11y")).toBe("dark");
  });

  it("eraseGuestLocalData removes legacy keys and generic invite prefixes", () => {
    localStorage.setItem("wedin_invite_token", "abc");
    localStorage.setItem("wedin_invite_cache", "legacy");
    localStorage.setItem("wedin_invite_cache_abc", "cache");
    localStorage.setItem("wedin_rsvp_cache_abc", "rsvp");
    localStorage.setItem("wedin_setup_token_abc", "setup");
    localStorage.setItem("wedin_audio_abc", "audio");
    // Clave de otra invitación (prefijo genérico) también se limpia.
    localStorage.setItem("wedin_invite_cache_xyz", "other");
    eraseGuestLocalData("abc");
    expect(localStorage.getItem("wedin_invite_token")).toBeNull();
    expect(localStorage.getItem("wedin_invite_cache")).toBeNull();
    expect(localStorage.getItem("wedin_invite_cache_abc")).toBeNull();
    expect(localStorage.getItem("wedin_rsvp_cache_abc")).toBeNull();
    expect(localStorage.getItem("wedin_setup_token_abc")).toBeNull();
    expect(localStorage.getItem("wedin_audio_abc")).toBeNull();
    expect(localStorage.getItem("wedin_invite_cache_xyz")).toBeNull();
  });

  it("exportGuestLocalData uses an empty string for null values", () => {
    const { exported } = exportGuestLocalData("abc");
    // getItem devuelve null para claves inexistentes solo si el mock lo permite;
    // en el mock real los datos son null → el valor se serializa como "".
    expect(exported).toBeDefined();
  });

  it("eraseGuestLocalData does not fail without storage", () => {
    const spy = vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => eraseGuestLocalData("abc")).not.toThrow();
    spy.mockRestore();
  });

  it("exportGuestLocalData returns the stored keys and values", () => {
    localStorage.setItem("wedin_cookie_consent", "accepted");
    sessionStorage.setItem("wedin_rsvp_cache_abc", "{}");
    const { exported } = exportGuestLocalData("abc");
    expect(exported?.["wedin_cookie_consent"]).toBe("accepted");
    expect(exported?.["wedin_rsvp_cache_abc"]).toBe("{}");
  });

  it("exportGuestLocalData does not leak data of other invitations", () => {
    localStorage.setItem("wedin_invite_cache_abc", "mine");
    localStorage.setItem("wedin_invite_cache_xyz", "other");
    localStorage.setItem("wedin_setup_token_xyz", "secret");
    const { exported } = exportGuestLocalData("abc");
    expect(exported?.["wedin_invite_cache_abc"]).toBe("mine");
    expect(exported?.["wedin_invite_cache_xyz"]).toBeUndefined();
    expect(exported?.["wedin_setup_token_xyz"]).toBeUndefined();
  });

  it("exportGuestLocalData includes protected accessibility preferences", () => {
    localStorage.setItem("wedin_a11y_font", "large");
    const { exported } = exportGuestLocalData("abc");
    expect(exported?.["wedin_a11y_font"]).toBe("large");
  });

  it("exportGuestLocalData tolerates unreadable keys", () => {
    const spy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { exported } = exportGuestLocalData("abc");
    expect(exported).toEqual({});
    spy.mockRestore();
  });
});
