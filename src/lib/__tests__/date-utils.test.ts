import { describe, it, expect } from "vitest";
import { validateWeddingDate } from "../date-utils";

describe("date-utils", () => {

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
    const config = {
      weddingDay: "abc",
      weddingMonth: "junio",
      weddingYear: "2099",
      weddingHour: "12",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dayInvalid");
  });

  it("validateWeddingDate returns day invalid for out of range", () => {
    const config = {
      weddingDay: "0",
      weddingMonth: "junio",
      weddingYear: "2099",
      weddingHour: "12",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dayInvalid");
  });

  it("validateWeddingDate returns day invalid for too large day", () => {
    const config = {
      weddingDay: "32",
      weddingMonth: "junio",
      weddingYear: "2099",
      weddingHour: "12",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dayInvalid");
  });

  it("validateWeddingDate returns month invalid for bad month", () => {
    const config = {
      weddingDay: "15",
      weddingMonth: "fake",
      weddingYear: "2099",
      weddingHour: "12",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.monthInvalid");
  });

  it("validateWeddingDate returns hour invalid for NaN", () => {
    const config = {
      weddingDay: "15",
      weddingMonth: "junio",
      weddingYear: "2099",
      weddingHour: "abc",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.hourInvalid");
  });

  it("validateWeddingDate returns hour invalid for out of range", () => {
    const config = {
      weddingDay: "15",
      weddingMonth: "junio",
      weddingYear: "2099",
      weddingHour: "24",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.hourInvalid");
  });

  it("validateWeddingDate returns minute invalid for NaN", () => {
    const config = {
      weddingDay: "15",
      weddingMonth: "junio",
      weddingYear: "2099",
      weddingHour: "12",
      weddingMinute: "abc",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.minuteInvalid");
  });

  it("validateWeddingDate returns minute invalid for out of range", () => {
    const config = {
      weddingDay: "15",
      weddingMonth: "junio",
      weddingYear: "2099",
      weddingHour: "12",
      weddingMinute: "60",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.minuteInvalid");
  });

  it("validateWeddingDate returns dateNotValid for impossible date", () => {
    const config = {
      weddingDay: "30",
      weddingMonth: "febrero",
      weddingYear: "2099",
      weddingHour: "12",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.dateNotValid");
  });

  it("validateWeddingDate returns yearTooFar for far future year", () => {
    const config = {
      weddingDay: "15",
      weddingMonth: "junio",
      weddingYear: "2200",
      weddingHour: "12",
      weddingMinute: "00",
    };
    expect(validateWeddingDate(config, 2100, new Set(), false)).toBe("errors.yearTooFar");
  });

  it("validateWeddingDate skips validation when details hidden and hasStoredConfig", () => {
    const config = { weddingDay: "", weddingMonth: "", weddingYear: "", weddingHour: "", weddingMinute: "" };
    expect(validateWeddingDate(config, 2100, new Set(["details"]), true)).toBeNull();
  });
});
