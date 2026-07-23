import { describe, it, expect } from "vitest";
import { getFirestoreErrorMessage } from "../error-utils";

describe("getFirestoreErrorMessage", () => {
  it("returns message for known error codes", () => {
    const t = (key: string) => key;
    expect(getFirestoreErrorMessage({ code: "permission-denied" }, t)).toBe("errors.permissionDenied");
    expect(getFirestoreErrorMessage({ code: "unavailable" }, t)).toBe("errors.serviceUnavailable");
    expect(getFirestoreErrorMessage({ code: "not-found" }, t)).toBe("errors.notFound");
  });

  it("returns default message for unknown codes", () => {
    const t = (key: string) => key;
    const error = new Error("Something broke");
    expect(getFirestoreErrorMessage(error, t)).toBe("Something broke");
  });
});
