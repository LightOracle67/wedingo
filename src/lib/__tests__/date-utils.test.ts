import { describe, it, expect } from "vitest";
import { isDateInPast, computeAge, validateWeddingDate, parseWeddingDate } from "../date-utils";

describe("date-utils", () => {
  it("isDateInPast returns true for past dates", () => {
    expect(isDateInPast("2020", "enero", "1")).toBe(true);
  });

  it("isDateInPast returns false for future dates", () => {
    const futureYear = String(new Date().getFullYear() + 1);
    expect(isDateInPast(futureYear, "enero", "1")).toBe(false);
  });

  it("isDateInPast returns false for invalid month", () => {
    expect(isDateInPast("2024", "notamonth", "1")).toBe(false);
  });

  it("isDateInPast returns false for today's date", () => {
    const today = new Date();
    const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    expect(isDateInPast(String(today.getFullYear()), months[today.getMonth()], String(today.getDate()))).toBe(false);
  });

  it("computeAge returns correct age for birthdate", () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 25);
    expect(computeAge(birthDate.toISOString().split("T")[0])).toBe(25);
  });

  it("computeAge returns null for empty string", () => {
    expect(computeAge("")).toBeNull();
  });

  it("computeAge handles birthday today", () => {
    const today = new Date();
    const birthDate = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
    const iso = birthDate.toISOString().split("T")[0];
    expect(computeAge(iso)).toBe(30);
  });

  it("computeAge handles birthday later this year (not yet)", () => {
    const today = new Date();
    const birthDate = new Date(today.getFullYear() - 30, today.getMonth() + 1, today.getDate());
    const iso = birthDate.toISOString().split("T")[0];
    expect(computeAge(iso)).toBe(29);
  });

  it("computeAge handles leap year birthday (Feb 29)", () => {
    expect(computeAge("2000-02-29")).toBeGreaterThanOrEqual(0);
  });

  it("validateWeddingDate returns null for valid future date", () => {
    const config = {
      weddingDay: "15",
      weddingMonth: "junio",
      weddingYear: "2099",
      weddingHour: "12",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBeNull();
  });

  it("validateWeddingDate returns error for past date", () => {
    const config = {
      weddingDay: "1",
      weddingMonth: "enero",
      weddingYear: "2020",
      weddingHour: "12",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dateBeforeToday");
  });

  it("validateWeddingDate returns incomplete error when fields missing", () => {
    const config = { weddingDay: "", weddingMonth: "", weddingYear: "", weddingHour: "", weddingMinute: "" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dateIncomplete");
  });

  it("validateWeddingDate returns day invalid for NaN", () => {
    const config = { weddingDay: "abc", weddingMonth: "junio", weddingYear: "2099", weddingHour: "12", weddingMinute: "00" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dayInvalid");
  });

  it("validateWeddingDate returns day invalid for out of range", () => {
    const config = { weddingDay: "0", weddingMonth: "junio", weddingYear: "2099", weddingHour: "12", weddingMinute: "00" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dayInvalid");
  });

  it("validateWeddingDate returns day invalid for too large day", () => {
    const config = { weddingDay: "32", weddingMonth: "junio", weddingYear: "2099", weddingHour: "12", weddingMinute: "00" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dayInvalid");
  });

  it("validateWeddingDate returns month invalid for bad month", () => {
    const config = { weddingDay: "15", weddingMonth: "fake", weddingYear: "2099", weddingHour: "12", weddingMinute: "00" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.monthInvalid");
  });

  it("validateWeddingDate returns hour invalid for NaN", () => {
    const config = { weddingDay: "15", weddingMonth: "junio", weddingYear: "2099", weddingHour: "abc", weddingMinute: "00" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.hourInvalid");
  });

  it("validateWeddingDate returns hour invalid for out of range", () => {
    const config = { weddingDay: "15", weddingMonth: "junio", weddingYear: "2099", weddingHour: "24", weddingMinute: "00" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.hourInvalid");
  });

  it("validateWeddingDate returns minute invalid for NaN", () => {
    const config = { weddingDay: "15", weddingMonth: "junio", weddingYear: "2099", weddingHour: "12", weddingMinute: "abc" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.minuteInvalid");
  });

  it("validateWeddingDate returns minute invalid for out of range", () => {
    const config = { weddingDay: "15", weddingMonth: "junio", weddingYear: "2099", weddingHour: "12", weddingMinute: "60" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.minuteInvalid");
  });

  it("validateWeddingDate returns dateNotValid for impossible date", () => {
    const config = { weddingDay: "30", weddingMonth: "febrero", weddingYear: "2099", weddingHour: "12", weddingMinute: "00" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dateNotValid");
  });

  it("validateWeddingDate returns yearTooFar for far future year", () => {
    const config = { weddingDay: "15", weddingMonth: "junio", weddingYear: "2200", weddingHour: "12", weddingMinute: "00" };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.yearTooFar");
  });

  it("validateWeddingDate skips validation when details hidden and hasStoredConfig", () => {
    const config = { weddingDay: "", weddingMonth: "", weddingYear: "", weddingHour: "", weddingMinute: "" };
    expect(validateWeddingDate(config, 2100, new Set(["details"]), true)).toBeNull();
  });

  it("parseWeddingDate returns null when required fields missing", () => {
    expect(parseWeddingDate({})).toBeNull();
  });

  it("parseWeddingDate returns null for invalid month", () => {
    expect(parseWeddingDate({ weddingDay: "15", weddingMonth: "fake", weddingYear: "2099" })).toBeNull();
  });

  it("parseWeddingDate returns Date for valid config", () => {
    const result = parseWeddingDate({ weddingDay: "15", weddingMonth: "junio", weddingYear: "2099", weddingHour: "12", weddingMinute: "30" });
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2099);
    expect(result?.getMonth()).toBe(5); // junio = 5 (0-indexed)
    expect(result?.getDate()).toBe(15);
  });

  it("parseWeddingDate defaults hour/minute to 0 when missing", () => {
    const result = parseWeddingDate({ weddingDay: "1", weddingMonth: "enero", weddingYear: "2099" });
    expect(result?.getHours()).toBe(0);
    expect(result?.getMinutes()).toBe(0);
  });
});
