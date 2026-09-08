import { describe, it, expect, vi } from "vitest";

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(() => Promise.resolve({ id: "new-doc" })),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => undefined })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(() => "gal"),
  doc: vi.fn(() => ({ id: "doc-id" })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "ts"),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("../firebase", () => ({ db: {} }));

vi.mock("../../i18n", () => ({ default: { t: (key: string) => key } }));

vi.mock("../image-utils", () => ({
  compressImage: vi.fn(() => Promise.resolve("data:image/jpeg;base64,mini")),
  MAX_IMAGE_DIMENSION: 1600,
  TARGET_BYTES: 300 * 1024,
  THUMB_MAX_DIMENSION: 128,
  THUMB_TARGET_BYTES: 24 * 1024,
}));

vi.mock("../crypto-utils", () => ({
  encrypt: vi.fn((data: string) => Promise.resolve(`enc:${data}`)),
  // Descifrado fallido: cubre el catch de get*ImageUrl/getGalleryThumbUrl.
  decrypt: vi.fn(() => Promise.reject(new Error("descifrado fallido"))),
}));

import { prepareGalleryThumb, getGalleryThumbUrl, getGalleryImageUrl } from "../image-store";

describe("image-store: bordes de miniatura y descifrado", () => {
  it("prepareGalleryThumb devuelve thumbDataUrl y thumbEncrypted en el flujo feliz", async () => {
    const out = await prepareGalleryThumb("tok", new File(["x"], "a.png", { type: "image/png" }));
    expect(out.thumbDataUrl).toBe("data:image/jpeg;base64,mini");
    expect(out.thumbEncrypted).toBe("enc:data:image/jpeg;base64,mini");
  });

  it("getGalleryThumbUrl devuelve '' cuando el descifrado de la miniatura falla", async () => {
    await expect(
      getGalleryThumbUrl("tok", { id: "i1", encrypted: "e", thumbEncrypted: "enc", description: "" }),
    ).resolves.toBe("");
  });

  it("getGalleryImageUrl devuelve '' cuando el descifrado falla", async () => {
    await expect(
      getGalleryImageUrl("tok", { id: "i1", encrypted: "e", thumbEncrypted: "", description: "" }),
    ).resolves.toBe("");
  });
});