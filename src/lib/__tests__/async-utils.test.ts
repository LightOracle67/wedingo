import { describe, it, expect } from "vitest";
import { withTimeout } from "../async-utils";

describe("withTimeout", () => {
  it("resolves when promise resolves before timeout", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 1000);
    expect(result).toBe("ok");
  });

  it("rejects when promise takes longer than timeout", async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 500));
    await expect(withTimeout(slow, 50)).rejects.toThrow("timed out");
  });

  it("uses custom error message", async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 500));
    await expect(withTimeout(slow, 50, "Custom error")).rejects.toThrow("Custom error");
  });
});
