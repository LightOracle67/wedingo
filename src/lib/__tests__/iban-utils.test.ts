import { describe, it, expect } from "vitest";
import { isValidIBAN } from "../iban-utils";

describe("isValidIBAN", () => {
  it("validates a correct Spanish IBAN", () => {
    expect(isValidIBAN("ES6621000418401234567891")).toBe(true);
  });

  it("rejects an invalid IBAN", () => {
    expect(isValidIBAN("ES6621000418401234567890")).toBe(false);
  });

  it("rejects too short IBAN", () => {
    expect(isValidIBAN("ES12")).toBe(false);
  });

  it("handles spaces in IBAN", () => {
    expect(isValidIBAN("ES66 2100 0418 4012 3456 7891")).toBe(true);
  });

  it("validates a German IBAN", () => {
    expect(isValidIBAN("DE89370400440532013000")).toBe(true);
  });

  it("rejects invalid format", () => {
    expect(isValidIBAN("not an iban")).toBe(false);
  });

  it("validates a UK IBAN", () => {
    expect(isValidIBAN("GB29NWBK60161331926819")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidIBAN("")).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    expect(isValidIBAN("   ")).toBe(false);
  });

  it("rejects IBAN longer than 34 characters", () => {
    expect(isValidIBAN("ES66210004184012345678911234567890123456789")).toBe(false);
  });

  it("rejects IBAN with invalid special characters", () => {
    expect(isValidIBAN("ES66 2100 0418 4012 3456 789@")).toBe(false);
  });
});
