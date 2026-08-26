import { describe, it, expect } from "vitest";
import {
  calcRSVPSummary,
  getDietarySummary,
  buildAttendancePrediction,
  buildConfirmationsPerDay,
} from "../admin-utils";

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
});

describe("buildAttendancePrediction", () => {
  const now = Date.parse("2026-08-17T12:00:00");
  const entry = (attendance: "yes" | "no", companions: number, submittedAt: number) => ({
    attendance,
    companions,
    submittedAt,
  });

  const base = (wedding = Date.parse("2026-10-01T12:00:00")) => {
    const entries = [
      entry("yes", 2, now - 20 * 86400000),
      entry("yes", 1, now - 15 * 86400000),
      entry("yes", 1, now - 3 * 86400000),
    ];
    return { entries, wedding };
  };

  it("computes confirmed people and a projected total above current", () => {
    const { entries, wedding } = base();
    const r = buildAttendancePrediction(entries, 100, wedding, now);
    expect(r.confirmedPeople).toBe(4); // 3 respuestas "yes": 2+1+1
    expect(r.projected).toBeGreaterThanOrEqual(4);
    expect(r.hasFutureWedding).toBe(true);
    expect(r.daysToWedding).toBeGreaterThan(0);
    expect(r.capacityPct).toBe(4);
  });

  it("caps the projection at 110% of expected capacity", () => {
    const { entries, wedding } = base();
    const r = buildAttendancePrediction(entries, 5, wedding, now);
    expect(r.projected).toBeLessThanOrEqual(Math.ceil(5 * 1.1));
  });

  it("does not divide by zero with an empty list", () => {
    const r = buildAttendancePrediction([], 0, Date.parse("2026-10-01"), now);
    expect(r.confirmedPeople).toBe(0);
    expect(r.projected).toBe(0);
    expect(r.capacityPct).toBeNull();
  });

  it("returns the current people when the wedding already passed", () => {
    const { entries } = base();
    const r = buildAttendancePrediction(entries, 100, now - 86400000, now);
    expect(r.projected).toBe(r.confirmedPeople);
    expect(r.hasFutureWedding).toBe(false);
  });

  it("handles timestamps in seconds and invalid values", () => {
    const entries = [
      entry("yes", 2, (now - 10 * 86400000) / 1000), // en segundos
      entry("yes", 1, Number.NaN), // inválido: se ignora
    ];
    const r = buildAttendancePrediction(entries, 50, Date.parse("2026-10-01"), now);
    expect(r.confirmedPeople).toBe(3);
    expect(r.pacePerDay).toBeGreaterThan(0);
  });

  it("reports a trend among up/down/flat", () => {
    const { entries } = base();
    const r = buildAttendancePrediction(entries, 100, Date.parse("2026-10-01"), now);
    expect(["up", "down", "flat"]).toContain(r.trend);
  });
});

describe("buildConfirmationsPerDay", () => {
  const now = Date.parse("2026-08-17T12:00:00");
  // `now` es mediodía: restar días enteros mantiene la hora fija (12:00).
  const dayTs = (daysAgo: number, extraHours = 0) => now - daysAgo * 86400000 + extraHours * 3600000;

  it("returns a series of 14 consecutive days ending today", () => {
    const series = buildConfirmationsPerDay([], 14, now);
    expect(series).toHaveLength(14);
    expect(series[13]!.day).toBe("08-17");
  });

  it("counts only 'yes' confirmations and groups them by day", () => {
    const entries = [
      { attendance: "yes", submittedAt: dayTs(2) },
      { attendance: "yes", submittedAt: dayTs(2, 8) }, // mismo día (20:00)
      { attendance: "no", submittedAt: dayTs(1) }, // no cuenta
      { attendance: "yes", submittedAt: dayTs(0) },
    ];
    const series = buildConfirmationsPerDay(entries, 14, now);
    const twoDaysAgo = series.find((d) => d.day === "08-15");
    const today = series[13]!;
    expect(twoDaysAgo?.count).toBe(2);
    expect(today.count).toBe(1);
  });

  it("handles timestamps in seconds and invalid values", () => {
    const entries = [
      { attendance: "yes", submittedAt: dayTs(3) / 1000 }, // segundos
      { attendance: "yes", submittedAt: Number.NaN },
      { attendance: "yes", submittedAt: undefined },
    ];
    const series = buildConfirmationsPerDay(entries, 14, now);
    const threeDaysAgo = series.find((d) => d.day === "08-14");
    expect(threeDaysAgo?.count).toBe(1);
  });

  it("ignores future and very old entries", () => {
    const entries = [
      { attendance: "yes", submittedAt: now + 86400000 }, // futuro
      { attendance: "yes", submittedAt: now - 30 * 86400000 }, // fuera de 14 días
      { attendance: "yes", submittedAt: dayTs(5) },
    ];
    const series = buildConfirmationsPerDay(entries, 14, now);
    const total = series.reduce((s, d) => s + d.count, 0);
    expect(total).toBe(1);
  });
});
