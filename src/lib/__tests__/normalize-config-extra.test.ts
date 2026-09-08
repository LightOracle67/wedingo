import { describe, it, expect } from "vitest";
import { normalizeConfig } from "../normalize-config";

describe("normalizeConfig extra", () => {
  it("handles null input", () => {
    const result = normalizeConfig(null as unknown as Record<string, unknown>);
    expect(result.theme).toBe("golden");
  });

  it("handles undefined input", () => {
    const result = normalizeConfig(undefined);
    expect(result.theme).toBe("golden");
  });

  it("trims string values", () => {
    const result = normalizeConfig({ firstName: "  Juan  " });
    expect(result.firstName).toBe("Juan");
  });

  it("defaults theme to golden", () => {
    const result = normalizeConfig({ firstName: "Test" });
    expect(result.theme).toBe("golden");
  });

  it("preserves valid theme", () => {
    const result = normalizeConfig({ theme: "forest" });
    expect(result.theme).toBe("forest");
  });

  it("handles numbers in string fields", () => {
    const result = normalizeConfig({ firstName: 123 as any });
    expect(result.firstName).toBe("123");
  });

  it("handles arrays gracefully", () => {
    const result = normalizeConfig({ theme: ["golden"] as any });
    expect(result.theme).toBe("golden");
  });

  it("preserves boolean-like strings", () => {
    const result = normalizeConfig({ menuEnabled: "true" });
    expect(result.menuEnabled).toBe("true");
  });

  it("handles empty object", () => {
    const result = normalizeConfig({});
    expect(result.theme).toBe("golden");
  });

  it("normaliza campos de superadmin, mapas y recortes de longitud", () => {
    const out = normalizeConfig({
      status: "bogus",
      verified: "false",
      rsvpSignatureEnabled: "true",
      detailsMapMode: "banana", // no válido → iframe
      transportMapMode: "hidden",
      accommodationMapMode: "name",
      rsvpCapacity: "123456", // slice(0,5)
      manualExpiry: "2027-12-31x", // slice(0,10)
      adminNotes: "x".repeat(2100),
      tags: "a".repeat(510),
    });
    expect(out.status).toBe("active");
    expect(out.verified).toBe("false");
    expect(out.rsvpSignatureEnabled).toBe("true");
    expect(out.detailsMapMode).toBe("iframe");
    expect(out.transportMapMode).toBe("hidden");
    expect(out.accommodationMapMode).toBe("name");
    expect(out.rsvpCapacity).toBe("12345");
    expect(out.manualExpiry).toBe("2027-12-31");
    expect(out.adminNotes.length).toBe(2000);
    expect(out.tags.length).toBe(500);
  });
});
