import { describe, it, expect } from "vitest";
import { DIETARY_OPTIONS, parseDietaryInfo, formatDietary } from "../rsvp-utils";

describe("DIETARY_OPTIONS", () => {
  it("has 4 options with value and label", () => {
    expect(DIETARY_OPTIONS).toHaveLength(4);
    DIETARY_OPTIONS.forEach((opt) => {
      expect(opt).toHaveProperty("value");
      expect(opt).toHaveProperty("label");
    });
  });
});

describe("parseDietaryInfo", () => {
  it("returns empty fields for null/undefined input", () => {
    expect(parseDietaryInfo(null, true)).toEqual({ mealChoice: "", dietarySelection: [], dietaryOther: "" });
    expect(parseDietaryInfo(undefined, true)).toEqual({ mealChoice: "", dietarySelection: [], dietaryOther: "" });
  });

  it("parses meal choice when menuEnabled is true", () => {
    const result = parseDietaryInfo("Menú: Carne", true);
    expect(result.mealChoice).toBe("Carne");
    expect(result.dietarySelection).toEqual([]);
    expect(result.dietaryOther).toBe("");
  });

  it("does not parse meal choice when menuEnabled is false", () => {
    const result = parseDietaryInfo("Menú: Carne", false);
    expect(result.mealChoice).toBe("");
    expect(result.dietaryOther).toBe("Menú: Carne");
  });

  it("parses dietary selections", () => {
    const result = parseDietaryInfo("Menú: Pescado | sin gluten | sin lactosa", true);
    expect(result.mealChoice).toBe("Pescado");
    expect(result.dietarySelection).toEqual(["sin gluten", "sin lactosa"]);
    expect(result.dietaryOther).toBe("");
  });

  it("captures non-standard items as other", () => {
    const result = parseDietaryInfo("Menú: Carne | sin gluten | soy alérgico al huevo", true);
    expect(result.dietarySelection).toEqual(["sin gluten"]);
    expect(result.dietaryOther).toBe("soy alérgico al huevo");
  });

  it("handles incomplete input gracefully", () => {
    const result = parseDietaryInfo("sin gluten", true);
    expect(result.mealChoice).toBe("");
    expect(result.dietarySelection).toEqual(["sin gluten"]);
  });
});

describe("formatDietary", () => {
  it("returns dash for empty input", () => {
    expect(formatDietary("", true)).toBe("—");
    expect(formatDietary(null, true)).toBe("—");
  });

  it("formats meal choice and restrictions", () => {
    expect(formatDietary("Menú: Vegano | sin gluten", true)).toBe("Vegano, sin gluten");
  });

  it("includes other dietary info", () => {
    expect(formatDietary("Menú: Carne | alergia al huevo", true)).toBe("Carne, alergia al huevo");
  });

  it("ignores menu prefix when menuDisabled", () => {
    expect(formatDietary("Menú: Carne", false)).toBe("Menú: Carne");
  });
});
