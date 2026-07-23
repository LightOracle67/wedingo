import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getStorageUsage, clearExpiredCache } from "../storage-utils";

function createStorageMock() {
  const store: Record<string, string> = {};

  return {
    get length() { return Object.keys(store).length; },
    key(index: number) { return Object.keys(store)[index] ?? null; },
    getItem(key: string) { return Object.hasOwn(store, key) ? store[key] : null; },
    setItem(key: string, value: string) { store[key] = String(value); },
    removeItem(key: string) { delete store[key]; },
    clear() { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

function mockStorage() {
  const mock = createStorageMock();
  vi.stubGlobal("localStorage", mock);
  return mock;
}

describe("storage-utils", () => {
  beforeEach(() => {
    mockStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
});
