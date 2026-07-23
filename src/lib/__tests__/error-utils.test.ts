import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFirestoreErrorMessage, logError } from "../error-utils";

describe("getFirestoreErrorMessage", () => {
  it("returns message for known error codes", () => {
    const t = (key: string) => key;
    expect(getFirestoreErrorMessage({ code: "permission-denied" }, t)).toBe("errors.permissionDenied");
    expect(getFirestoreErrorMessage({ code: "unavailable" }, t)).toBe("errors.serviceUnavailable");
    expect(getFirestoreErrorMessage({ code: "not-found" }, t)).toBe("errors.notFound");
  });

  it("returns message for all known error codes", () => {
    const t = (key: string) => key;
    const codeMap: Record<string, string> = {
      "permission-denied": "errors.permissionDenied",
      "unavailable": "errors.serviceUnavailable",
      "not-found": "errors.notFound",
      "deadline-exceeded": "errors.timeout",
      "resource-exhausted": "errors.quotaExceeded",
      "already-exists": "errors.alreadyExists",
      "failed-precondition": "errors.failedPrecondition",
      "aborted": "errors.aborted",
      "unauthenticated": "errors.unauthenticated",
    };
    Object.entries(codeMap).forEach(([code, expected]) => {
      expect(getFirestoreErrorMessage({ code }, t)).toBe(expected);
    });
  });

  it("returns default message for unknown codes", () => {
    const t = (key: string) => key;
    const error = new Error("Something broke");
    expect(getFirestoreErrorMessage(error, t)).toBe("Something broke");
  });

  it("returns error message without translation function", () => {
    expect(getFirestoreErrorMessage({ code: "permission-denied" })).toBe("Permission denied");
    expect(getFirestoreErrorMessage(new Error("Oops"))).toBe("Oops");
  });

  it("returns string representation for non-Error objects", () => {
    expect(getFirestoreErrorMessage("just a string")).toBe("just a string");
    expect(getFirestoreErrorMessage(42)).toBe("42");
  });

  it("returns default for empty error object", () => {
    expect(getFirestoreErrorMessage({})).toBe("[object Object]");
  });
});

describe("logError", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs an Error to console.error in DEV", () => {
    const err = new Error("test error");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError(err, "TestContext");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[TestContext]",
      "test error",
      expect.stringContaining("test error")
    );
  });

  it("logs a string to console.error in DEV", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("string error", "Ctx");
    expect(consoleSpy).toHaveBeenCalledWith("[Ctx]", "string error", "");
  });

  it("uses 'App' as default context", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError(new Error("e"));
    expect(consoleSpy).toHaveBeenCalledWith("[App]", "e", expect.any(String));
  });
});
