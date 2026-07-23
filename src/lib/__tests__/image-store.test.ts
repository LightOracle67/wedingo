import { describe, it, expect, vi } from "vitest";

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(() => Promise.resolve({ id: "new-doc" })),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(() => "coll-ref"),
  doc: vi.fn(() => ({ id: "doc-id" })),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("../firebase", () => ({
  db: {},
}));

vi.mock("../i18n", () => ({
  default: { t: (key: string) => key },
}));

vi.mock("../image-utils", () => ({
  compressImage: vi.fn(() => Promise.resolve("data:image/jpeg;base64,...")),
}));

vi.mock("../crypto-utils", () => ({
  encrypt: vi.fn((data: string) => Promise.resolve(btoa(data))),
  decrypt: vi.fn(() => Promise.resolve("data:image/jpeg;base64,decoded")),
}));

import {
  uploadImage,
  addGalleryImage,
  updateGalleryDescription,
  updateGalleryOrder,
  loadDecryptedField,
  loadGallery,
  deleteGallery,
  deleteGalleryImage,
} from "../image-store";

describe("image-store", () => {
  it("exports uploadImage", () => {
    expect(typeof uploadImage).toBe("function");
  });
  it("exports addGalleryImage", () => {
    expect(typeof addGalleryImage).toBe("function");
  });
  it("exports updateGalleryDescription", () => {
    expect(typeof updateGalleryDescription).toBe("function");
  });
  it("exports updateGalleryOrder", () => {
    expect(typeof updateGalleryOrder).toBe("function");
  });
  it("exports loadDecryptedField", () => {
    expect(typeof loadDecryptedField).toBe("function");
  });
  it("exports loadGallery", () => {
    expect(typeof loadGallery).toBe("function");
  });
  it("exports deleteGallery", () => {
    expect(typeof deleteGallery).toBe("function");
  });
  it("exports deleteGalleryImage", () => {
    expect(typeof deleteGalleryImage).toBe("function");
  });

  it("uploadImage compresses and encrypts", async () => {
    const onProgress = vi.fn();
    const result = await uploadImage("token", new File([], "test.jpg"), onProgress);
    expect(result).toHaveProperty("encrypted");
    expect(result).toHaveProperty("dataUrl");
    expect(onProgress).toHaveBeenCalled();
  });

  it("uploadImage throws on encrypt failure", async () => {
    const mockEncrypt = vi.fn(() => Promise.resolve(null));
    vi.mocked((await import("../crypto-utils")).encrypt).mockImplementationOnce(
      mockEncrypt,
    );
    await expect(uploadImage("token", new File([], "test.jpg"))).rejects.toThrow(
      "errors.encryptFailed",
    );
  });

  it("addGalleryImage adds a document and returns id and dataUrl", async () => {
    const onProgress = vi.fn();
    const result = await addGalleryImage(
      "token",
      "encrypted-data",
      "data:image/jpeg;base64,...",
      0,
      onProgress,
    );
    expect(result).toHaveProperty("id", "new-doc");
    expect(result).toHaveProperty("dataUrl");
  });

  it("updateGalleryDescription resolves", async () => {
    await expect(
      updateGalleryDescription("token", "img-id", "A beautiful photo"),
    ).resolves.toBeUndefined();
  });

  it("updateGalleryOrder resolves with items", async () => {
    await expect(
      updateGalleryOrder("token", [
        { id: "1", position: 0 },
        { id: "2", position: 1 },
      ]),
    ).resolves.toBeUndefined();
  });

  it("updateGalleryOrder does nothing for empty items", async () => {
    await expect(updateGalleryOrder("token", [])).resolves.toBeUndefined();
  });

  it("loadDecryptedField decrypts encrypted data", async () => {
    const result = await loadDecryptedField("token", "encrypted-string");
    expect(result).toBe("data:image/jpeg;base64,decoded");
  });

  it("loadDecryptedField returns empty string for falsy input", async () => {
    const result = await loadDecryptedField("token", "");
    expect(result).toBe("");
  });

  it("loadDecryptedField returns empty string on decrypt failure", async () => {
    vi.mocked((await import("../crypto-utils")).decrypt).mockRejectedValueOnce(
      new Error("Decrypt failed"),
    );
    const result = await loadDecryptedField("token", "bad-data");
    expect(result).toBe("");
  });

  it("loadGallery returns empty array on empty snapshot", async () => {
    const result = await loadGallery("token");
    expect(result).toEqual([]);
  });

  it("loadGallery returns empty array on error", async () => {
    vi.mocked((await import("firebase/firestore")).getDocs).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const result = await loadGallery("token");
    expect(result).toEqual([]);
  });

  it("deleteGallery resolves", async () => {
    await expect(deleteGallery("token")).resolves.toBeUndefined();
  });

  it("deleteGalleryImage resolves", async () => {
    await expect(
      deleteGalleryImage("token", "img-id"),
    ).resolves.toBeUndefined();
  });
});
