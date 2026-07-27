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

import * as cryptoUtils from "../crypto-utils";

const mockEncrypt = vi.mocked(cryptoUtils.encrypt);
const mockDecrypt = vi.mocked(cryptoUtils.decrypt);

import * as firestore from "firebase/firestore";

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

  it("uploadImage throws when encrypt returns null", async () => {
    mockEncrypt.mockResolvedValueOnce(null as unknown as string);
    await expect(uploadImage("token", new File([], "test.jpg"))).rejects.toThrow(
      "errors.encryptFailed",
    );
  });

  it("uploadImage throws on encrypt failure", async () => {
    mockEncrypt.mockRejectedValueOnce(new Error("errors.encryptFailed"));
    await expect(uploadImage("token", new File([], "test.jpg"))).rejects.toThrow(
      "errors.encryptFailed",
    );
  });

  it("uploadImage throws when image exceeds size limit", async () => {
    const largeData = "x".repeat(600000);
    mockEncrypt.mockResolvedValueOnce(Promise.resolve(largeData));
    await expect(uploadImage("token", new File([], "test.jpg"))).rejects.toThrow(
      "errors.imageTooLarge",
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

  it("addGalleryImage passes optional originalName and originalSize", async () => {
    const onProgress = vi.fn();
    const result = await addGalleryImage(
      "token",
      "encrypted-data",
      "data:image/jpeg;base64,...",
      0,
      onProgress,
      "photo.jpg",
      12345,
    );
    expect(result).toHaveProperty("id", "new-doc");
  });

  it("addGalleryImage handles null position", async () => {
    const onProgress = vi.fn();
    const result = await addGalleryImage(
      "token", "encrypted-data", "data:image/jpeg;base64,...",
      null as unknown as number, onProgress,
    );
    expect(result).toHaveProperty("id");
  });

  it("updateGalleryDescription resolves", async () => {
    await expect(
      updateGalleryDescription("token", "img-id", "A beautiful photo"),
    ).resolves.toBeUndefined();
  });

  it("updateGalleryDescription handles falsy description", async () => {
    await expect(
      updateGalleryDescription("token", "img-id", ""),
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
    mockDecrypt.mockRejectedValueOnce(new Error("Decrypt failed"));
    const result = await loadDecryptedField("token", "bad-data");
    expect(result).toBe("");
  });

  it("loadGallery returns empty array on empty snapshot", async () => {
    const result = await loadGallery("token");
    expect(result).toEqual([]);
  });

  it("loadGallery returns empty array on error", async () => {
    vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error("Network error"));
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

  it("loadGallery returns mapped results for non-empty snapshot", async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "img2",
          data: () => ({
            data: "encrypted-data-string",
            position: 2,
            description: "Photo 2",
          }),
        },
        {
          id: "img1",
          data: () => ({
            data: "encrypted-data-string",
            position: 1,
            description: "Photo 1",
          }),
        },
      ],
    } as never);
    const result = await loadGallery("token");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("img1");
  });

  it("loadGallery skips docs with no data field", async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "img1",
          data: () => ({ position: 1 }),
        },
        {
          id: "img2",
          data: () => ({ data: "encrypted-data", position: 2 }),
        },
      ],
    } as never);
    const result = await loadGallery("token");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("img2");
  });

  it("loadGallery handles decrypt failure for individual docs", async () => {
    mockDecrypt.mockRejectedValueOnce(new Error("decrypt fail"));
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "img1",
          data: () => ({ data: "bad-data", position: 1 }),
        },
      ],
    } as never);
    const result = await loadGallery("token");
    expect(result).toHaveLength(0);
  });

  it("loadGallery handles docs without position field", async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: "img1", data: () => ({ data: "enc1" }) },
        { id: "img2", data: () => ({ data: "enc2", position: 2 }) },
        { id: "img3", data: () => ({ data: "enc3" }) },
      ],
    } as never);
    const result = await loadGallery("token");
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("img2");
    expect(result[1].id).toBe("img1");
    expect(result[2].id).toBe("img3");
  });

  it("loadGallery includes originalName and originalSize from docs", async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: "img1",
          data: () => ({
            data: "encrypted-data",
            position: 1,
            description: "desc",
            originalName: "photo.jpg",
            originalSize: 50000,
          }),
        },
      ],
    } as never);
    const result = await loadGallery("token");
    expect(result).toHaveLength(1);
    expect(result[0].originalName).toBe("photo.jpg");
    expect(result[0].originalSize).toBe(50000);
  });

  it("deleteGallery deletes docs when snapshot is not empty", async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{ ref: "doc-ref-1" }, { ref: "doc-ref-2" }],
    } as never);
    await expect(deleteGallery("token")).resolves.toBeUndefined();
  });
});
