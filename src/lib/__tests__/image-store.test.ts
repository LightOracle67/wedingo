import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(() => Promise.resolve({ id: "new-doc" })),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => undefined })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(() => "coll-ref"),
  doc: vi.fn(() => ({ id: "doc-id" })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "ts"),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("../firebase", () => ({
  db: {},
}));

vi.mock("../../i18n", () => ({
  default: { t: (key: string) => key },
}));

const mockCompressImage = vi.hoisted(() => vi.fn(() => Promise.resolve("data:image/jpeg;base64,...")));
vi.mock("../image-utils", () => ({
  compressImage: mockCompressImage,
  MAX_IMAGE_DIMENSION: 1600,
  TARGET_BYTES: 300 * 1024,
  HIGH_QUALITY_MAX_DIMENSION: 1920,
  HIGH_QUALITY_TARGET_BYTES: 450 * 1024,
  MAX_ENCRYPTED_BYTES: 1000 * 1024,
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
  getGalleryImageUrl,
  deleteGallery,
  deleteGalleryImage,
  isConfigImageRef,
  makeConfigImageRef,
  saveConfigImage,
  getConfigImage,
  deleteConfigImage,
  resolveConfigImageField,
  resolveAllConfigImages,
  deleteAllConfigImages,
  clearGalleryCache,
  clearConfigImageCache,
} from "../image-store";

import * as cryptoUtils from "../crypto-utils";

const mockEncrypt = vi.mocked(cryptoUtils.encrypt);
const mockDecrypt = vi.mocked(cryptoUtils.decrypt);

import * as firestore from "firebase/firestore";

describe("image-store", () => {
  beforeEach(() => {
    // La caché de URLs descifradas es a nivel de módulo: se limpia para que
    // cada test descifre de verdad y no se contamine entre ellos.
    clearGalleryCache();
    clearConfigImageCache();
    mockDecrypt.mockClear();
  });
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
    const result = await uploadImage("token", new File([], "test.jpg", { type: "image/jpeg" }), onProgress);
    expect(result).toHaveProperty("encrypted");
    expect(result).toHaveProperty("dataUrl");
    expect(onProgress).toHaveBeenCalled();
    // La galería comprime en alta calidad (1920px, 450KB crudos) para mejor nitidez.
    expect(mockCompressImage).toHaveBeenCalledWith(expect.any(File), 1920, 450 * 1024);
  });

  it("uploadImage throws when encrypt returns null", async () => {
    mockEncrypt.mockResolvedValueOnce(null as unknown as string);
    await expect(uploadImage("token", new File([], "test.jpg", { type: "image/jpeg" }))).rejects.toThrow(
      "errors.encryptFailed",
    );
  });

  it("uploadImage throws on encrypt failure", async () => {
    mockEncrypt.mockRejectedValueOnce(new Error("errors.encryptFailed"));
    await expect(uploadImage("token", new File([], "test.jpg", { type: "image/jpeg" }))).rejects.toThrow(
      "errors.encryptFailed",
    );
  });

  it("uploadImage throws when image exceeds size limit", async () => {
    const largeData = "x".repeat(1300000);
    mockEncrypt.mockResolvedValueOnce(largeData);
    await expect(uploadImage("token", new File([], "test.jpg", { type: "image/jpeg" }))).rejects.toThrow(
      "errors.imageTooLarge",
    );
  });

  it("addGalleryImage adds a document and returns id and dataUrl", async () => {
    const onProgress = vi.fn();
    const result = await addGalleryImage("token", "encrypted-data", "data:image/jpeg;base64,...", 0, onProgress);
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
      "token",
      "encrypted-data",
      "data:image/jpeg;base64,...",
      null as unknown as number,
      onProgress,
    );
    expect(result).toHaveProperty("id");
  });

  it("updateGalleryDescription resolves", async () => {
    await expect(updateGalleryDescription("token", "img-id", "A beautiful photo")).resolves.toBeUndefined();
  });

  it("updateGalleryDescription handles falsy description", async () => {
    await expect(updateGalleryDescription("token", "img-id", "")).resolves.toBeUndefined();
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
    await expect(deleteGalleryImage("token", "img-id")).resolves.toBeUndefined();
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
    expect(result[0]!.id).toBe("img1");
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
    expect(result[0]!.id).toBe("img2");
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
    expect(result[0]!.id).toBe("img2");
    expect(result[1]!.id).toBe("img1");
    expect(result[2]!.id).toBe("img3");
  });

  describe("getGalleryImageUrl (descifrado bajo demanda)", () => {
    it("returns the cached URL on repeated calls (no re-decrypt)", async () => {
      const meta = { id: "g1", encrypted: "enc1", description: "" };
      const first = await getGalleryImageUrl("token", meta);
      expect(first).toBe("data:image/jpeg;base64,decoded");
      expect(mockDecrypt).toHaveBeenCalledTimes(1);
      await getGalleryImageUrl("token", meta);
      expect(mockDecrypt).toHaveBeenCalledTimes(1);
    });

    it("deduplicates concurrent requests (single-flight)", async () => {
      const meta = { id: "g2", encrypted: "enc2", description: "" };
      const [a, b] = await Promise.all([getGalleryImageUrl("token", meta), getGalleryImageUrl("token", meta)]);
      expect(a).toBe("data:image/jpeg;base64,decoded");
      expect(b).toBe("data:image/jpeg;base64,decoded");
      expect(mockDecrypt).toHaveBeenCalledTimes(1);
    });

    it("returns empty and does not cache when decrypt fails", async () => {
      mockDecrypt.mockRejectedValueOnce(new Error("boom"));
      const meta = { id: "g3", encrypted: "enc3", description: "" };
      const url = await getGalleryImageUrl("token", meta);
      expect(url).toBe("");
      // El fallo no se cachea: un segundo intento re-descifra.
      await getGalleryImageUrl("token", meta);
      expect(mockDecrypt).toHaveBeenCalledTimes(2);
    });
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
    expect(result[0]!.originalName).toBe("photo.jpg");
    expect(result[0]!.originalSize).toBe(50000);
  });

  it("deleteGallery deletes docs when snapshot is not empty", async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{ ref: "doc-ref-1" }, { ref: "doc-ref-2" }],
    } as never);
    await expect(deleteGallery("token")).resolves.toBeUndefined();
  });

  describe("config images", () => {
    it("isConfigImageRef detects the ref prefix", () => {
      expect(isConfigImageRef("__cfgimg:couplePhoto")).toBe(true);
      expect(isConfigImageRef("data:image/png;base64,x")).toBe(false);
    });

    it("makeConfigImageRef builds a ref", () => {
      expect(makeConfigImageRef("couplePhoto")).toBe("__cfgimg:couplePhoto");
    });

    it("saveConfigImage encrypts and stores, returning a ref", async () => {
      const result = await saveConfigImage("token", "couplePhoto", "data:image/png;base64,x");
      expect(result).toMatch(/^__cfgimg:couplePhoto:\d+$/);
    });

    it("saveConfigImage throws when encrypt fails", async () => {
      mockEncrypt.mockRejectedValueOnce(new Error("errors.encryptFailed"));
      await expect(saveConfigImage("token", "couplePhoto", "data:x")).rejects.toThrow("errors.encryptFailed");
    });

    it("saveConfigImage throws when the encrypted data exceeds the 1MB limit", async () => {
      // El base64 cifrado no debe superar el límite de Firestore (~1MB).
      mockEncrypt.mockResolvedValueOnce("x".repeat(1100 * 1024));
      await expect(saveConfigImage("token", "couplePhoto", "data:image/png;base64,x")).rejects.toThrow(
        "errors.imageTooLarge",
      );
    });

    it("saveConfigImage retries a transient network failure", async () => {
      const netErr = new Error("net") as Error & { code?: string };
      netErr.code = "unavailable";
      vi.mocked(firestore.setDoc).mockRejectedValueOnce(netErr);
      vi.useFakeTimers();
      const promise = saveConfigImage("token", "couplePhoto", "data:image/png;base64,x");
      await vi.advanceTimersByTimeAsync(500);
      await expect(promise).resolves.toMatch(/^__cfgimg:couplePhoto:\d+$/);
      vi.useRealTimers();
    });

    it("saveConfigImage does not retry a non-retryable error", async () => {
      const permErr = new Error("denied") as Error & { code?: string };
      permErr.code = "permission-denied";
      vi.mocked(firestore.setDoc).mockClear();
      vi.mocked(firestore.setDoc).mockRejectedValueOnce(permErr);
      await expect(saveConfigImage("token", "couplePhoto", "data:image/png;base64,x")).rejects.toThrow("denied");
      expect(firestore.setDoc).toHaveBeenCalledTimes(1);
    });

    it("getConfigImage returns null when the doc does not exist", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({ exists: () => false } as never);
      await expect(getConfigImage("token", "couplePhoto")).resolves.toBeNull();
    });

    it("getConfigImage returns null when data is not a string", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ data: 42 }),
      } as never);
      await expect(getConfigImage("token", "couplePhoto")).resolves.toBeNull();
    });

    it("getConfigImage decrypts and returns the value", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ data: "enc" }),
      } as never);
      await expect(getConfigImage("token", "couplePhoto")).resolves.toBe("data:image/jpeg;base64,decoded");
    });

    it("getConfigImage returns null on error", async () => {
      vi.useFakeTimers();
      vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error("net"));
      const promise = getConfigImage("token", "couplePhoto");
      await vi.advanceTimersByTimeAsync(1000);
      await expect(promise).resolves.toBeNull();
      vi.useRealTimers();
    });

    it("getConfigImage retries a transient failure and succeeds", async () => {
      vi.useFakeTimers();
      vi.mocked(firestore.getDoc)
        .mockRejectedValueOnce(new Error("net"))
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ data: "enc" }),
        } as never);
      const promise = getConfigImage("token", "couplePhoto");
      await vi.advanceTimersByTimeAsync(1000);
      await expect(promise).resolves.toBe("data:image/jpeg;base64,decoded");
      vi.useRealTimers();
    });

    it("deleteConfigImage resolves on success and rethrows on failure", async () => {
      await expect(deleteConfigImage("token", "couplePhoto")).resolves.toBeUndefined();
      vi.mocked(firestore.deleteDoc).mockRejectedValueOnce(new Error("net"));
      // Relanza para que el caller pueda informar y no limpiar el campo si el
      // borrado en Firestore falló (evita imágenes huérfanas en silencio).
      await expect(deleteConfigImage("token", "couplePhoto")).rejects.toThrow("net");
    });

    it("resolveConfigImageField returns the value untouched for non-refs", async () => {
      await expect(resolveConfigImageField("token", "data:image/png;base64,x")).resolves.toBe(
        "data:image/png;base64,x",
      );
      await expect(resolveConfigImageField(undefined, "x")).resolves.toBe("x");
    });

    it("resolveConfigImageField resolves a config image ref", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ data: "enc" }),
      } as never);
      await expect(resolveConfigImageField("token", "__cfgimg:couplePhoto")).resolves.toBe(
        "data:image/jpeg;base64,decoded",
      );
    });

    it("resolveConfigImageField returns undefined when the ref has no doc", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({ exists: () => false } as never);
      await expect(resolveConfigImageField("token", "__cfgimg:couplePhoto")).resolves.toBeUndefined();
    });

    it("resolveAllConfigImages skips refs without a doc", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({ exists: () => false } as never);
      const result = await resolveAllConfigImages("token", {
        couplePhoto: "__cfgimg:couplePhoto",
        customSeal: "data:image/png;base64,y",
      });
      expect(result.couplePhoto).toBeUndefined();
      expect(result.customSeal).toBeUndefined();
    });

    it("resolveAllConfigImages only resolves refs", async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ data: "enc" }),
      } as never);
      const result = await resolveAllConfigImages("token", {
        couplePhoto: "__cfgimg:couplePhoto",
        backgroundImage: "data:image/png;base64,x",
      });
      expect(result.couplePhoto).toBe("data:image/jpeg;base64,decoded");
      expect(result.backgroundImage).toBeUndefined();
    });

    it("deleteAllConfigImages resolves and no-ops when empty", async () => {
      await expect(deleteAllConfigImages("token")).resolves.toBeUndefined();
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: "r1" }],
      } as never);
      await expect(deleteAllConfigImages("token")).resolves.toBeUndefined();
    });
  });
});
