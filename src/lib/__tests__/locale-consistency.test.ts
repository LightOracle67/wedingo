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

  it("only ships the supported locales (es and en)", () => {
    const names = entries.map(([key]) => key.split("/").pop()).sort();
    expect(names).toEqual(["en.json", "es.json"]);
  });

  it("all locale files share a common set of top-level keys", () => {
    const allKeys = entries.map(([, mod]) => new Set(Object.keys(mod)));
    const common = [
      ...allKeys.reduce((a: Set<string>, b: Set<string>) => new Set([...a].filter((k) => b.has(k)))),
    ].sort();
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

  // Regresión: el código del RSVP llama t('rsvp.daysLeft', { days }) (RsvpSection.tsx
  // ~536-541) pero la plantilla usaba {{count}}, por lo que la UI mostraba el texto
  // crudo '{{count}} días para confirmar'. Fijamos que la plantilla internacionalizada
  // usa la variable {{days}} en ambos idiomas para que la interpolación no deje el
  // marcador sin sustituir.
  it("rsvp.daysLeft interpolates the {{days}} variable in both locales", () => {
    for (const [, mod] of entries) {
      const key = (mod as Record<string, unknown>).rsvp as Record<string, unknown> | undefined;
      const template = key?.daysLeft as string | undefined;
      expect(template).toBeTypeOf("string");
      expect(template).toContain("{{days}}");
      expect(template).not.toContain("{{count}}");
    }
  });
});
