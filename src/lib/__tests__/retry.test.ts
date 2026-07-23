import { describe, it, expect } from "vitest";
import { retry } from "../async-utils";

describe("retry", () => {
  it("resolves on first attempt", async () => {
    const result = await retry(() => Promise.resolve("ok"), 3, 100);
    expect(result).toBe("ok");
  });

  it("retries on failure", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error("fail");
      return "ok";
    };
    const result = await retry(fn, 3, 100);
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("throws after max retries", async () => {
    const fn = async () => { throw new Error("always fail"); };
    await expect(retry(fn, 2, 10)).rejects.toThrow("always fail");
  });

  it("exponential backoff increases delay", async () => {
    const start = Date.now();
    let attempts = 0;
    await retry(async () => {
      attempts++;
      throw new Error("fail");
    }, 3, 50).catch(() => {});
    const elapsed = Date.now() - start;
    expect(attempts).toBe(3);
    expect(elapsed).toBeGreaterThanOrEqual(50 + 100); // 50 + 100ms cumulative
  }, 5000);

  it("handles synchronous throws", async () => {
    await expect(retry(() => { throw new Error("sync"); }, 1, 10)).rejects.toThrow("sync");
  });
});
