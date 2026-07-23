import { describe, it, expect } from "vitest";
import { normalizeConfig } from "../normalize-config";

describe("normalizeConfig extra", () => {
  it("handles null input", () => {
    const result = normalizeConfig(null);
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
});
