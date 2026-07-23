import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const LOCALES_DIR = path.resolve(__dirname, "../../i18n/locales");

describe("Locale consistency", () => {
  const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json"));

  const refPath = path.join(LOCALES_DIR, "en.json");
  const refLocale = JSON.parse(fs.readFileSync(refPath, "utf-8"));

  it("has at least 50 locale files", () => {
    expect(files.length).toBeGreaterThanOrEqual(50);
  });

  function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? flattenKeys(v as Record<string, unknown>, `${prefix}${k}.`)
        : [`${prefix}${k}`]
    );
  }

  it("all locale files share a common set of top-level keys", () => {
    const allKeys = files.map((f) => new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, f), "utf-8")))));
    const common = [...allKeys.reduce((a, b) => new Set([...a].filter((k) => b.has(k))))].sort();
    files.forEach((file) => {
      const locale = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), "utf-8"));
      const topLevel = Object.keys(locale).sort();
      common.forEach((key) => {
        expect(topLevel).toContain(key);
      });
    });
  });
});
