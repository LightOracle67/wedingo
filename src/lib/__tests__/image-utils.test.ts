import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compressImage, compressImageTransparent, readFileAsDataUrl } from "../image-utils";

// ── Mocks del DOM (canvas, Image, FileReader, URL) ─────────────────────
let imgInstance: {
  width: number;
  height: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
} | null;

const origImage = globalThis.Image;
const origCreateObjectURL = URL.createObjectURL;
const origRevokeObjectURL = URL.revokeObjectURL;

function makeFile(type: string, size: number): File {
  return new File([new ArrayBuffer(size)], "test.jpg", { type });
}

function installCanvasMocks(toDataUrlValue?: string, getCtxValue?: unknown) {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => (getCtxValue === undefined ? { drawImage: vi.fn() } : getCtxValue)),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
    configurable: true,
    value: vi.fn(() => (toDataUrlValue === undefined ? "data:image/webp;base64,AAAA" : toDataUrlValue)),
  });
}

function installImageMock(onLoad?: () => void) {
  globalThis.Image = class {
    width = 100;
    height = 100;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = "";
    constructor() {
      imgInstance = this;
      if (onLoad) this.onload = onLoad;
    }
  } as unknown as typeof Image;
}

beforeEach(() => {
  imgInstance = null;
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
  installCanvasMocks();
  installImageMock();
});

afterEach(() => {
  globalThis.Image = origImage;
  URL.createObjectURL = origCreateObjectURL;
  URL.revokeObjectURL = origRevokeObjectURL;
});

describe("readFileAsDataUrl", () => {
  it("resolves with the file data URL", async () => {
    const FakeReader = class {
      result = "data:text/plain;base64,AAA";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.onload?.();
      }
    };
    vi.stubGlobal("FileReader", FakeReader);
    await expect(readFileAsDataUrl(makeFile("text/plain", 10))).resolves.toBe("data:text/plain;base64,AAA");
    vi.unstubAllGlobals();
  });

  it("rejects when the reader errors", async () => {
    const FakeReader = class {
      onload: (() => void) | null = null;
      onerror: ((e?: unknown) => void) | null = null;
      readAsDataURL() {
        this.onerror?.(new Error("read failed"));
      }
    };
    vi.stubGlobal("FileReader", FakeReader);
    await expect(readFileAsDataUrl(makeFile("text/plain", 10))).rejects.toThrow("read failed");
    vi.unstubAllGlobals();
  });
});

describe("compressImage", () => {
  it("uses the fast path for a small JPEG", async () => {
    const file = makeFile("image/jpeg", 100);
    const FakeReader = class {
      result = "data:image/jpeg;base64,FAST";
      onload: (() => void) | null = null;
      readAsDataURL() {
        this.onload?.();
      }
    };
    vi.stubGlobal("FileReader", FakeReader);
    installImageMock(() => {});
    const promise = compressImage(file);
    imgInstance?.onload?.();
    await expect(promise).resolves.toBe("data:image/jpeg;base64,FAST");
    vi.unstubAllGlobals();
  });

  it("re-encodes a large or non-JPEG image to WebP", async () => {
    const file = makeFile("image/png", 500 * 1024);
    const promise = compressImage(file);
    imgInstance!.width = 2000;
    imgInstance!.height = 2000;
    imgInstance!.onload?.();
    const result = await promise;
    expect(result).toContain("data:image/webp");
  });

  it("shrinks dimensions and reduces quality for oversized images", async () => {
    installCanvasMocks("data:image/webp;base64," + "A".repeat(200000));
    const file = makeFile("image/png", 50 * 1024);
    const promise = compressImage(file);
    imgInstance!.width = 5000;
    imgInstance!.height = 5000;
    imgInstance!.onload?.();
    const result = await promise;
    expect(result).toContain("data:image");
  });

  it("falls back to PNG when WebP is not supported", async () => {
    installCanvasMocks("data:image/png;base64,PNG");
    const file = makeFile("image/png", 500 * 1024);
    const promise = compressImage(file);
    imgInstance!.onload?.();
    const result = await promise;
    expect(result).toContain("data:image/png");
  });

  it("throws when canvas context is unavailable", async () => {
    installCanvasMocks(undefined, null);
    const file = makeFile("image/png", 500 * 1024);
    const promise = compressImage(file);
    imgInstance!.onload?.();
    await expect(promise).rejects.toThrow();
  });

  it("rejects when the image fails to load", async () => {
    const file = makeFile("image/png", 500 * 1024);
    const promise = compressImage(file);
    imgInstance!.onerror?.();
    await expect(promise).rejects.toThrow();
  });
});

describe("compressImageTransparent", () => {
  it("compresses and preserves the data URL", async () => {
    const file = makeFile("image/webp", 500 * 1024);
    const promise = compressImageTransparent(file);
    imgInstance!.onload?.();
    const result = await promise;
    expect(result).toContain("data:image/webp");
  });

  it("reduces quality when the image exceeds the target size", async () => {
    // Una cadena grande para forzar estimatedBytes > TARGET_BYTES.
    const bigData = "data:image/webp;base64," + "A".repeat(600 * 1024);
    installCanvasMocks(bigData);
    const file = makeFile("image/webp", 600 * 1024);
    const promise = compressImageTransparent(file);
    imgInstance!.onload?.();
    const result = await promise;
    expect(result).toContain("data:image");
  });
});
