import { describe, it, expect } from "vitest";

type GlobModules = Record<string, Record<string, string>>;

const localeModules: GlobModules = import.meta.glob("../../i18n/locales/*.json", { eager: true }) as GlobModules;

/** Detecta valores array a cualquier profundidad (corpus OPUS-MT corrupto). */
function hasArrayValue(obj: unknown): boolean {
  if (Array.isArray(obj)) return true;
  if (obj !== null && typeof obj === "object") {
    return Object.values(obj).some(hasArrayValue);
  }
  return false;
}

describe("Locale consistency", () => {
  const entries = Object.entries(localeModules);

  it("has at least 50 locale files", () => {
    expect(entries.length).toBeGreaterThanOrEqual(50);
  });

  it("all locale files share a common set of top-level keys", () => {
    const allKeys = entries.map(([, mod]) => new Set(Object.keys(mod)));
    const common = [...allKeys.reduce((a: Set<string>, b: Set<string>) => new Set([...a].filter((k) => b.has(k))))].sort();
    entries.forEach(([, mod]) => {
      const topLevel = Object.keys(mod).sort();
      common.forEach((key) => {
        expect(topLevel).toContain(key);
      });
    });
  });

  it("no locale contains array values (corrupted corpus data)", () => {
    const bad = entries.filter(([, mod]) => hasArrayValue(mod)).map(([key]) => key.split("/").pop());
    expect(bad).toEqual([]);
  });
});
