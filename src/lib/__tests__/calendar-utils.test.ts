import { describe, it, expect, vi } from "vitest";
import { buildGoogleCalendarUrl } from "../calendar-utils";

describe("buildGoogleCalendarUrl", () => {
  it("builds a valid Google Calendar URL", () => {
    const startDate = new Date("2026-06-15T18:00:00");
    const endDate = new Date("2026-06-15T23:00:00");

    const url = buildGoogleCalendarUrl({
      title: "Boda de Juan y María",
      description: "Ven a celebrar con nosotros",
      place: "Iglesia San José, Madrid",
      startDate,
      endDate,
    });

    expect(url).toContain("https://calendar.google.com/calendar/render?");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("Boda+de+Juan+y+Mar%C3%ADa");
    expect(url).toContain("Ven+a+celebrar+con+nosotros");
    expect(url).toContain("Iglesia+San+Jos%C3%A9%2C+Madrid");
    expect(url).toContain("20260615T180000");
    expect(url).toContain("20260615T230000");
    expect(url).toContain("ctz=");
  });

  it("handles single-digit month and day padding", () => {
    const startDate = new Date("2026-01-05T09:00:00");
    const endDate = new Date("2026-01-05T10:00:00");

    const url = buildGoogleCalendarUrl({
      title: "Event", description: "", place: "",
      startDate, endDate,
    });

    expect(url).toContain("20260105T090000");
    expect(url).toContain("20260105T100000");
  });

  it("includes timezone from Intl", () => {
    const startDate = new Date("2026-06-15T18:00:00");
    const endDate = new Date("2026-06-15T23:00:00");

    const url = buildGoogleCalendarUrl({
      title: "Test", description: "", place: "",
      startDate, endDate,
    });

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
    expect(url).toContain(encodeURIComponent(tz));
  });

  it("generates a URL with all params", () => {
    const startDate = new Date("2026-12-25T18:30:00");
    const endDate = new Date("2026-12-25T23:00:00");
    const url = buildGoogleCalendarUrl({
      title: "Test Event", description: "", place: "Test Place",
      startDate, endDate,
    });
    expect(url).toContain("https://calendar.google.com");
    expect(url).toContain("Test+Event");
    expect(url).toContain("Test+Place");
  });

  it("handles missing time gracefully", () => {
    const startDate = new Date("2026-12-25");
    const endDate = new Date("2026-12-25");
    const url = buildGoogleCalendarUrl({
      title: "Event", description: "", place: "Place",
      startDate, endDate,
    });
    expect(url).toContain("calendar.google.com");
  });

  it("encodes special characters in title and description", () => {
    const startDate = new Date("2026-06-15T18:00:00");
    const endDate = new Date("2026-06-15T23:00:00");
    const url = buildGoogleCalendarUrl({
      title: "Test & Special <Chars>",
      description: "Desc with üñíçødé",
      place: "",
      startDate, endDate,
    });
    expect(url).toContain("Test+%26+Special+%3CChars%3E");
    expect(url).toContain("Desc+with+%C3%BC%C3%B1%C3%AD%C3%A7%C3%B8d%C3%A9");
  });

  it("works with minimal empty fields", () => {
    const startDate = new Date("2026-06-15T18:00:00");
    const endDate = new Date("2026-06-15T23:00:00");
    const url = buildGoogleCalendarUrl({
      title: "",
      description: "",
      place: "",
      startDate, endDate,
    });
    expect(url).toContain("https://calendar.google.com/calendar/render?");
  });

  it("falls back to Europe/Madrid when Intl timezone is unavailable", () => {
    const originalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = vi.fn().mockReturnValue({
      resolvedOptions: () => ({ timeZone: "" }),
    }) as unknown as typeof Intl.DateTimeFormat;

    const startDate = new Date("2026-06-15T18:00:00");
    const endDate = new Date("2026-06-15T23:00:00");
    const url = buildGoogleCalendarUrl({
      title: "Test", description: "", place: "",
      startDate, endDate,
    });

    expect(url).toContain(encodeURIComponent("Europe/Madrid"));

    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  it("generates correct date format with midnight time", () => {
    const startDate = new Date("2026-06-15T00:00:00");
    const endDate = new Date("2026-06-16T00:00:00");
    const url = buildGoogleCalendarUrl({
      title: "All day", description: "", place: "",
      startDate, endDate,
    });
    expect(url).toContain("20260615T000000");
    expect(url).toContain("20260616T000000");
  });
});
