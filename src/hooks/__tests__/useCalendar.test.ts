import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../lib/calendar-utils", () => ({
  buildGoogleCalendarUrl: vi.fn(
    () => "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Test",
  ),
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
    const { result } = renderHook(() =>
      useCalendar({ ...sampleConfig, weddingHour: "", weddingMinute: "" }),
    );
    expect(result.current.formattedTime).toBe("");
  });

  it("returns null calendarLink for invalid dates", () => {
    const { result } = renderHook(() =>
      useCalendar({ ...sampleConfig, weddingDay: "32" }),
    );
    expect(result.current.calendarLink).toBeNull();
  });

  it("handles unknown month format (fallback)", () => {
    const { result } = renderHook(() =>
      useCalendar({ ...sampleConfig, weddingMonth: "invalidmonth" }),
    );
    expect(result.current.formattedDate).toContain("de");
    expect(result.current.calendarLink).toBeNull();
  });
});
