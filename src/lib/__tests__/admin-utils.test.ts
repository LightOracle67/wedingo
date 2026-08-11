import { describe, it, expect } from "vitest";
import { calcRSVPSummary, getDietarySummary, buildRSVPSheet, buildMenuSheet } from "../admin-utils";

describe("calcRSVPSummary", () => {
  it("returns zeros for null", () => {
    expect(calcRSVPSummary(null)).toEqual({
      confirmed: 0,
      declined: 0,
      pending: 0,
      totalGuests: 0,
      confirmedGuests: 0,
      allEntries: 0,
    });
  });

  it("returns zeros for undefined", () => {
    expect(calcRSVPSummary(undefined)).toEqual({
      confirmed: 0,
      declined: 0,
      pending: 0,
      totalGuests: 0,
      confirmedGuests: 0,
      allEntries: 0,
    });
  });

  it("returns zeros for empty array", () => {
    expect(calcRSVPSummary([])).toEqual({
      confirmed: 0,
      declined: 0,
      pending: 0,
      totalGuests: 0,
      confirmedGuests: 0,
      allEntries: 0,
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
    const entries = [{ attendance: "no" }, { attendance: "no" }, { attendance: "yes" }];
    const result = calcRSVPSummary(entries);
    expect(result.confirmed).toBe(1);
    expect(result.declined).toBe(2);
    expect(result.pending).toBe(0);
  });

  it("counts pending entries (no attendance set)", () => {
    const entries: Parameters<typeof calcRSVPSummary>[0] = [
      { attendance: "yes" },
      { attendance: "no" },
      {} as { attendance: string; companions?: number },
      { attendance: "maybe" },
    ];
    const result = calcRSVPSummary(entries);
    expect(result.pending).toBe(2);
  });

  it("handles companion parsing", () => {
    const entries: Parameters<typeof calcRSVPSummary>[0] = [
      { attendance: "yes", companions: 3 },
      { attendance: "yes", companions: null as unknown as number },
      { attendance: "yes" },
    ];
    const result = calcRSVPSummary(entries);
    expect(result.confirmedGuests).toBe(5);
    expect(result.totalGuests).toBe(5);
  });

  it("handles non-numeric companions", () => {
    const entries: Parameters<typeof calcRSVPSummary>[0] = [
      { attendance: "yes", companions: "abc" as unknown as number },
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
    const entries = [{ attendance: "yes", dietaryInfo: "  " }, { attendance: "yes" }];
    expect(getDietarySummary(entries)).toEqual([]);
  });

  it("sorts by count descending", () => {
    const entries = [
      { attendance: "yes", dietaryInfo: "a | b | c" },
      { attendance: "yes", dietaryInfo: "a | b" },
      { attendance: "yes", dietaryInfo: "a" },
    ];
    const result = getDietarySummary(entries);
    expect(result[0]!.item).toBe("a");
    expect(result[0]!.count).toBe(3);
    expect(result[1]!.item).toBe("b");
    expect(result[1]!.count).toBe(2);
    expect(result[2]!.item).toBe("c");
    expect(result[2]!.count).toBe(1);
  });

  it("strips 'Menú:' prefix from items", () => {
    const entries = [{ attendance: "yes", dietaryInfo: "Menú: Vegano | sin lactosa" }];
    const result = getDietarySummary(entries);
    expect(result.find((r) => r.item === "vegano")).toBeUndefined();
    expect(result.find((r) => r.item === "sin lactosa")).toBeDefined();
  });

  it("handles entries with non-zero companions and attendance no", () => {
    const entries = [{ attendance: "no", companions: 3 }];
    const result = calcRSVPSummary(entries);
    expect(result.totalGuests).toBe(0);
    expect(result.confirmed).toBe(0);
    expect(result.declined).toBe(1);
  });

  it("handles entries with null companions", () => {
    const entries = [{ attendance: "yes", companions: null as unknown as number }];
    const result = calcRSVPSummary(entries);
    expect(result.confirmedGuests).toBe(1);
  });

  it("filters out empty segments in dietary info", () => {
    const entries = [{ attendance: "yes", dietaryInfo: "sin gluten |  | alergia" }];
    const result = getDietarySummary(entries);
    expect(result).toEqual([
      { item: "sin gluten", count: 1 },
      { item: "alergia", count: 1 },
    ]);
  });

  it("buildRSVPSheet builds a sheet with translated attendance and menus", () => {
    const t = (key: string) =>
      key === "attendance.attendingValue" ? "Sí" : key === "attendance.notAttendingValue" ? "No" : key === "rsvp.menuCarne" ? "Carne" : key;
    const sheet = buildRSVPSheet(
      [
        {
          guestName: "Ana, la novia",
          attendance: "yes",
          mealChoice: "carne",
          dietaryInfo: "sin gluten",
          transportMode: "bus",
          birthDate: "2000-01-01",
          submittedAt: "2026-08-01T10:00:00",
        },
        { guestName: "Pedro", attendance: "no" },
      ],
      t,
    );
    expect(sheet.name).toBe("attendance.sheetAttendance");
    expect(sheet.headers).toContain("attendance.tableName");
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[0]).toContain("Ana, la novia");
    expect(sheet.rows[0]).toContain("Sí");
    expect(sheet.rows[0]).toContain("Carne");
    expect(sheet.rows[0]).toContain("sin gluten");
    expect(sheet.rows[0]).toContain("(bus)");
    expect(sheet.rows[1]).toContain("No");
  });
});

describe("buildMenuSheet", () => {
  it("lists each guest and their attendees with the chosen dish", () => {
    const t = (key: string) => key;
    const sheet = buildMenuSheet(
      [
        {
          guestName: "Ana",
          attendance: "yes",
          attendees: [
            { name: "Ana", menu: "carne" },
            { name: "Luis", menu: "pescado" },
          ],
        },
        { guestName: "Solo", attendance: "yes", mealChoice: "vegano" },
        { guestName: "Ausente", attendance: "no", mealChoice: "carne" },
      ],
      t,
    );
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[0]).toEqual(["Ana", "carne"]);
    expect(sheet.rows[1]).toEqual(["Luis", "pescado"]);
    expect(sheet.rows[2]).toEqual(["Solo", "vegano"]);
  });
});
