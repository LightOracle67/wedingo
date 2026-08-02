import { describe, it, expect } from "vitest";
import { isValidFullName, normalizeFullName } from "../name-utils";

describe("isValidFullName", () => {
  it("accepts exactly 3 words (name + two surnames)", () => {
    expect(isValidFullName("Ana María García")).toBe(true);
    expect(isValidFullName("Luis Pérez Rodríguez")).toBe(true);
  });

  it("rejects single or double word names", () => {
    expect(isValidFullName("Ana")).toBe(false);
    expect(isValidFullName("Ana María")).toBe(false);
  });

  it("rejects more than two surnames", () => {
    expect(isValidFullName("Ana María García López")).toBe(false);
  });

  it("normalizes double spaces before validating", () => {
    expect(isValidFullName("Ana   María  García")).toBe(true);
  });

  it("rejects empty or whitespace-only input", () => {
    expect(isValidFullName("")).toBe(false);
    expect(isValidFullName("   ")).toBe(false);
  });

  it("accepts accented characters and hyphens", () => {
    expect(isValidFullName("José Ángel Fernández")).toBe(true);
    expect(isValidFullName("María-José Sáez Ortiz")).toBe(true);
  });
});

describe("normalizeFullName", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeFullName("  Ana   María  García  ")).toBe("Ana María García");
  });
});
