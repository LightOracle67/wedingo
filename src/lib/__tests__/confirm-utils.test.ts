import { describe, it, expect, vi, beforeEach } from "vitest";
import { showConfirm, confirmAction } from "../confirm-utils";

describe("confirm-utils", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports showConfirm as a function", () => {
    expect(typeof showConfirm).toBe("function");
  });

  it("exports confirmAction as a function", () => {
    expect(typeof confirmAction).toBe("function");
  });

  it("showConfirm resolves with true when window.confirm returns true", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await expect(showConfirm("Are you sure?")).resolves.toBe(true);
    expect(window.confirm).toHaveBeenCalledWith("Are you sure?");
  });

  it("showConfirm resolves with false when window.confirm returns false", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await expect(showConfirm("Are you sure?")).resolves.toBe(false);
  });

  it("confirmAction resolves with true when user confirms", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await expect(confirmAction("Proceed?")).resolves.toBe(true);
  });

  it("confirmAction resolves with false when user cancels", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await expect(confirmAction("Cancel?")).resolves.toBe(false);
  });

  it("confirmAction delegates to showConfirm with the message", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await expect(confirmAction("Delegate test")).resolves.toBe(true);
    expect(window.confirm).toHaveBeenCalledWith("Delegate test");
  });
});
