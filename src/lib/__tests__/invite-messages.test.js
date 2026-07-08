import { describe, it, expect } from "vitest";
import { WEDDING_MESSAGES, randomMessage } from "../invite-messages";

describe("WEDDING_MESSAGES", () => {
  it("has at least 20 messages", () => {
    expect(WEDDING_MESSAGES.length).toBeGreaterThanOrEqual(20);
  });

  it("every message is a non-empty string", () => {
    for (const msg of WEDDING_MESSAGES) {
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});

describe("randomMessage", () => {
  it("returns a string from the message list", () => {
    const result = randomMessage();
    expect(typeof result).toBe("string");
    expect(WEDDING_MESSAGES).toContain(result);
  });

  it("returns different messages on multiple calls", () => {
    const results = new Set(Array.from({ length: 50 }, () => randomMessage()));
    expect(results.size).toBeGreaterThan(1);
  });
});
