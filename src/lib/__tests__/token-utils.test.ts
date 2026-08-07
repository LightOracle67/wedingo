import { describe, it, expect, vi, afterEach } from "vitest";
import { generateSetupToken, normalizeTokenValue, generateInviteToken } from "../token-utils";

/** Mock determinista de crypto.getRandomValues (getter no escribible en Node:
 * la asignación directa falla en silencio y deja la rama de bytes inválidos
 * sin cubrir de forma aleatoria). Se usa vi.stubGlobal para garantizar que
 * el override se aplica siempre y que ambos caminos del generador se cubren. */
const mockRandomValues = (arr: Uint8Array, valueForIndex: (i: number) => number) => {
  for (let i = 0; i < arr.length; i++) arr[i] = valueForIndex(i);
  return arr;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    vi.stubGlobal("crypto", { ...crypto, getRandomValues: (arr: Uint8Array) => mockRandomValues(arr, () => 255) });
    const token = generateSetupToken();
    expect(typeof token).toBe("string");
  });

  it("skips invalid bytes and accepts valid ones", () => {
    vi.stubGlobal("crypto", {
      ...crypto,
      getRandomValues: (arr: Uint8Array) => mockRandomValues(arr, (i) => (i % 2 === 0 ? 10 : 255)),
    });
    const token = generateSetupToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });
});

describe("generateInviteToken with edge cases", () => {
  it("skips invalid random bytes deterministically", () => {
    vi.stubGlobal("crypto", {
      ...crypto,
      getRandomValues: (arr: Uint8Array) => mockRandomValues(arr, (i) => (i % 2 === 0 ? 10 : 255)),
    });
    const token = generateInviteToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
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
