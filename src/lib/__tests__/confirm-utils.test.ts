import { describe, it, expect } from "vitest";
import { showConfirm, confirmAction } from "../confirm-utils";

describe("confirm-utils", () => {
  it("exports showConfirm as a function", () => {
    expect(typeof showConfirm).toBe("function");
  });

  it("exports confirmAction as a function", () => {
    expect(typeof confirmAction).toBe("function");
  });

  it("confirmAction returns a promise", () => {
    const result = confirmAction("test");
    expect(result).toBeInstanceOf(Promise);
  });
});
