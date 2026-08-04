import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../components/MapEmbed", () => ({
  default: ({ mapUrl }: { mapUrl?: string }) => <div data-testid="map-embed">{mapUrl}</div>,
}));

import AccommodationSection from "../AccommodationSection";

describe("AccommodationSection", () => {
  it("renders pending state without data", () => {
    render(<AccommodationSection className="test-class" style={{}} accommodationInfo="" accommodationURL="" />);
    expect(screen.getByText("accommodation.pending")).toBeDefined();
  });

  it("falls back to legacy accommodationInfo text", () => {
    render(<AccommodationSection className="test-class" style={{}} accommodationInfo="Hotel XYZ" accommodationURL="" />);
    expect(screen.getByText("Hotel XYZ")).toBeDefined();
    expect(screen.queryByTestId("map-embed")).toBeNull();
  });

  it("renders the map and place name when the URL is valid", () => {
    render(
      <AccommodationSection
        className="test-class"
        style={{}}
        accommodationInfo=""
        accommodationURL="https://www.google.com/maps/place/Hotel+Sol/@40.41,-3.70,17z"
        mapView="hybrid"
        staticMap
      />,
    );
    expect(screen.getByTestId("map-embed")).toBeDefined();
    expect(screen.getByText("Hotel Sol")).toBeDefined();
    expect(screen.getByText("details.viewGoogleMaps")).toBeDefined();
  });

  it("ignores an invalid URL and shows the legacy text", () => {
    render(
      <AccommodationSection
        className="test-class"
        style={{}}
        accommodationInfo="Hotel XYZ"
        accommodationURL="https://maps.app.goo.gl/abc"
      />,
    );
    expect(screen.getByText("Hotel XYZ")).toBeDefined();
    expect(screen.queryByTestId("map-embed")).toBeNull();
  });
});
