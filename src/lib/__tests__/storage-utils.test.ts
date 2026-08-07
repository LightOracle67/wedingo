import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearExpiredCache } from "../storage-utils";

const store: Record<string, string> = {};
const mock = {
  get length() {
    return Object.keys(store).length;
  },
  key(index: number) {
    return Object.keys(store)[index] ?? null;
  },
  getItem(key: string) {
    return Object.hasOwn(store, key) ? store[key] : null;
  },
  setItem(key: string, value: string) {
    store[key] = String(value);
  },
  removeItem(key: string) {
    delete store[key];
  },
  clear() {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};

Object.defineProperty(globalThis, "localStorage", { value: mock, writable: true, configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: { clear() {} }, writable: true, configurable: true });

describe("storage-utils", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("clearExpiredCache clears expired cache entries", () => {
    localStorage.setItem("wedin_invite_cache_test1", JSON.stringify({ cachedAt: Date.now() - 600000 }));
    localStorage.setItem("wedin_invite_cache_test2", JSON.stringify({ cachedAt: Date.now() }));
    const cleared = clearExpiredCache();
    expect(cleared).toBe(1);
    expect(localStorage.getItem("wedin_invite_cache_test1")).toBeNull();
    expect(localStorage.getItem("wedin_invite_cache_test2")).toBeTruthy();
  });

  it("clearExpiredCache handles no cache entries", () => {
    const cleared = clearExpiredCache();
    expect(cleared).toBe(0);
  });

  it("clearExpiredCache handles unparseable cache entries", () => {
    localStorage.setItem("wedin_invite_cache_bad", "not-json");
    const cleared = clearExpiredCache();
    expect(cleared).toBe(1);
    expect(localStorage.getItem("wedin_invite_cache_bad")).toBeNull();
  });

  it("clearExpiredCache handles localStorage errors", () => {
    localStorage.setItem("wedin_invite_cache_test", JSON.stringify({ cachedAt: 0 }));
    const origKey = localStorage.key;
    localStorage.key = vi.fn(() => {
      throw new Error("fail");
    });
    const result = clearExpiredCache();
    localStorage.key = origKey;
    expect(result).toBe(0);
  });

  it("clearExpiredCache handles empty value for cache key", () => {
    localStorage.setItem("wedin_invite_cache_empty", "");
    const result = clearExpiredCache();
    expect(result).toBe(0);
  });
});
