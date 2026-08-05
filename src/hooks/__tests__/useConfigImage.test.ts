import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConfigImage } from "../useConfigImage";

const mocks = vi.hoisted(() => ({
  getConfigImage: vi.fn(),
  isConfigImageRef: vi.fn(),
}));

vi.mock("../../lib/image-store", () => ({
  getConfigImage: mocks.getConfigImage,
  isConfigImageRef: mocks.isConfigImageRef,
}));

describe("useConfigImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isConfigImageRef.mockReturnValue(false);
  });

  it("returns undefined when there is no field value", () => {
    const { result } = renderHook(() => useConfigImage("token", null));
    expect(result.current).toBeUndefined();
    expect(mocks.getConfigImage).not.toHaveBeenCalled();
  });

  it("passes through a plain (non-ref) value", async () => {
    mocks.isConfigImageRef.mockReturnValue(false);
    const { result } = renderHook(() => useConfigImage("token", "https://img.example/photo.jpg"));
    await waitFor(() => {
      expect(result.current).toBe("https://img.example/photo.jpg");
    });
    expect(mocks.getConfigImage).not.toHaveBeenCalled();
  });

  it("resolves a config image ref through the image store", async () => {
    mocks.isConfigImageRef.mockReturnValue(true);
    mocks.getConfigImage.mockResolvedValue("data:image/webp;base64,abc");
    const { result } = renderHook(() => useConfigImage("tok123456", "__cfgimg:img-1"));
    await waitFor(() => {
      expect(result.current).toBe("data:image/webp;base64,abc");
    });
    expect(mocks.getConfigImage).toHaveBeenCalledWith("tok123456", "img-1");
  });

  it("keeps undefined when the store returns nothing", async () => {
    mocks.isConfigImageRef.mockReturnValue(true);
    mocks.getConfigImage.mockResolvedValue(null);
    const { result } = renderHook(() => useConfigImage("tok123456", "__cfgimg:img-2"));
    await waitFor(() => {
      expect(mocks.getConfigImage).toHaveBeenCalled();
    });
    expect(result.current).toBeUndefined();
  });

  it("stays undefined for a ref without an invite token", () => {
    mocks.isConfigImageRef.mockReturnValue(true);
    const { result } = renderHook(() => useConfigImage(undefined, "__cfgimg:img-3"));
    expect(result.current).toBeUndefined();
    expect(mocks.getConfigImage).not.toHaveBeenCalled();
  });
});
