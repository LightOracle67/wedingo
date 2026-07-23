import { describe, it, expect } from "vitest";
import { estimateAudioSize } from "../audio-utils";

describe("estimateAudioSize extra", () => {
  it("returns positive size for any duration", () => {
    expect(estimateAudioSize(1)).toBeGreaterThan(0);
    expect(estimateAudioSize(60)).toBeGreaterThan(0);
    expect(estimateAudioSize(300)).toBeGreaterThan(0);
  });

  it("size grows with duration", () => {
    const small = estimateAudioSize(10);
    const large = estimateAudioSize(60);
    expect(large).toBeGreaterThan(small);
  });
});
