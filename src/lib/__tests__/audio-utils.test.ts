import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compressAudio } from "../audio-utils";

// ── Mocks del Web Audio API ────────────────────────────────────────────
const origAudioContext = globalThis.AudioContext;
const origOfflineAudioContext = globalThis.OfflineAudioContext;

function makeAudioFile(): File {
  const file = new File([new Uint8Array(100)], "song.mp3", { type: "audio/mpeg" });
  return file;
}

beforeEach(() => {
  globalThis.AudioContext = class {
    decodeAudioData = vi.fn(async () => ({ duration: 1, numberOfChannels: 1 }));
    close = vi.fn(async () => {});
  } as unknown as typeof AudioContext;

  globalThis.OfflineAudioContext = class {
    destination = {};
    createBufferSource = vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() }));
    startRendering = vi.fn(async () => ({ getChannelData: () => new Float32Array([0, 0.5, -0.5]) }));
  } as unknown as typeof OfflineAudioContext;
});

afterEach(() => {
  globalThis.AudioContext = origAudioContext;
  globalThis.OfflineAudioContext = origOfflineAudioContext;
  vi.unstubAllGlobals();
});

describe("compressAudio", () => {
  it("encodes a WAV data URL from an audio file", async () => {
    const result = await compressAudio(makeAudioFile());
    expect(result).toMatch(/^data:audio\/wav;base64,/);
  });

  it("throws a localized error when decoding fails", async () => {
    const ctx = new AudioContext();
    ctx.decodeAudioData = vi.fn(async () => {
      throw new Error("decode");
    });
    globalThis.AudioContext = class {
      decodeAudioData = ctx.decodeAudioData;
      close = vi.fn(async () => {});
    } as unknown as typeof AudioContext;
    await expect(compressAudio(makeAudioFile())).rejects.toThrow("audio.decodeFailed");
  });
});

