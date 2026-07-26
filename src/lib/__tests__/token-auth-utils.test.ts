import { describe, it, expect } from "vitest";
import { createNewToken, isTokenValid } from "../token-auth-utils";

describe("token-auth-utils", () => {
  it("createNewToken returns object with raw and normalized", () => {
    const result = createNewToken();
    expect(result).toHaveProperty("raw");
    expect(result).toHaveProperty("normalized");
    expect(result.normalized.length).toBeGreaterThan(0);
  });

  it("isTokenValid returns true for long tokens", () => {
    expect(isTokenValid("ABCDEFGHIJKLMNOPQRST")).toBe(true);
  });

  it("isTokenValid returns false for short tokens", () => {
    expect(isTokenValid("short")).toBe(false);
  });

  it("createNewToken returns unique values on consecutive calls", () => {
    const a = createNewToken();
    const b = createNewToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.normalized).not.toBe(b.normalized);
  });

  it("isTokenValid returns false for empty string", () => {
    expect(isTokenValid("")).toBe(false);
  });

  it("isTokenValid returns false for whitespace-only string", () => {
    expect(isTokenValid("   ")).toBe(false);
  });
});
