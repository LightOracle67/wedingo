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

  it("validates a French IBAN", () => {
    expect(isValidIBAN("FR1420041010050500013M02606")).toBe(true);
  });

  it("validates an Italian IBAN", () => {
    expect(isValidIBAN("IT60X0542811101000000123456")).toBe(true);
  });

  it("validates a Dutch IBAN", () => {
    expect(isValidIBAN("NL91ABNA0417164300")).toBe(true);
  });

  it("rejects IBAN with valid format but invalid checksum", () => {
    expect(isValidIBAN("ES6621000418401234567890")).toBe(false);
  });

  it("accepts lowercase characters (normalized to uppercase)", () => {
    expect(isValidIBAN("es6621000418401234567891")).toBe(true);
  });

  it("rejects IBAN with less than 15 characters after cleaning", () => {
    expect(isValidIBAN("ES12 3456")).toBe(false);
  });

  it("rejects IBAN with invalid country code format", () => {
    expect(isValidIBAN("12345678901234567890")).toBe(false);
  });
});
