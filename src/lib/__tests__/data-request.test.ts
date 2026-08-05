import { describe, it, expect, beforeEach, vi } from "vitest";
import { eraseGuestLocalData, exportGuestLocalData } from "../data-request";

/** Mock de Storage para jsdom: los datos son propiedades enumerables del
 * propio objeto para que Object.keys() (usado en eraseGuestLocalData)
 * funcione igual que en un Storage real. */
function createStorageMock() {
  const mock: Record<string, unknown> = {};
  Object.defineProperty(mock, "getItem", { writable: true, value: (k: string) => (k in mock ? mock[k] : null), enumerable: false });
  Object.defineProperty(mock, "setItem", { writable: true, value: (k: string, v: string) => { mock[k] = String(v); }, enumerable: false });
  Object.defineProperty(mock, "removeItem", { writable: true, value: (k: string) => { delete mock[k]; }, enumerable: false });
  Object.defineProperty(mock, "clear", { writable: true, value: () => { Object.keys(mock).forEach((k) => delete mock[k]); }, enumerable: false });
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

  it("exportGuestLocalData tolerates unreadable keys", () => {
    const spy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { exported } = exportGuestLocalData("abc");
    expect(exported).toEqual({});
    spy.mockRestore();
  });
});
