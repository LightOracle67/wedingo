import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../lib/geo-utils", () => ({
  isValidGoogleMapsUrl: (url: string) => url.startsWith("https://maps.google.com"),
  convertToEmbedUrl: (url: string, view: string = "roadmap") =>
    `${url.replace("maps.google.com", "maps.google.com/embed")}&t=${view === "satellite" ? "k" : view === "hybrid" ? "h" : "m"}&output=embed`,
}));

import WeddingMap from "../WeddingMap";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WeddingMap", () => {
  it("renders without crashing", () => {
    const { container } = render(<WeddingMap mapUrl="https://maps.google.com/maps?q=41.3874,2.1686" t={(key: string) => key} />);
    expect(container.querySelector(".story-map-wrapper")).toBeDefined();
  });

  it("renders iframe when valid url is provided", () => {
    const { container } = render(<WeddingMap mapUrl="https://maps.google.com/maps?q=41.3874,2.1686" t={(key: string) => key} />);
    expect(container.querySelector("iframe")).toBeDefined();
  });

  it("passes satellite view to the embed url", () => {
    const { container } = render(<WeddingMap mapUrl="https://maps.google.com/maps?q=41.3874,2.1686" t={(key: string) => key} mapView="satellite" />);
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain("t=k");
  });

  it("renders blocking overlay when staticMap", () => {
    const { container } = render(<WeddingMap mapUrl="https://maps.google.com/maps?q=41.3874,2.1686" t={(key: string) => key} staticMap />);
    const overlay = container.querySelector(".story-map-wrapper > div[aria-hidden='true']");
    expect(overlay).toBeDefined();
  });

  it("does not render blocking overlay when interactive", () => {
    const { container } = render(<WeddingMap mapUrl="https://maps.google.com/maps?q=41.3874,2.1686" t={(key: string) => key} />);
    expect(container.querySelector(".story-map-wrapper > div[aria-hidden='true']")).toBeNull();
  });

  it("renders nothing when no url", () => {
    const { container } = render(<WeddingMap t={(key: string) => key} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector(".story-map-wrapper")).toBeDefined();
  });
});
