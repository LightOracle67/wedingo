import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearExpiredCache } from "../storage-utils";

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

describe("clearExpiredCache", () => {
  beforeEach(() => {
    const mock = createStorageMock();
    vi.stubGlobal("localStorage", mock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears expired cache entries", () => {
    localStorage.setItem("wedin_invite_cache_test1", JSON.stringify({ cachedAt: Date.now() - 600000 }));
    localStorage.setItem("wedin_invite_cache_test2", JSON.stringify({ cachedAt: Date.now() }));
    const cleared = clearExpiredCache();
    expect(cleared).toBe(1);
    expect(localStorage.getItem("wedin_invite_cache_test1")).toBeNull();
    expect(localStorage.getItem("wedin_invite_cache_test2")).toBeTruthy();
  });

  it("handles no cache entries", () => {
    const cleared = clearExpiredCache();
    expect(cleared).toBe(0);
  });
});
