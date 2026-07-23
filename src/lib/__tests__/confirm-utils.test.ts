import { describe, it, expect } from "vitest";
import { confirmAction } from "../confirm-utils";

describe("confirmAction", () => {
  it("returns a promise", () => {
    const result = confirmAction("test");
    expect(result).toBeInstanceOf(Promise);
  });
});
