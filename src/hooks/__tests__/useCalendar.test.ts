import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockBuildGoogleCalendarUrl = vi.hoisted(() =>
  vi.fn(() => "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Test"),
);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../lib/calendar-utils", () => ({
  buildGoogleCalendarUrl: mockBuildGoogleCalendarUrl,
}));

import { useCalendar } from "../useCalendar";

const sampleConfig = {
  weddingDay: "15",
  weddingMonth: "junio",
  weddingYear: "2026",
  weddingHour: "17",
  weddingMinute: "00",
  weddingPlace: "Church",
  weddingLatitude: "",
  weddingLongitude: "",
  firstName: "Alice",
  secondName: "Bob",
};

describe("useCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns formatted date string", () => {
    const { result } = renderHook(() => useCalendar(sampleConfig));
    expect(result.current.formattedDate).toMatch(/June 15, 2026/);
  });

  it("returns formatted time string (24h format)", () => {
    const { result } = renderHook(() => useCalendar(sampleConfig));
    expect(result.current.formattedTime).toBe("17:00");
  });

  it("generates calendar link", () => {
    const { result } = renderHook(() => useCalendar(sampleConfig));
    expect(result.current.calendarLink).toBeTruthy();
    expect(result.current.calendarLink).toContain("calendar.google.com");
  });

  it("handles missing date fields", () => {
    const { result } = renderHook(() =>
      useCalendar({ ...sampleConfig, weddingDay: "", weddingMonth: "", weddingYear: "" }),
    );
    expect(result.current.formattedDate).toBe("");
    expect(result.current.calendarLink).toBeNull();
  });

  it("handles missing time fields", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingHour: "", weddingMinute: "" }));
    expect(result.current.formattedTime).toBe("");
  });

  it("returns null calendarLink for invalid dates", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingDay: "32" }));
    expect(result.current.calendarLink).toBeNull();
  });

  it("handles unknown month format (fallback)", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingMonth: "invalidmonth" }));
    expect(result.current.formattedDate).toContain("de");
    expect(result.current.calendarLink).toBeNull();
  });

  it("handles missing day only", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingDay: "" }));
    expect(result.current.formattedDate).toBe("");
    expect(result.current.calendarLink).toBeNull();
  });

  it("handles missing month only", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingMonth: "" }));
    expect(result.current.formattedDate).toBe("");
    expect(result.current.calendarLink).toBeNull();
  });

  it("handles missing year only", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingYear: "" }));
    expect(result.current.formattedDate).toBe("");
    expect(result.current.calendarLink).toBeNull();
  });

  it("handles missing hour only", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingHour: "" }));
    expect(result.current.formattedTime).toBe("");
    expect(result.current.calendarLink).toBeNull();
  });

  it("handles missing minute only", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingMinute: "" }));
    expect(result.current.formattedTime).toBe("");
    expect(result.current.calendarLink).toBeNull();
  });

  it("handles empty names falling back to default title", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, firstName: "", secondName: "" }));
    expect(result.current.calendarLink).toBeTruthy();
  });

  it("handles missing place", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingPlace: "" }));
    expect(result.current.calendarLink).toBeTruthy();
  });

  it("pads time with leading zeros", () => {
    const { result } = renderHook(() => useCalendar({ ...sampleConfig, weddingHour: "5", weddingMinute: "7" }));
    expect(result.current.formattedTime).toBe("05:07");
  });

  it("falls back to es locale when navigator.language is missing", () => {
    const origLang = navigator.language;
    Object.defineProperty(navigator, "language", { value: "", configurable: true });
    const { result } = renderHook(() => useCalendar(sampleConfig));
    expect(result.current.formattedDate).toBeTruthy();
    Object.defineProperty(navigator, "language", { value: origLang, configurable: true });
  });

  it("includes place in description when weddingPlace is set", () => {
    renderHook(() => useCalendar(sampleConfig));
    expect(mockBuildGoogleCalendarUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("calendar.placeLabel"),
      }),
    );
  });
});
