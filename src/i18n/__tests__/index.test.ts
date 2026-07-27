import { describe, it, expect, vi } from "vitest";

vi.mock("i18next-resources-to-backend", () => ({
  default: () => ({ type: "backend" as const, read: (_lng: string, _ns: string, cb: (err: Error | null, data: unknown) => void) => cb(null, {}) }),
}));

import i18n from "../index";

describe("i18n initialization", () => {
  it("initializes with fallback language", () => {
    expect(i18n.options.fallbackLng).toEqual(["es"]);
  });

  it("has interpolation configured", () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
  });
});
