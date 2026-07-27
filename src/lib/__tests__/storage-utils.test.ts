import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStorageUsage, clearExpiredCache } from "../storage-utils";

const store: Record<string, string> = {};
const mock = {
  get length() { return Object.keys(store).length; },
  key(index: number) { return Object.keys(store)[index] ?? null; },
  getItem(key: string) { return Object.hasOwn(store, key) ? store[key] : null; },
  setItem(key: string, value: string) { store[key] = String(value); },
  removeItem(key: string) { delete store[key]; },
  clear() { Object.keys(store).forEach((k) => delete store[k]); },
};

Object.defineProperty(globalThis, "localStorage", { value: mock, writable: true, configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: { clear() {} }, writable: true, configurable: true });

describe("storage-utils", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });
  it("exports getStorageUsage as a function", () => {
    expect(typeof getStorageUsage).toBe("function");
  });

  it("getStorageUsage returns zero usage with no data", () => {
    const usage = getStorageUsage();
    expect(usage.used).toBe(0);
    expect(usage.percent).toBe(0);
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

  it("getStorageUsage calculates usage from wedin_ keys", () => {
    localStorage.setItem("wedin_key1", "hello");
    localStorage.setItem("wedin_key2", "world");
    const usage = getStorageUsage();
    expect(usage.used).toBeGreaterThan(0);
    expect(usage.total).toBe(5 * 1024 * 1024);
  });

  it("getStorageUsage ignores non-wedin_ keys", () => {
    localStorage.setItem("other_key", "data");
    const usage = getStorageUsage();
    expect(usage.used).toBe(0);
    expect(usage.percent).toBe(0);
  });

  it("getStorageUsage handles localStorage errors", () => {
    const origKey = localStorage.key;
    localStorage.key = vi.fn(() => { throw new Error("fail"); });
    const usage = getStorageUsage();
    localStorage.key = origKey;
    expect(usage.used).toBe(0);
    expect(usage.percent).toBe(0);
  });

  it("clearExpiredCache handles localStorage errors", () => {
    localStorage.setItem("wedin_invite_cache_test", JSON.stringify({ cachedAt: 0 }));
    const origKey = localStorage.key;
    localStorage.key = vi.fn(() => { throw new Error("fail"); });
    const result = clearExpiredCache();
    localStorage.key = origKey;
    expect(result).toBe(0);
  });

  it("getStorageUsage handles empty value for wedin_ key", () => {
    localStorage.setItem("wedin_empty", "");
    const usage = getStorageUsage();
    expect(usage.used).toBe(0);
    expect(usage.percent).toBe(0);
  });

  it("clearExpiredCache handles empty value for cache key", () => {
    localStorage.setItem("wedin_invite_cache_empty", "");
    const result = clearExpiredCache();
    expect(result).toBe(0);
  });
});
