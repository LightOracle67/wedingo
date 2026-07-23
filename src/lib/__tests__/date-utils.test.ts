import { describe, it, expect } from "vitest";
import { isDateInPast } from "../date-utils";

describe("isDateInPast", () => {
  it("returns true for past dates", () => {
    expect(isDateInPast("2020", "enero", "1")).toBe(true);
  });

  it("returns false for future dates", () => {
    const futureYear = String(new Date().getFullYear() + 1);
    expect(isDateInPast(futureYear, "enero", "1")).toBe(false);
  });

  it("returns false for invalid month", () => {
    expect(isDateInPast("2026", "invalid", "1")).toBe(false);
  });
});
