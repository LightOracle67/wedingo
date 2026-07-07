import { describe, it, expect } from "vitest";
import { parseSectionOrder, parseHidden } from "../section-utils";

describe("parseSectionOrder", () => {
  it("returns default order for empty input", () => {
    const result = parseSectionOrder("");
    expect(result).toEqual(["hero", "details", "info", "story", "gifts", "accommodation", "gallery", "menu", "rsvp"]);
  });

  it("returns default order for null", () => {
    const result = parseSectionOrder(null);
    expect(result[0]).toBe("hero");
  });

  it("parses comma-separated string", () => {
    const result = parseSectionOrder("hero,details,story");
    expect(result.slice(0, 3)).toEqual(["hero", "details", "story"]); expect(result.length).toBe(9);
  });

  it("filters out invalid sections", () => {
    const result = parseSectionOrder("hero,invalid,details");
    expect(result.slice(0, 2)).toEqual(["hero", "details"]); expect(result.length).toBe(9);
  });

  it("preserves custom order", () => {
    const result = parseSectionOrder("hero,gifts,story,details");
    expect(result.indexOf("hero")).toBe(0);
    expect(result.indexOf("gifts")).toBe(1);
    expect(result.indexOf("story")).toBe(2);
    expect(result.indexOf("details")).toBe(3);
  });
});

describe("parseHidden", () => {
  it("returns empty set for empty string", () => {
    const result = parseHidden("");
    expect(result.size).toBe(0);
  });

  it("returns empty set for null", () => {
    const result = parseHidden(null);
    expect(result.size).toBe(0);
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
