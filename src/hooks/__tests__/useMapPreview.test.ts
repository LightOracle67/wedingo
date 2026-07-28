import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

const mockGetValidCoordinates = vi.fn();
const mockResolveLocationTarget = vi.fn();
const mockBuildOpenFreeMapPreviewUrl = vi.fn();

vi.mock("../../lib/geo-utils", () => ({
  getValidCoordinates: (...args: unknown[]) => mockGetValidCoordinates(...args),
  resolveLocationTarget: (...args: unknown[]) => mockResolveLocationTarget(...args),
}));

vi.mock("../../lib/map-utils", () => ({
  buildOpenFreeMapPreviewUrl: (...args: unknown[]) => mockBuildOpenFreeMapPreviewUrl(...args),
}));

import { useMapPreview } from "../useMapPreview";

describe("useMapPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty previews and not loading for empty location", () => {
    const { result } = renderHook(() => useMapPreview("", "", ""));
    expect(result.current.previewBackgrounds).toEqual([]);
    expect(result.current.isPreviewLoading).toBe(false);
  });

  it("returns empty previews for whitespace-only place", () => {
    const { result } = renderHook(() => useMapPreview("   ", "", ""));
    expect(result.current.previewBackgrounds).toEqual([]);
    expect(result.current.isPreviewLoading).toBe(false);
  });

  it("returns expected interface properties", () => {
    const { result } = renderHook(() => useMapPreview("Place", "1", "2"));
    expect(result.current).toHaveProperty("previewBackgrounds");
    expect(result.current).toHaveProperty("isPreviewLoading");
    expect(result.current).toHaveProperty("setPreviewBackgrounds");
    expect(result.current).toHaveProperty("setIsPreviewLoading");
  });

  it("generates previews for valid coordinates", async () => {
    mockGetValidCoordinates.mockReturnValue({ latitude: 40.4168, longitude: -3.7038 });
    mockResolveLocationTarget.mockResolvedValue({ latitude: 40.4168, longitude: -3.7038, label: "Test" });
    mockBuildOpenFreeMapPreviewUrl.mockResolvedValue("data:image/png;base64,test");

    const { result } = renderHook(() => useMapPreview("Place", "40.4168", "-3.7038"));

    await waitFor(() => {
      expect(result.current.previewBackgrounds.length).toBeGreaterThan(0);
    });

    expect(result.current.previewBackgrounds[0]).toMatchObject({
      id: "default",
      src: "data:image/png;base64,test",
    });
    expect(result.current.isPreviewLoading).toBe(false);
  });

  it("handles resolveLocationTarget returning null", async () => {
    mockGetValidCoordinates.mockReturnValue({ latitude: 40.4168, longitude: -3.7038 });
    mockResolveLocationTarget.mockResolvedValue(null);

    const { result } = renderHook(() => useMapPreview("Place", "40.4168", "-3.7038"));

    await waitFor(() => {
      expect(result.current.previewBackgrounds).toEqual([]);
    });
  });

  it("sets preview background when buildOpenFreeMapPreviewUrl returns valid URL", async () => {
    mockGetValidCoordinates.mockReturnValue({ latitude: 40.4168, longitude: -3.7038 });
    mockResolveLocationTarget.mockResolvedValue({ latitude: 40.4168, longitude: -3.7038, label: "Test" });
    mockBuildOpenFreeMapPreviewUrl.mockResolvedValue("data:image/png;base64,valid");

    const { result } = renderHook(() => useMapPreview("Place", "40.4168", "-3.7038"));

    await waitFor(() => {
      expect(result.current.previewBackgrounds.length).toBeGreaterThan(0);
    });
    expect(result.current.previewBackgrounds[0].id).toBe("default");
  });

  it("handles buildOpenFreeMapPreviewUrl returning empty", async () => {
    mockGetValidCoordinates.mockReturnValue({ latitude: 40.4168, longitude: -3.7038 });
    mockResolveLocationTarget.mockResolvedValue({ latitude: 40.4168, longitude: -3.7038, label: "Test" });
    mockBuildOpenFreeMapPreviewUrl.mockResolvedValue("");

    const { result } = renderHook(() => useMapPreview("Place", "40.4168", "-3.7038"));

    await waitFor(() => {
      expect(result.current.previewBackgrounds).toEqual([]);
    });
  });

  it("handles stale request after resolveLocationTarget returns null", async () => {
    vi.useFakeTimers();
    mockGetValidCoordinates.mockReturnValue({ latitude: 40.4168, longitude: -3.7038 });
    let resolve: (v: unknown) => void;
    const promise = new Promise((r) => { resolve = r; });
    mockResolveLocationTarget.mockReturnValue(promise);

    const { result, rerender } = renderHook(
      (props: { place: string; lat: string; lng: string }) => useMapPreview(props.place, props.lat, props.lng),
      { initialProps: { place: "Madrid", lat: "40.4168", lng: "-3.7038" } }
    );

    rerender({ place: "Barcelona", lat: "41.3874", lng: "2.1686" });
    vi.advanceTimersByTime(350);
    resolve!(null);
    await vi.waitFor(() => {
      expect(result.current.previewBackgrounds).toEqual([]);
    });
    vi.useRealTimers();
  });

  it("handles stale request after buildOpenFreeMapPreviewUrl returns", async () => {
    vi.useFakeTimers();
    mockGetValidCoordinates.mockReturnValue({ latitude: 40.4168, longitude: -3.7038 });
    let resolve: (v: unknown) => void;
    const promise = new Promise((r) => { resolve = r; });
    mockResolveLocationTarget.mockResolvedValue({ latitude: 40.4168, longitude: -3.7038, label: "Test" });
    mockBuildOpenFreeMapPreviewUrl.mockReturnValue(promise);

    const { result, rerender } = renderHook(
      (props: { place: string; lat: string; lng: string }) => useMapPreview(props.place, props.lat, props.lng),
      { initialProps: { place: "Madrid", lat: "40.4168", lng: "-3.7038" } }
    );

    rerender({ place: "Barcelona", lat: "41.3874", lng: "2.1686" });
    vi.advanceTimersByTime(350);
    resolve!("data:image/png;base64,test");
    await vi.waitFor(() => {
      expect(result.current.previewBackgrounds).toEqual([]);
    });
    vi.useRealTimers();
  });

  it("ignores stale resolveLocationTarget result on rerender", async () => {
    vi.useFakeTimers();
    mockGetValidCoordinates.mockReturnValue({ latitude: 40.4168, longitude: -3.7038 });

    let resolveFirst: (v: unknown) => void;
    const firstPromise = new Promise((r) => { resolveFirst = r; });
    mockResolveLocationTarget.mockReturnValueOnce(firstPromise);
    mockResolveLocationTarget.mockResolvedValue({ latitude: 41.3874, longitude: 2.1686, label: "Barcelona" });
    mockBuildOpenFreeMapPreviewUrl.mockResolvedValue("");

    const { rerender, result } = renderHook(
      (props: { place: string; lat: string; lng: string }) => useMapPreview(props.place, props.lat, props.lng),
      { initialProps: { place: "Madrid", lat: "40.4168", lng: "-3.7038" } }
    );

    vi.advanceTimersByTime(350);
    rerender({ place: "Barcelona", lat: "41.3874", lng: "2.1686" });
    resolveFirst!(null);
    await vi.waitFor(() => {
      expect(result.current.isPreviewLoading).toBe(true);
    });
    vi.useRealTimers();
  });
});
