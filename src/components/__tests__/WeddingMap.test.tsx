import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockResolve = vi.fn(() => Promise.resolve({ latitude: 41.3874, longitude: 2.1686, label: "Barcelona" }));

vi.mock("../../lib/geo-utils", () => ({
  getValidCoordinates: vi.fn((lat: string, lng: string) =>
    lat && lng ? { latitude: 41.3874, longitude: 2.1686 } : null
  ),
  resolveLocationTarget: (...args: unknown[]) => mockResolve(...args),
  buildGoogleMapsEmbedUrl: vi.fn(() => "https://maps.google.com/maps?q=41.3874,2.1686&hl=es&z=14&output=embed"),
  buildGoogleMapsEmbedSearchUrl: vi.fn(() => "https://maps.google.com/maps?q=Barcelona&hl=es&z=14&output=embed"),
}));

import WeddingMap from "../WeddingMap";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WeddingMap", () => {
  it("renders without crashing", () => {
    const { container } = render(<WeddingMap t={(key: string) => key} />);
    expect(container.querySelector(".story-map-wrapper")).toBeDefined();
  });

  it("shows loading state initially when coordinates are provided", () => {
    render(<WeddingMap weddingLatitude="41.3874" weddingLongitude="2.1686" t={(key: string) => key} />);
    expect(document.querySelector(".page-loading")).toBeDefined();
  });

  it("shows no loading state when no place or coordinates", () => {
    render(<WeddingMap t={(key: string) => key} />);
    expect(document.querySelector(".page-loading")).toBeNull();
  });

  it("renders iframe when location is resolved", async () => {
    render(<WeddingMap weddingLatitude="41.3874" weddingLongitude="2.1686" t={(key: string) => key} />);
    await waitFor(() => {
      expect(document.querySelector("iframe")).toBeDefined();
    });
  });

  it("shows error state when geocoding fails", async () => {
    mockResolve.mockResolvedValueOnce(null);
    render(<WeddingMap weddingPlace="UnknownPlace" t={(key: string) => key} />);
    await waitFor(() => {
      expect(screen.getByText("public.locationNotFound")).toBeDefined();
    });
  });

  it("shows error state when geocoding throws", async () => {
    mockResolve.mockRejectedValueOnce(new Error("geocode error"));
    render(<WeddingMap weddingLatitude="41.3874" weddingLongitude="2.1686" t={(key: string) => key} />);
    await waitFor(() => {
      expect(screen.getByText("public.locationMapError")).toBeDefined();
    });
  });

  it("handles cancellation before geocoding completes", async () => {
    let resolvePromise: (v: unknown) => void;
    mockResolve.mockReturnValueOnce(new Promise((resolve) => { resolvePromise = resolve; }));
    const { unmount } = render(<WeddingMap weddingLatitude="41.3874" weddingLongitude="2.1686" t={(key: string) => key} />);
    unmount();
    resolvePromise!({ latitude: 41.3874, longitude: 2.1686, label: "Barcelona" });
    await vi.waitFor(() => {
      expect(document.querySelector("iframe")).toBeNull();
    });
  });

  it("handles catch error after cancellation", async () => {
    let rejectPromise: (e: Error) => void;
    const promise = new Promise((_, reject) => { rejectPromise = reject; });
    promise.catch(() => {});
    mockResolve.mockReturnValueOnce(promise);
    const { unmount } = render(<WeddingMap weddingLatitude="41.3874" weddingLongitude="2.1686" t={(key: string) => key} />);
    unmount();
    rejectPromise!(new Error("async error"));
    await vi.waitFor(() => {
      expect(screen.queryByText("public.locationMapError")).toBeNull();
    });
  });

  it("renders nothing when no place or coordinates provided", () => {
    render(<WeddingMap t={(key: string) => key} />);
    expect(document.querySelector(".page-loading")).toBeNull();
    expect(screen.queryByText("public.locationNotFound")).toBeNull();
    expect(document.querySelector("iframe")).toBeNull();
  });
});
