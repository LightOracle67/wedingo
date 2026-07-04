import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveSession, getSession, renewSession, clearSession } from "../sessionVars";

const STORAGE_KEY = "wedin_session";
let storage = {};

beforeEach(() => {
  storage = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key) => (key in storage ? storage[key] : null)),
    setItem: vi.fn((key, value) => { storage[key] = value; }),
    removeItem: vi.fn((key) => { delete storage[key]; }),
    clear: vi.fn(() => { storage = {}; }),
    get length() { return Object.keys(storage).length; },
    key: vi.fn((i) => Object.keys(storage)[i] ?? null),
  });
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
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => { throw new Error("QuotaExceededError"); });
    try {
      expect(() => saveSession("setup", "user")).not.toThrow();
      expect(getSession()).toBeNull();
    } finally {
      localStorage.setItem = originalSetItem;
    }
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
});
