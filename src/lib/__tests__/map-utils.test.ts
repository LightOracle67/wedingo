import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildOpenFreeMapPreviewUrl } from "../map-utils";

const mockCtx = {
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
};

const createMockCanvas = () => {
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => mockCtx),
    toDataURL: vi.fn(() => "data:image/png;base64,mock"),
  };
  return canvas;
};

let mockCanvas: ReturnType<typeof createMockCanvas>;

describe("buildOpenFreeMapPreviewUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return mockCanvas as unknown as HTMLCanvasElement;
      return document.createElement(tag);
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob()),
    });
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({});
  });

  it("returns empty string for null location", async () => {
    expect(await buildOpenFreeMapPreviewUrl(null)).toBe("");
  });

  it("returns empty string for undefined location", async () => {
    expect(await buildOpenFreeMapPreviewUrl(undefined)).toBe("");
  });

  it("fetches tiles and draws to canvas for valid location", async () => {
    const location = { latitude: 40.4168, longitude: -3.7038 };
    const result = await buildOpenFreeMapPreviewUrl(location);

    expect(result).toBe("data:image/png;base64,mock");
    expect(mockCanvas.width).toBe(600);
    expect(mockCanvas.height).toBe(600);
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it("fetches correct tile URLs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const location = { latitude: 40.4168, longitude: -3.7038 };
    await buildOpenFreeMapPreviewUrl(location);

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrls = fetchSpy.mock.calls.map((c) => c[0]);
    calledUrls.forEach((url: string) => {
      expect(url).toMatch(/^https:\/\/tile\.openstreetmap\.org\/15\/\d+\/\d+\.png$/);
    });
  });

  it("handles tile fetch failure gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Tile fetch failed"));
    const location = { latitude: 40.4168, longitude: -3.7038 };
    const result = await buildOpenFreeMapPreviewUrl(location);

    expect(result).toBe("data:image/png;base64,mock");
  });

  it("handles canvas toDataURL failure", async () => {
    const badCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => { throw new Error("toDataURL failed"); }),
    };
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return badCanvas as unknown as HTMLCanvasElement;
      return document.createElement(tag);
    });

    const location = { latitude: 40.4168, longitude: -3.7038 };
    const result = await buildOpenFreeMapPreviewUrl(location);
    expect(result).toBe("");
  });

  it("returns empty string when canvas is unavailable", async () => {
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return { getContext: vi.fn(() => null) } as unknown as HTMLCanvasElement;
      return document.createElement(tag);
    });

    const location = { latitude: 40.4168, longitude: -3.7038 };
    const result = await buildOpenFreeMapPreviewUrl(location);
    expect(result).toBe("");
  });
});
