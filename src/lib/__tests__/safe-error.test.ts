import { describe, it, expect, vi, afterEach } from "vitest";
import { toSafeErrorMessage, safeLogError } from "../safe-error";

describe("safe-error", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("toSafeErrorMessage", () => {
    it("redacta el token de la ruta/URL de un mensaje de error", () => {
      const msg = toSafeErrorMessage(new Error("error en https://wedingo-6c26a.web.app/TtCgt9n8VT/admin"));
      expect(msg).not.toContain("TtCgt9n8VT");
      expect(msg).toContain("[redacted]");
    });

    it("redacta el token de un query param sensible", () => {
      const msg = toSafeErrorMessage(new Error("fallo ?t=ABC123XYZ&x=1"));
      expect(msg).not.toContain("ABC123XYZ");
      expect(msg).toContain("[redacted]");
    });

    it("extrae name + message + code de un error de Firestore sin volcar el objeto", () => {
      const err = Object.assign(new Error("permission denied"), {
        name: "FirebaseError",
        code: "permission-denied",
        ref: "invitations/TtCgt9n8VT",
      });
      const msg = toSafeErrorMessage(err);
      expect(msg).toContain("permission denied");
      expect(msg).toContain("permission-denied");
      // El ref con el token no puede aparecer en claro.
      expect(msg).not.toContain("TtCgt9n8VT");
      expect(msg).not.toContain("[object Object]");
    });

    it("maneja valores no-Error", () => {
      expect(toSafeErrorMessage(null)).toBe("null");
      expect(toSafeErrorMessage("boom")).toBe("boom");
    });
  });

  describe("safeLogError", () => {
    it("loggea la representación segura, nunca el objeto completo", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = Object.assign(new Error("fail"), { ref: "invitations/TtCgt9n8VT" });
      safeLogError(["[app]", "[test]", "ops"], err);
      const logged = spy.mock.calls.map((c) => c.join(" ")).join(" ");
      expect(logged).toContain("fail");
      expect(logged).not.toContain("TtCgt9n8VT");
      expect(logged).not.toContain("[object Object]");
    });
  });
});
