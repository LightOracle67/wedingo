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

  it("ships the supported locales (es, en + catálogo continental y variantes en-*)", () => {
    const names = entries.map(([key]) => (key.split("/").pop() || "").replace(".json", "")).sort();
    // es y en son la base obligatoria.
    expect(names).toContain("es");
    expect(names).toContain("en");
    // Todos los locales deben pertenecer al catálogo esperado (nada inesperado).
    const enVariants = [
      "en-AU", "en-CA", "en-GB", "en-HK", "en-IE", "en-IN", "en-JM", "en-MY",
      "en-NG", "en-NZ", "en-PH", "en-SG", "en-US", "en-ZA",
    ];
    const continental = [
      "fr", "de", "it", "pt-PT", "nl", "ru", "uk", "pl", "tr", "el",
      "zh-CN", "ja", "ko", "hi", "bn", "ta", "id", "ms", "th", "vi",
      "ar-SA", "fa", "he", "ur", "tl", "sw", "am", "ha", "yo", "zu", "af-ZA",
      "fr-CA", "pt-BR",
    ];
    const expected = new Set(["es", "en", ...enVariants, ...continental]);
    const unexpected = names.filter((n) => !expected.has(n));
    expect(unexpected).toEqual([]);
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
