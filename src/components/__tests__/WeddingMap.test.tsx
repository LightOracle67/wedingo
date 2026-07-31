import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../lib/geo-utils", () => ({
  isValidGoogleMapsUrl: (url: string) => url.startsWith("https://maps.google.com"),
  convertToEmbedUrl: (url: string) => url.replace("maps.google.com", "maps.google.com/embed"),
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

  it("renders nothing when no url", () => {
    const { container } = render(<WeddingMap t={(key: string) => key} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector(".story-map-wrapper")).toBeDefined();
  });
});
