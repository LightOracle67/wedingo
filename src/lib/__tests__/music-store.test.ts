import { describe, it, expect, vi } from "vitest";

vi.mock("firebase/firestore", () => ({
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  collection: vi.fn(() => "audio-coll-ref"),
  doc: vi.fn(() => ({ id: "audio-doc-id" })),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  query: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock("../firebase", () => ({
  db: {},
}));

vi.mock("../crypto-utils", () => ({
  encrypt: vi.fn((data: string) => Promise.resolve(btoa(data))),
  decrypt: vi.fn(() => Promise.resolve("data:audio/mp3;base64,decoded")),
}));

vi.mock("../audio-utils", () => ({
  compressAudio: vi.fn(() => Promise.resolve("data:audio/mp3;base64,...")),
}));

import { uploadAudio, addAudio, loadAudio, deleteAudio } from "../music-store";

describe("music-store", () => {
  it("exports uploadAudio", () => {
    expect(typeof uploadAudio).toBe("function");
  });
  it("exports addAudio", () => {
    expect(typeof addAudio).toBe("function");
  });
  it("exports loadAudio", () => {
    expect(typeof loadAudio).toBe("function");
  });
  it("exports deleteAudio", () => {
    expect(typeof deleteAudio).toBe("function");
  });

  it("uploadAudio compresses and encrypts", async () => {
    const onProgress = vi.fn();
    const result = await uploadAudio("token", new File([], "test.mp3"), onProgress);
    expect(result).toHaveProperty("encrypted");
    expect(result).toHaveProperty("dataUrl");
    expect(onProgress).toHaveBeenCalled();
  });

  it("uploadAudio throws on encrypt failure", async () => {
    const mockEncrypt = vi.fn(() => Promise.resolve(null));
    vi.mocked((await import("../crypto-utils")).encrypt).mockImplementationOnce(
      mockEncrypt,
    );
    await expect(
      uploadAudio("token", new File([], "test.mp3")),
    ).rejects.toThrow("Encryption failed");
  });

  it("addAudio chunks and writes to firestore", async () => {
    const onProgress = vi.fn();
    const encrypted = "a".repeat(600 * 1024);
    const result = await addAudio(
      "token",
      encrypted,
      "data:audio/mp3;base64,...",
      onProgress,
    );
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("dataUrl");
    expect(result).toHaveProperty("chunks");
    expect(result.chunks).toBeGreaterThan(1);
  });

  it("loadAudio returns null when no audio exists", async () => {
    const result = await loadAudio("token");
    expect(result).toBeNull();
  });

  it("loadAudio returns null on error", async () => {
    vi.mocked((await import("firebase/firestore")).getDocs).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const result = await loadAudio("token");
    expect(result).toBeNull();
  });

  it("deleteAudio resolves", async () => {
    await expect(deleteAudio("token")).resolves.toBeUndefined();
  });

  it("deleteAudio resolves when empty", async () => {
    await expect(deleteAudio("no-audio-token")).resolves.toBeUndefined();
  });
});
