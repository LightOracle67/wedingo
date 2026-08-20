import { describe, it, expect } from "vitest";
import { isSafeUrl, safeHref, safeSocialUrl } from "../safe-href";

describe("safe-href", () => {
  describe("isSafeUrl", () => {
    it("acepta http(s) absolutos seguros", () => {
      expect(isSafeUrl("https://example.com")).toBe(true);
      expect(isSafeUrl("http://example.com/path?q=1")).toBe(true);
    });

    it("rechaza esquemas peligrosos y valores vacíos", () => {
      expect(isSafeUrl("")).toBe(false);
      expect(isSafeUrl("   ")).toBe(false);
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeUrl("data:text/html,<x>")).toBe(false);
      expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
      expect(isSafeUrl("//evil.example.com")).toBe(false);
    });

    it("rechaza saltos de línea e inyección por control chars", () => {
      expect(isSafeUrl("java\nscript:alert(1)")).toBe(false);
      expect(isSafeUrl("https://example.com/\nfoo")).toBe(false);
    });
  });

  describe("safeHref", () => {
    it("devuelve la URL segura o cadena vacía", () => {
      expect(safeHref("https://a.com")).toBe("https://a.com");
      expect(safeHref("javascript:alert(1)")).toBe("");
      expect(safeHref(undefined)).toBe("");
      expect(safeHref(null)).toBe("");
    });
  });

  describe("safeSocialUrl", () => {
    it("acepta instagram.com y www.instagram.com para instagram", () => {
      expect(safeSocialUrl("https://instagram.com/perfil", "instagram.com")).toBe("https://instagram.com/perfil");
      expect(safeSocialUrl("https://www.instagram.com/perfil", "instagram.com")).toBe(
        "https://www.instagram.com/perfil",
      );
    });

    it("acepta facebook.com y www.facebook.com para facebook", () => {
      expect(safeSocialUrl("https://facebook.com/user", "facebook.com")).toBe("https://facebook.com/user");
      expect(safeSocialUrl("https://www.facebook.com/user", "facebook.com")).toBe("https://www.facebook.com/user");
    });

    it("rechaza hosts distintos y esquemas peligrosos para un host dado", () => {
      expect(safeSocialUrl("https://m.facebook.com/user", "instagram.com")).toBe("");
      expect(safeSocialUrl("https://evil.example.com", "instagram.com")).toBe("");
      expect(safeSocialUrl("https://instagram.com/user", "facebook.com")).toBe("");
      expect(safeSocialUrl("javascript:alert(1)", "instagram.com")).toBe("");
      expect(safeSocialUrl("", "instagram.com")).toBe("");
    });
  });
});
