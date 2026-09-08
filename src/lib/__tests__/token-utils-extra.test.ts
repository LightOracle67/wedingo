import { describe, it, expect } from "vitest";
import { normalizeTokenValue } from "../token-utils";

describe("normalizeTokenValue extra", () => {
  it("removes special characters", () => {
    expect(normalizeTokenValue("abc-def_ghi!@#")).toBe("ABCDEFGHI");
  });

  it("handles already clean input", () => {
    expect(normalizeTokenValue("ABCDEFGH1234")).toBe("ABCDEFGH1234");
  });

  it("no-string (null, número, objeto) devuelve cadena vacía", () => {
    expect(normalizeTokenValue(null)).toBe("");
    expect(normalizeTokenValue(42)).toBe("");
    expect(normalizeTokenValue({})).toBe("");
  });

  it("colapsa guiones/espacios a mayúsculas sin símbolos", () => {
    expect(normalizeTokenValue(" UAZY-P6HVX 45Fv ")).toBe("UAZYP6HVX45FV");
    // Los caracteres no-ASCII (acentos) se descartan por el filtro [^A-Z0-9].
    expect(normalizeTokenValue("ÁÉÍÓÚñ")).toBe("");
  });
});
