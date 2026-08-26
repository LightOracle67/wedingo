import { describe, it, expect } from "vitest";
import { isValidFullName, normalizeFullName, nameKey } from "../name-utils";

describe("isValidFullName", () => {
  it("accepts exactly 3 words (name + two surnames)", () => {
    expect(isValidFullName("Ana María García")).toBe(true);
    expect(isValidFullName("Luis Pérez Rodríguez")).toBe(true);
  });

  it("rejects single word names", () => {
    expect(isValidFullName("Ana")).toBe(false);
  });
  it("accepts two, three and four word names", () => {
    expect(isValidFullName("Ana María")).toBe(true);
    expect(isValidFullName("Ana María García")).toBe(true);
    expect(isValidFullName("Ana María García López")).toBe(true);
  });

  it("rejects more than three surnames", () => {
    expect(isValidFullName("Ana María García López Pérez")).toBe(false);
  });

  it("normalizes double spaces before validating", () => {
    expect(isValidFullName("Ana   María  García")).toBe(true);
  });

  it("rejects empty or whitespace-only input", () => {
    expect(isValidFullName("")).toBe(false);
    expect(isValidFullName("   ")).toBe(false);
  });

  it("accepts accented characters and hyphens", () => {
    expect(isValidFullName("José Ángel Fernández")).toBe(true);
    expect(isValidFullName("María-José Sáez Ortiz")).toBe(true);
  });
});

describe("normalizeFullName", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeFullName("  Ana   María  García  ")).toBe("Ana María García");
  });
});

describe("nameKey — clave de emparejamiento tolerante", () => {
  // El matching de respuesta previa debe tolerar acentos y mayúsculas:
  // así "jose garcia" encuentra la entrada guardada como "José García".
  it("pliega acentos y mayúsculas", () => {
    expect(nameKey("José García López")).toBe("jose garcia lopez");
  });

  it("normaliza ñ/Ü a la letra base para comparar", () => {
    expect(nameKey("ANA MUÑOZ ÜBER")).toBe("ana munoz uber");
  });

  it("colapsa espacios como normalizeFullName", () => {
    expect(nameKey("  Juan   Pérez  ")).toBe("juan perez");
  });
});
