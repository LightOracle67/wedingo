import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveSession, getSession, renewSession, clearSession, firestoreSessionExpiry } from "../sessionVars";

const STORAGE_KEY = "wedin_session";
const storage: Record<string, string> = {};

beforeEach(() => {
  Object.keys(storage).forEach((k) => delete storage[k]);
  const mock = {
    getItem: vi.fn((key: string) => (key in storage ? storage[key] : null)),
    setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete storage[key]; }),
    clear: vi.fn(() => { Object.keys(storage).forEach((k) => delete storage[k]); }),
    get length() { return Object.keys(storage).length; },
    key: vi.fn((i: number) => Object.keys(storage)[i] ?? null),
  };
  // La sesión se guarda en sessionStorage (más seguro que localStorage).
  vi.stubGlobal("sessionStorage", mock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sessionVars", () => {
  it("saves and retrieves a session", () => {
    saveSession("setup", "testuser");
    const session = getSession();
    expect(session).not.toBeNull();
    expect(session.type).toBe("setup");
    expect(session.identifier).toBe("testuser");
    expect(session.createdAt).toBeGreaterThan(0);
    expect(session.expiresAt).toBeGreaterThan(session.createdAt);
  });

  it("returns null when no session", () => {
    expect(getSession()).toBeNull();
  });

  it("clears session", () => {
    saveSession("setup", "user");
    clearSession();
    expect(getSession()).toBeNull();
  });

  it("renews session expiry", () => {
    saveSession("setup", "user");
    const original = getSession();
    renewSession();
    const renewed = getSession();
    expect(renewed.expiresAt).toBeGreaterThanOrEqual(original.expiresAt);
  });

  it("handles corrupted data gracefully", () => {
    storage[STORAGE_KEY] = "not-json";
    expect(getSession()).toBeNull();
  });

  it("handles localStorage write errors gracefully", () => {
    (sessionStorage.setItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => { throw new Error("QuotaExceededError"); });
    expect(() => saveSession("setup", "user")).not.toThrow();
    expect(getSession()).toBeNull();
  });

  it("persists extra fields", () => {
    saveSession("admin", "adminuser", { role: "super" });
    const session = getSession();
    expect(session.role).toBe("super");
  });

  it("expired session returns null", () => {
    storage[STORAGE_KEY] = JSON.stringify({
      type: "setup",
      identifier: "user",
      createdAt: 0,
      expiresAt: 1,
    });
    expect(getSession()).toBeNull();
    expect(storage[STORAGE_KEY]).toBeUndefined();
  });

  it("firestoreSessionExpiry returns a future date", () => {
    const expiry = firestoreSessionExpiry();
    expect(expiry).toBeInstanceOf(Date);
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  it("renewSession does nothing when no session exists", () => {
    expect(() => renewSession()).not.toThrow();
    expect(getSession()).toBeNull();
  });

  it("renewSession handles corrupted data gracefully", () => {
    storage[STORAGE_KEY] = "not-json";
    expect(() => renewSession()).not.toThrow();
  });

  it("renewSession handles storage errors gracefully", () => {
    saveSession("setup", "user");
    const orig = sessionStorage.getItem;
    sessionStorage.getItem = vi.fn(() => { throw new Error("fail"); });
    expect(() => renewSession()).not.toThrow();
    sessionStorage.getItem = orig;
  });
});
