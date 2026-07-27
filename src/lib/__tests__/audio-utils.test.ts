import { describe, it, expect } from "vitest";
import { compressAudio, estimateAudioSize } from "../audio-utils";

describe("audio-utils", () => {
  it("exports compressAudio as a function", () => {
    expect(typeof compressAudio).toBe("function");
  });

  it("estimateAudioSize returns correct size", () => {
    const size = estimateAudioSize(60);
    expect(size).toBeGreaterThan(0);
    expect(Number.isFinite(size)).toBe(true);
  });

  it("estimateAudioSize scales with duration", () => {
    const size10 = estimateAudioSize(10);
    const size60 = estimateAudioSize(60);
    expect(size60).toBeGreaterThan(size10);
  });
});
