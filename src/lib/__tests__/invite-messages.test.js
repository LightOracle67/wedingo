import { describe, it, expect } from "vitest";
import { WEDDING_MESSAGES, randomMessage } from "../invite-messages";

describe("WEDDING_MESSAGES", () => {
  it("has at least 20 messages", () => {
    expect(WEDDING_MESSAGES.length).toBeGreaterThanOrEqual(20);
  });

  it("every message contains {coupleName} placeholder", () => {
    for (const msg of WEDDING_MESSAGES) {
      expect(msg).toContain("{coupleName}");
    }
  });
});

describe("randomMessage", () => {
  it("replaces {coupleName} placeholder", () => {
    const result = randomMessage("Ana & Luis");
    expect(result).toContain("Ana & Luis");
    expect(result).not.toContain("{coupleName}");
  });

  it("returns one of the predefined messages", () => {
    const result = randomMessage("Test");
    const normalized = result.replace("Test", "{coupleName}");
    expect(WEDDING_MESSAGES).toContain(normalized);
  });

  it("returns different messages on multiple calls", () => {
    const results = new Set(Array.from({ length: 50 }, () => randomMessage("X")));
    expect(results.size).toBeGreaterThan(1);
  });
});
