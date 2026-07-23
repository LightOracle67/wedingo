import { describe, it, expect } from "vitest";
import { normalizeTokenValue } from "../token-utils";

describe("normalizeTokenValue extra", () => {
  it("removes special characters", () => {
    expect(normalizeTokenValue("abc-def_ghi!@#")).toBe("ABCDEFGHI");
  });

  it("handles already clean input", () => {
    expect(normalizeTokenValue("ABCDEFGH1234")).toBe("ABCDEFGH1234");
  });
});
