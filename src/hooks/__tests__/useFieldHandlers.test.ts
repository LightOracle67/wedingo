import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFieldHandlers } from "../useFieldHandlers";

function setup() {
  const updateFormField = vi.fn();
  const maxAllowedYear = 2030;
  const { result } = renderHook(() => useFieldHandlers(updateFormField, maxAllowedYear, "30"));
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

describe("handleHourChange", () => {
  it("clamps to 0..23", () => {
    const { updateFormField, result } = setup();
    result.current.handleHourChange("24");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "23");
    result.current.handleHourChange("-1");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "1");
    result.current.handleHourChange("18");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "18");
  });

  it("clears field on empty input", () => {
    const { updateFormField, result } = setup();
    result.current.handleHourChange("");
    expect(updateFormField).toHaveBeenCalledWith("weddingHour", "");
  });
});

describe("handleMinuteChange", () => {
  it("clamps to 0..59", () => {
    const { updateFormField, result } = setup();
    result.current.handleMinuteChange("60");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "59");
    result.current.handleMinuteChange("30");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "30");
  });

  it("passes through single digit without padding", () => {
    const { updateFormField, result } = setup();
    result.current.handleMinuteChange("5");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "5");
  });

  it("pads single digit with 0 when length is 2", () => {
    const { updateFormField, result } = setup();
    result.current.handleMinuteChange("05");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "05");
    result.current.handleMinuteChange("1");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "1");
  });

  it("clears field on empty input", () => {
    const { updateFormField, result } = setup();
    result.current.handleMinuteChange("");
    expect(updateFormField).toHaveBeenCalledWith("weddingMinute", "");
  });
});

describe("handleMinuteBlur", () => {
  it("pads single digit minute with 0", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useFieldHandlers(fn, 2030, "5"));
    result.current.handleMinuteBlur();
    expect(fn).toHaveBeenCalledWith("weddingMinute", "05");
  });

  it("clamps to 59", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useFieldHandlers(fn, 2030, "70"));
    result.current.handleMinuteBlur();
    expect(fn).toHaveBeenCalledWith("weddingMinute", "59");
  });

  it("clears field for non-numeric", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useFieldHandlers(fn, 2030, "abc"));
    result.current.handleMinuteBlur();
    expect(fn).toHaveBeenCalledWith("weddingMinute", "");
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

describe("handleCoordinateChange", () => {
  it("replaces commas with dots", () => {
    const { updateFormField, result } = setup();
    result.current.handleCoordinateChange("weddingLatitude", "40,5");
    expect(updateFormField).toHaveBeenCalledWith("weddingLatitude", "40.5");
  });

  it("strips non-numeric chars except dot and minus", () => {
    const { updateFormField, result } = setup();
    result.current.handleCoordinateChange("weddingLongitude", "abc-3.7xyz");
    expect(updateFormField).toHaveBeenCalledWith("weddingLongitude", "-3.7");
  });

  it("limits to 18 chars", () => {
    const { updateFormField, result } = setup();
    result.current.handleCoordinateChange("weddingLatitude", "12345678901234567890");
    expect(updateFormField).toHaveBeenCalledWith("weddingLatitude", "123456789012345678");
  });
});
