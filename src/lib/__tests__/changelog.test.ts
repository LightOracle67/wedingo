import { describe, it, expect } from "vitest";
import { CHANGELOG } from "../changelog";

describe("changelog", () => {
  it("exports an array", () => {
    expect(Array.isArray(CHANGELOG)).toBe(true);
  });
  it("entries have required fields", () => {
    CHANGELOG.forEach((entry) => {
      expect(entry).toHaveProperty("version");
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("changes");
      expect(Array.isArray(entry.changes)).toBe(true);
    });
  });
});
