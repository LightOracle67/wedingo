import { describe, it, expect } from "vitest";
import { isDateInPast, computeAge, validateWeddingDate } from "../date-utils";

describe("date-utils", () => {
  it("isDateInPast returns true for past dates", () => {
    expect(isDateInPast("2020", "enero", "1")).toBe(true);
  });

  it("isDateInPast returns false for future dates", () => {
    const futureYear = String(new Date().getFullYear() + 1);
    expect(isDateInPast(futureYear, "enero", "1")).toBe(false);
  });

  it("computeAge returns correct age for birthdate", () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 25);
    expect(computeAge(birthDate.toISOString().split("T")[0])).toBe(25);
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
});
