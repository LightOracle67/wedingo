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

describe("generateSetupToken with edge cases", () => {
  it("returns token even when all bytes are invalid", () => {
    const origGetRandomValues = crypto.getRandomValues;
    crypto.getRandomValues = ((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = 255;
      return arr;
    }) as typeof crypto.getRandomValues;
    const token = generateSetupToken();
    expect(typeof token).toBe("string");
    crypto.getRandomValues = origGetRandomValues;
  });

  it("skips invalid bytes and accepts valid ones", () => {
    const origGetRandomValues = crypto.getRandomValues;
    crypto.getRandomValues = ((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i % 2 === 0 ? 10 : 255;
      return arr;
    }) as typeof crypto.getRandomValues;
    const token = generateSetupToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    crypto.getRandomValues = origGetRandomValues;
  });
});

describe("generateInviteToken with edge cases", () => {
  it("skips invalid random bytes deterministically", () => {
    const origGetRandomValues = crypto.getRandomValues;
    crypto.getRandomValues = ((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i % 2 === 0 ? 10 : 255;
      return arr;
    }) as typeof crypto.getRandomValues;
    const token = generateInviteToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    crypto.getRandomValues = origGetRandomValues;
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
