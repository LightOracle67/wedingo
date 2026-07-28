import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockMapInstance = {
  remove: vi.fn(),
  whenReady: vi.fn((fn: () => void) => fn()),
  invalidateSize: vi.fn(),
};

const mockL = {
  map: vi.fn(() => mockMapInstance),
  tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  circleMarker: vi.fn(() => ({ addTo: vi.fn() })),
};

vi.mock("leaflet", () => ({ default: mockL }));
vi.mock("leaflet/dist/leaflet.css", () => ({}));

vi.mock("../../lib/geo-utils", () => ({
  getValidCoordinates: vi.fn((lat: string, lng: string) =>
    lat && lng ? { latitude: 41.3874, longitude: 2.1686 } : null
  ),
  resolveLocationTarget: vi.fn(() =>
    Promise.resolve({ latitude: 41.3874, longitude: 2.1686, label: "Barcelona" })
  ),
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
    render(<WeddingMap
      weddingLatitude="41.3874"
      weddingLongitude="2.1686"
      t={(key: string) => key}
    />);
    expect(document.querySelector(".page-loading")).toBeDefined();
  });

  it("shows no loading state when no place or coordinates", () => {
    render(<WeddingMap t={(key: string) => key} />);
    expect(document.querySelector(".page-loading")).toBeNull();
  });

  it("creates map when coordinates are provided", async () => {
    render(<WeddingMap
      weddingLatitude="41.3874"
      weddingLongitude="2.1686"
      t={(key: string) => key}
    />);
    await waitFor(() => {
      expect(mockL.map).toHaveBeenCalled();
    });
  });

  it("creates tileLayer with correct URL", async () => {
    render(<WeddingMap
      weddingLatitude="41.3874"
      weddingLongitude="2.1686"
      t={(key: string) => key}
    />);
    await waitFor(() => {
      expect(mockL.tileLayer).toHaveBeenCalledWith(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        expect.objectContaining({ attribution: expect.stringContaining("OpenStreetMap") })
      );
    });
  });

  it("creates circleMarker at the correct location", async () => {
    render(<WeddingMap
      weddingLatitude="41.3874"
      weddingLongitude="2.1686"
      t={(key: string) => key}
    />);
    await waitFor(() => {
      expect(mockL.circleMarker).toHaveBeenCalledWith(
        [41.3874, 2.1686],
        expect.objectContaining({ radius: 10 })
      );
    });
  });

  it("shows error state when geocoding fails", async () => {
    const { resolveLocationTarget } = await import("../../lib/geo-utils");
    (resolveLocationTarget as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    render(<WeddingMap
      weddingPlace="UnknownPlace"
      t={(key: string) => key}
    />);
    await waitFor(() => {
      expect(screen.getByText("public.locationNotFound")).toBeDefined();
    });
  });

  it("removes loading when map is ready", async () => {
    mockMapInstance.whenReady.mockImplementation((fn: () => void) => fn());
    render(<WeddingMap
      weddingLatitude="41.3874"
      weddingLongitude="2.1686"
      t={(key: string) => key}
    />);
    await waitFor(() => {
      expect(document.querySelector(".page-loading")).toBeNull();
    });
  });

  it("shows error state when map creation throws", async () => {
    const { resolveLocationTarget } = await import("../../lib/geo-utils");
    (resolveLocationTarget as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("geocode error"));
    render(<WeddingMap
      weddingLatitude="41.3874"
      weddingLongitude="2.1686"
      t={(key: string) => key}
    />);
    await waitFor(() => {
      expect(screen.getByText("public.locationMapError")).toBeDefined();
    });
  });

  it("handles cancellation before geocoding completes", async () => {
    let resolvePromise: (v: unknown) => void;
    const { resolveLocationTarget } = await import("../../lib/geo-utils");
    (resolveLocationTarget as ReturnType<typeof vi.fn>).mockReturnValue(new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    const { unmount } = render(<WeddingMap
      weddingLatitude="41.3874"
      weddingLongitude="2.1686"
      t={(key: string) => key}
    />);
    unmount();
    resolvePromise!({ latitude: 41.3874, longitude: 2.1686, label: "Barcelona" });
    await vi.waitFor(() => {
      expect(mockL.map).not.toHaveBeenCalled();
    });
  });

  it("handles isCancelled in the catch block", async () => {
    let rejectPromise: (e: Error) => void;
    const { resolveLocationTarget } = await import("../../lib/geo-utils");
    const promise = new Promise((_, reject) => {
      rejectPromise = reject;
    });
    promise.catch(() => {});
    (resolveLocationTarget as ReturnType<typeof vi.fn>).mockReturnValue(promise);

    const { unmount } = render(<WeddingMap
      weddingLatitude="41.3874"
      weddingLongitude="2.1686"
      t={(key: string) => key}
    />);
    unmount();
    rejectPromise!(new Error("async error"));
    await vi.waitFor(() => {
      expect(screen.queryByText("public.locationMapError")).toBeNull();
    });
  });

  it("handles disconnected container", async () => {
    const { resolveLocationTarget } = await import("../../lib/geo-utils");
    (resolveLocationTarget as ReturnType<typeof vi.fn>).mockResolvedValue({
      latitude: 41.3874, longitude: 2.1686, label: "Barcelona",
    });

    render(<WeddingMap
      weddingLatitude="41.3874"
      weddingLongitude="2.1686"
      t={(key: string) => key}
    />);

    await waitFor(() => {
      expect(mockL.map).toHaveBeenCalled();
    });
  });
});
