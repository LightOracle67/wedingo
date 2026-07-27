import { describe, it, expect, vi, afterEach } from "vitest";
import { idbSet, idbGet, idbDelete, idbClear } from "../idb-utils";

describe("idb-utils", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports idbSet as a function", () => expect(typeof idbSet).toBe("function"));
  it("exports idbGet as a function", () => expect(typeof idbGet).toBe("function"));
  it("exports idbDelete as a function", () => expect(typeof idbDelete).toBe("function"));
  it("exports idbClear as a function", () => expect(typeof idbClear).toBe("function"));

  it("stores and retrieves a value", async () => {
    await idbSet("test", { data: 123 });
    const result = await idbGet("test");
    expect(result).toEqual({ data: 123 });
  });

  it("returns null for missing keys", async () => {
    const result = await idbGet("nonexistent");
    expect(result).toBeNull();
  });

  it("deletes a value", async () => {
    await idbSet("temp", "value");
    await idbDelete("temp");
    const result = await idbGet("temp");
    expect(result).toBeNull();
  });

  it("clears all values", async () => {
    await idbSet("a", 1);
    await idbSet("b", 2);
    await idbClear();
    expect(await idbGet("a")).toBeNull();
    expect(await idbGet("b")).toBeNull();
  });

  function makeFailingIDB() {
    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => {
        const req: Record<string, unknown> = {
          result: null,
          error: new Error("IDB fail"),
        };
        setTimeout(() => {
          (req.onerror as () => void)?.();
        }, 1);
        return req;
      }),
    });
  }

  it("idbGet returns null when openDB fails", async () => {
    makeFailingIDB();
    const result = await idbGet("any");
    expect(result).toBeNull();
  });

  it("idbSet silently fails when openDB fails", async () => {
    makeFailingIDB();
    await expect(idbSet("any", "value")).resolves.toBeUndefined();
  });

  it("idbDelete silently fails when openDB fails", async () => {
    makeFailingIDB();
    await expect(idbDelete("any")).resolves.toBeUndefined();
  });

  it("idbClear silently fails when openDB fails", async () => {
    makeFailingIDB();
    await expect(idbClear()).resolves.toBeUndefined();
  });

  function makeTxErrorIDB() {
    const tx: Record<string, unknown> = {};
    tx.error = new Error("tx error");
    tx.objectStore = vi.fn(() => ({
      put: vi.fn(() => {
        setTimeout(() => (tx.onerror as () => void)?.(), 1);
      }),
      get: vi.fn(() => {
        const req: Record<string, unknown> = {};
        req.error = new Error("req error");
        setTimeout(() => (req.onerror as () => void)?.(), 1);
        return req;
      }),
      delete: vi.fn(() => {
        setTimeout(() => (tx.onerror as () => void)?.(), 1);
      }),
      clear: vi.fn(() => {
        setTimeout(() => (tx.onerror as () => void)?.(), 1);
      }),
    }));
    const db = {
      transaction: vi.fn(() => tx),
    };
    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => {
        const req: Record<string, unknown> = { result: db };
        setTimeout(() => (req.onsuccess as () => void)?.(), 1);
        return req;
      }),
    });
  }

  it("idbSet handles transaction errors", async () => {
    makeTxErrorIDB();
    await expect(idbSet("key", "val")).rejects.toThrow("tx error");
  });

  it("idbGet handles request errors", async () => {
    makeTxErrorIDB();
    await expect(idbGet("key")).rejects.toThrow("req error");
  });

  it("idbDelete handles transaction errors", async () => {
    makeTxErrorIDB();
    await expect(idbDelete("key")).rejects.toThrow("tx error");
  });

  it("idbClear handles transaction errors", async () => {
    makeTxErrorIDB();
    await expect(idbClear()).rejects.toThrow("tx error");
  });

  it("handles openDB onerror path", async () => {
    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => {
        const req = {
          result: null,
          error: new Error("open failed"),
        };
        setTimeout(() => (req.onerror as () => void)?.(), 1);
        return req;
      }),
    });
    await expect(idbGet("key")).resolves.toBeNull();
    vi.unstubAllGlobals();
  });

  it("handles openDB onupgradeneeded when store exists", async () => {
    const tx = {
      objectStore: vi.fn(() => ({
        put: vi.fn(() => setTimeout(() => (tx.oncomplete as () => void)?.(), 1)),
        get: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      })),
    };
    const createObjectStore = vi.fn();
    const db = { createObjectStore, transaction: vi.fn(() => tx) };
    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => {
        const req = { result: db };
        setTimeout(() => {
          (req.onupgradeneeded as () => void)?.();
          (req.onsuccess as () => void)?.();
        }, 1);
        return req;
      }),
    });
    await expect(idbSet("k", "v")).resolves.toBeUndefined();
    expect(createObjectStore).toHaveBeenCalledWith("cache");
    vi.unstubAllGlobals();
  });
});
