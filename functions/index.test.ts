import { describe, it, expect } from "vitest";

describe("cleanupExpiredData", () => {
  it("index module loads without error", async () => {
    const mod = await import("./index");
    expect(mod).toHaveProperty("cleanupExpiredData");
    expect(typeof mod.cleanupExpiredData).toBe("function");
  });
});
