import { describe, it, expect } from "vitest";
import { calcRSVPSummary, getDietarySummary } from "../admin-utils";

describe("calcRSVPSummary", () => {
  it("returns zeros for null", () => {
    expect(calcRSVPSummary(null)).toEqual({
      confirmed: 0, declined: 0, pending: 0, totalGuests: 0, confirmedGuests: 0, allEntries: 0,
    });
  });

  it("returns zeros for undefined", () => {
    expect(calcRSVPSummary(undefined)).toEqual({
      confirmed: 0, declined: 0, pending: 0, totalGuests: 0, confirmedGuests: 0, allEntries: 0,
    });
  });

  it("returns zeros for empty array", () => {
    expect(calcRSVPSummary([])).toEqual({
      confirmed: 0, declined: 0, pending: 0, totalGuests: 0, confirmedGuests: 0, allEntries: 0,
    });
  });

  it("counts confirmed entries", () => {
    const entries = [
      { attendance: "yes", companions: 2 },
      { attendance: "yes", companions: 1 },
    ];
    const result = calcRSVPSummary(entries);
    expect(result.confirmed).toBe(2);
    expect(result.declined).toBe(0);
    expect(result.confirmedGuests).toBe(3);
    expect(result.totalGuests).toBe(3);
    expect(result.allEntries).toBe(2);
  });

  it("counts declined entries", () => {
    const entries = [
      { attendance: "no" },
      { attendance: "no" },
      { attendance: "yes" },
    ];
    const result = calcRSVPSummary(entries);
    expect(result.confirmed).toBe(1);
    expect(result.declined).toBe(2);
    expect(result.pending).toBe(0);
  });

  it("counts pending entries (no attendance set)", () => {
    const entries = [
      { attendance: "yes" },
      { attendance: "no" },
      {},
      { attendance: "maybe" },
    ];
    const result = calcRSVPSummary(entries);
    expect(result.pending).toBe(2);
  });

  it("handles companion parsing", () => {
    const entries = [
      { attendance: "yes", companions: 3 },
      { attendance: "yes", companions: null },
      { attendance: "yes" },
    ];
    const result = calcRSVPSummary(entries);
    expect(result.confirmedGuests).toBe(5);
    expect(result.totalGuests).toBe(5);
  });

  it("handles non-numeric companions", () => {
    const entries = [
      { attendance: "yes", companions: "abc" },
    ];
    const result = calcRSVPSummary(entries);
    expect(result.confirmedGuests).toBe(1);
  });
});

describe("getDietarySummary", () => {
  it("returns empty array for null", () => {
    expect(getDietarySummary(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(getDietarySummary(undefined)).toEqual([]);
  });

  it("returns empty array for empty entries", () => {
    expect(getDietarySummary([])).toEqual([]);
  });

  it("aggregates dietary restrictions from confirmed entries", () => {
    const entries = [
      { attendance: "yes", dietaryInfo: "Menú: Carne | sin gluten | alergia frutos secos" },
      { attendance: "yes", dietaryInfo: "Menú: Pescado | sin gluten" },
      { attendance: "no", dietaryInfo: "sin lactosa" },
    ];
    const result = getDietarySummary(entries);
    expect(result).toEqual([
      { item: "sin gluten", count: 2 },
      { item: "alergia frutos secos", count: 1 },
    ]);
  });

  it("ignores empty dietaryInfo", () => {
    const entries = [
      { attendance: "yes", dietaryInfo: "  " },
      { attendance: "yes" },
    ];
    expect(getDietarySummary(entries)).toEqual([]);
  });

  it("sorts by count descending", () => {
    const entries = [
      { attendance: "yes", dietaryInfo: "a | b | c" },
      { attendance: "yes", dietaryInfo: "a | b" },
      { attendance: "yes", dietaryInfo: "a" },
    ];
    const result = getDietarySummary(entries);
    expect(result[0].item).toBe("a");
    expect(result[0].count).toBe(3);
    expect(result[1].item).toBe("b");
    expect(result[1].count).toBe(2);
    expect(result[2].item).toBe("c");
    expect(result[2].count).toBe(1);
  });

  it("strips 'Menú:' prefix from items", () => {
    const entries = [
      { attendance: "yes", dietaryInfo: "Menú: Vegano | sin lactosa" },
    ];
    const result = getDietarySummary(entries);
    expect(result.find((r) => r.item === "vegano")).toBeUndefined();
    expect(result.find((r) => r.item === "sin lactosa")).toBeDefined();
  });
});
