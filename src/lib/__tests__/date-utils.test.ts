import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeAge, validateWeddingDate, parseWeddingDate } from "../date-utils";

const A_VALID_CONFIG = {
  weddingDay: "15",
  weddingMonth: "junio",
  weddingYear: (new Date().getFullYear() + 1).toString(),
  weddingHour: "18",
  weddingMinute: "30",
};

describe("computeAge", () => {
  it("returns null for empty input", () => {
    expect(computeAge("")).toBeNull();
    expect(computeAge(null)).toBeNull();
    expect(computeAge(undefined)).toBeNull();
  });

  it("computes age correctly for a known date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00"));
    expect(computeAge("1990-01-15")).toBe(36);
    vi.useRealTimers();
  });

  it("accounts for birthday not yet occurred this year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00"));
    expect(computeAge("1990-12-25")).toBe(35);
    vi.useRealTimers();
  });

  it("returns 0 for birth year = current year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00"));
    expect(computeAge("2026-07-19")).toBe(0);
    vi.useRealTimers();
  });
});

describe("validateWeddingDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for valid config", () => {
    const config = {
      weddingDay: "15",
      weddingMonth: "junio",
      weddingYear: "2027",
      weddingHour: "18",
      weddingMinute: "30",
    };
    expect(validateWeddingDate(config, 2030, new Set(), false)).toBeNull();
  });

  it("returns error when required fields missing and details not hidden", () => {
    expect(validateWeddingDate({}, 2030, new Set(), false)).toBe("errors.dateIncomplete");
  });

  it("returns null when details hidden and hasStoredConfig", () => {
    expect(validateWeddingDate({}, 2030, new Set(["details"]), true)).toBeNull();
  });

  it("returns dayInvalid for day out of range", () => {
    expect(validateWeddingDate({ ...A_VALID_CONFIG, weddingDay: "32" }, 2030, new Set(), false)).toBe("errors.dayInvalid");
    expect(validateWeddingDate({ ...A_VALID_CONFIG, weddingDay: "0" }, 2030, new Set(), false)).toBe("errors.dayInvalid");
    expect(validateWeddingDate({ ...A_VALID_CONFIG, weddingDay: "abc" }, 2030, new Set(), false)).toBe("errors.dayInvalid");
  });

  it("returns monthInvalid for invalid month", () => {
    expect(validateWeddingDate({ ...A_VALID_CONFIG, weddingMonth: "fake" }, 2030, new Set(), false)).toBe("errors.monthInvalid");
  });

  it("returns hourInvalid for hour out of range", () => {
    expect(validateWeddingDate({ ...A_VALID_CONFIG, weddingHour: "24" }, 2030, new Set(), false)).toBe("errors.hourInvalid");
    expect(validateWeddingDate({ ...A_VALID_CONFIG, weddingHour: "-1" }, 2030, new Set(), false)).toBe("errors.hourInvalid");
  });

  it("returns minuteInvalid for minute out of range", () => {
    expect(validateWeddingDate({ ...A_VALID_CONFIG, weddingMinute: "60" }, 2030, new Set(), false)).toBe("errors.minuteInvalid");
    expect(validateWeddingDate({ ...A_VALID_CONFIG, weddingMinute: "-1" }, 2030, new Set(), false)).toBe("errors.minuteInvalid");
  });

  it("returns yearTooFar when year exceeds max", () => {
    expect(validateWeddingDate({ ...A_VALID_CONFIG, weddingYear: "2035" }, 2030, new Set(), false)).toBe("errors.yearTooFar");
  });
});

describe("parseWeddingDate", () => {
  it("returns null for missing required fields", () => {
    expect(parseWeddingDate({})).toBeNull();
    expect(parseWeddingDate({ weddingDay: "15", weddingMonth: "junio" })).toBeNull();
  });

  it("returns null for invalid month", () => {
    expect(parseWeddingDate({ weddingDay: "15", weddingMonth: "fake", weddingYear: "2026" })).toBeNull();
  });

  it("parses valid config to Date", () => {
    const date = parseWeddingDate({ weddingDay: "15", weddingMonth: "junio", weddingYear: "2026", weddingHour: "18", weddingMinute: "30" });
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(18);
    expect(date.getMinutes()).toBe(30);
  });

  it("defaults hour/minute to 0", () => {
    const date = parseWeddingDate({ weddingDay: "1", weddingMonth: "enero", weddingYear: "2026" });
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });
});
