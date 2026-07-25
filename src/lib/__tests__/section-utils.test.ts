import { describe, it, expect } from "vitest";
import { parseSectionOrder, parseHidden, formatDate } from "../section-utils";

describe("parseSectionOrder", () => {
  const DEFAULT = ["hero", "details", "info", "story", "gallery", "gifts", "accommodation", "rsvp"];

  it("returns default order for undefined input", () => {
    expect(parseSectionOrder(undefined)).toEqual(DEFAULT);
  });

  it("returns default order for empty string", () => {
    expect(parseSectionOrder("")).toEqual(DEFAULT);
  });

  it("parses comma-separated string and appends missing sections", () => {
    const result = parseSectionOrder("hero,details,story");
    expect(result.slice(0, 3)).toEqual(["hero", "details", "story"]);
    expect(result.length).toBe(8);
  });

  it("filters out invalid sections", () => {
    const result = parseSectionOrder("hero,invalid,details");
    expect(result.slice(0, 2)).toEqual(["hero", "details"]);
    expect(result.length).toBe(8);
  });

  it("preserves custom order of specified sections", () => {
    const result = parseSectionOrder("gifts,story,hero");
    expect(result.indexOf("gifts")).toBeLessThan(result.indexOf("story"));
    expect(result.indexOf("story")).toBeLessThan(result.indexOf("hero"));
  });
});

describe("parseHidden", () => {
  it("returns empty set for null", () => {
    expect(parseHidden(null).size).toBe(0);
  });

  it("returns empty set for undefined", () => {
    expect(parseHidden(undefined).size).toBe(0);
  });

  it("returns empty set for empty string", () => {
    expect(parseHidden("").size).toBe(0);
  });

  it("parses single hidden section", () => {
    const result = parseHidden("gifts");
    expect(result.has("gifts")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("parses multiple hidden sections", () => {
    const result = parseHidden("gifts,accommodation,story");
    expect(result.has("gifts")).toBe(true);
    expect(result.has("accommodation")).toBe(true);
    expect(result.has("story")).toBe(true);
    expect(result.size).toBe(3);
  });

  it("trims whitespace around keys", () => {
    const result = parseHidden(" gifts , accommodation ");
    expect(result.has("gifts")).toBe(true);
    expect(result.has("accommodation")).toBe(true);
  });

  it("filters empty segments", () => {
    const result = parseHidden("gifts,,accommodation");
    expect(result.has("gifts")).toBe(true);
    expect(result.has("accommodation")).toBe(true);
    expect(result.size).toBe(2);
  });
});

describe("formatDate", () => {
  it("returns a string for valid ISO date", () => {
    const result = formatDate("2025-06-15T12:00:00");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns 'Invalid Date' for unparseable input", () => {
    const result = formatDate("not-a-date");
    expect(result).toBe("Invalid Date");
  });
});
