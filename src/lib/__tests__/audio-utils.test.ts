import { describe, it, expect } from "vitest";
import { estimateAudioSize } from "../audio-utils";

describe("estimateAudioSize", () => {
  it("estimates size for 30 seconds", () => {
    const size = estimateAudioSize(30);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
  });

  it("estimates size for 0 seconds", () => {
    const size = estimateAudioSize(0);
    // rawBytes=44 → dataUrlLen=Math.round(44*4/3)+22=81 → encryptedLen=116 → round(116*4/3)=155
    expect(size).toBe(155);
  });
});
