import { describe, it, expect } from "vitest";
import { generateSetupToken, normalizeTokenValue, generateInviteToken } from "../token-utils";

describe("generateSetupToken", () => {
  it("returns a string", () => {
    const token = generateSetupToken();
    expect(typeof token).toBe("string");
  });

  it("returns a token with dashes", () => {
    const token = generateSetupToken();
    expect(token).toContain("-");
  });

  it("returns token with groups separated by dashes", () => {
    const token = generateSetupToken();
    expect(token).toMatch(/^[A-Z0-9]{1,4}(-[A-Z0-9]{1,4})*$/);
  });
});

describe("normalizeTokenValue", () => {
  it("removes dashes and uppercases", () => {
    expect(normalizeTokenValue("abcd-efgh-1234")).toBe("ABCDEFGH1234");
  });

  it("handles null", () => {
    expect(normalizeTokenValue(null)).toBe("");
  });

  it("handles non-string", () => {
    expect(normalizeTokenValue(123)).toBe("");
  });
});

describe("generateInviteToken", () => {
  it("returns a 10-char string", () => {
    const token = generateInviteToken();
    expect(token.length).toBe(10);
  });
});
