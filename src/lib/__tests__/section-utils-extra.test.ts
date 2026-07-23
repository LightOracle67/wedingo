import { describe, it, expect } from "vitest";
import { parseSectionOrder, parseHidden } from "../section-utils";

describe("parseSectionOrder extra", () => {
  it("handles undefined input", () => {
    const result = parseSectionOrder(undefined);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const result = parseSectionOrder("");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("parseHidden", () => {
  it("handles null", () => {
    const result = parseHidden(null);
    expect(result.size).toBe(0);
  });

  it("handles undefined", () => {
    const result = parseHidden(undefined);
    expect(result.size).toBe(0);
  });
});
