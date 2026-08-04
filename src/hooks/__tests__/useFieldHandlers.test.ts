import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFieldHandlers } from "../useFieldHandlers";

function setup() {
  const updateFormField = vi.fn();
  const maxAllowedYear = 2030;
  const { result } = renderHook(() => useFieldHandlers(updateFormField, maxAllowedYear));
  return { updateFormField, maxAllowedYear, result };
}

describe("handleDayChange", () => {
  it("clamps to 1..31", () => {
    const { updateFormField, result } = setup();
    result.current.handleDayChange("0");
    expect(updateFormField).toHaveBeenCalledWith("weddingDay", "1");
    result.current.handleDayChange("32");
    expect(updateFormField).toHaveBeenCalledWith("weddingDay", "31");
    result.current.handleDayChange("15");
    expect(updateFormField).toHaveBeenCalledWith("weddingDay", "15");
  });

  it("removes non-digits, limits to 2 chars", () => {
    const { updateFormField, result } = setup();
    result.current.handleDayChange("abc1d2e");
    expect(updateFormField).toHaveBeenCalledWith("weddingDay", "12");
  });

  it("clears field on empty input", () => {
    const { updateFormField, result } = setup();
    result.current.handleDayChange("");
    expect(updateFormField).toHaveBeenCalledWith("weddingDay", "");
  });
});

describe("handleTimeChange", () => {
  it("stores a full HH:MM value split into hour and minute", () => {
    const { updateFormField, result } = setup();
    result.current.handleTimeChange("14:30");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "14");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "30");
  });

  it("clamps hour to 0..23 and minute to 0..59", () => {
    const { updateFormField, result } = setup();
    result.current.handleTimeChange("24:70");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "23");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "59");
  });

  it("pads single digits with 0", () => {
    const { updateFormField, result } = setup();
    result.current.handleTimeChange("5:05");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "05");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "05");
  });

  it("clears both fields on empty input", () => {
    const { updateFormField, result } = setup();
    result.current.handleTimeChange("");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "");
  });

  it("keeps hour empty when the hour part is missing", () => {
    const { updateFormField, result } = setup();
    result.current.handleTimeChange(":30");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "30");
  });

  it("keeps minute empty when the minute part is missing", () => {
    const { updateFormField, result } = setup();
    result.current.handleTimeChange("14:");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "14");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "");
  });
});

describe("handleTimeBlur", () => {
  it("normalizes the same way as handleTimeChange", () => {
    const { updateFormField, result } = setup();
    result.current.handleTimeBlur("9:45");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "09");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "45");
  });
});

describe("handleYearChange", () => {
  it("limits to 4 digits", () => {
    const { updateFormField, result } = setup();
    result.current.handleYearChange("20260");
    expect(updateFormField).toHaveBeenCalledWith("weddingYear", "2026");
  });

  it("caps at maxAllowedYear", () => {
    const { updateFormField, result } = setup();
    result.current.handleYearChange("2035");
    expect(updateFormField).toHaveBeenCalledWith("weddingYear", "2030");
  });

  it("passes through partial year", () => {
    const { updateFormField, result } = setup();
    result.current.handleYearChange("202");
    expect(updateFormField).toHaveBeenCalledWith("weddingYear", "202");
  });

  it("clears field on empty input", () => {
    const { updateFormField, result } = setup();
    result.current.handleYearChange("");
    expect(updateFormField).toHaveBeenCalledWith("weddingYear", "");
  });
});

