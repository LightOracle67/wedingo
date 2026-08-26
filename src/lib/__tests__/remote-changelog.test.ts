import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseChangelogMarkdown,
  readChangelogCache,
  writeChangelogCache,
  loadChangelog,
  CHANGELOG_CACHE_KEY,
  CHANGELOG_CACHE_TTL_MS,
} from "../remote-changelog";

// jsdom no implementa localStorage: se instala un respaldo con Map (mismo
// patrón que AccessibilityPanel.test.tsx) para poder simular caché y expiración.
const storageMap = new Map<string, string>();
beforeEach(() => {
  storageMap.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => void storageMap.set(k, v),
      removeItem: (k: string) => void storageMap.delete(k),
      clear: () => storageMap.clear(),
    },
  });
});

describe("parseChangelogMarkdown", () => {
  it("parses version, date and bullet changes per block", () => {
    const md = [
      "# Changelog",
      "",
      "## 2.134.1 — 2026-08-26",
      "",
      "- Fix del contador RSVP",
      "- URLs vacías permitidas",
      "",
      "## 2.134.0 - 2026-08-25",
      "- UI moderna",
    ].join("\n");
    const entries = parseChangelogMarkdown(md);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      version: "2.134.1",
      date: "2026-08-26",
      changes: ["Fix del contador RSVP", "URLs vacías permitidas"],
    });
    expect(entries[1]?.version).toBe("2.134.0");
  });

  it("skips malformed blocks and entries without changes", () => {
    const md = [
      "## sin fecha ni guion",
      "- huérfano",
      "",
      "## 2.1.0 — 2026-08-20",
      "",
      "## 2.0.0 — 2026-08-19",
      "- solo esta cuenta",
    ].join("\n");
    const entries = parseChangelogMarkdown(md);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.version).toBe("2.0.0");
  });
});

describe("changelog cache", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores and reads entries within the TTL", () => {
    writeChangelogCache([{ version: "2.134.1", date: "2026-08-26", changes: ["a"] }]);
    const cached = readChangelogCache();
    expect(cached).not.toBeNull();
    expect(cached?.[0]?.version).toBe("2.134.1");
  });

  it("returns null when the cache is expired", () => {
    const expired = { ts: Date.now() - CHANGELOG_CACHE_TTL_MS - 1000, entries: [{ version: "1", date: "d", changes: ["x"] }] };
    window.localStorage.setItem(CHANGELOG_CACHE_KEY, JSON.stringify(expired));
    expect(readChangelogCache()).toBeNull();
  });

  it("returns null on corrupted JSON", () => {
    window.localStorage.setItem(CHANGELOG_CACHE_KEY, "{not json");
    expect(readChangelogCache()).toBeNull();
  });
});

describe("loadChangelog", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns cached entries without fetching", async () => {
    writeChangelogCache([{ version: "2.134.1", date: "2026-08-26", changes: ["cached"] }]);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const entries = await loadChangelog();
    expect(entries[0]?.changes?.[0]).toBe("cached");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches from GitHub, parses and caches when no cache exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("## 2.134.1 — 2026-08-26\n- desde github\n"),
      }),
    );
    const entries = await loadChangelog();
    expect(entries[0]?.version).toBe("2.134.1");
    const cached = readChangelogCache();
    expect(cached?.[0]?.changes?.[0]).toBe("desde github");
  });

  it("falls back to the bundled changelog when fetch fails and there is no cache", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const entries = await loadChangelog();
    expect(entries.length).toBeGreaterThan(0);
  });
});