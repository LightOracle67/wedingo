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
    render(<AccommodationSection className="test-class" style={{}} accommodationURL="" />);
    expect(screen.getByText("accommodation.pending")).toBeDefined();
  });

  it("renders the map and place name when the URL is valid", () => {
    render(
      <AccommodationSection
        className="test-class"
        style={{}}
        accommodationURL="https://www.google.com/maps/place/Hotel+Sol/@40.41,-3.70,17z"
        mapView="hybrid"
        staticMap
      />,
    );
    expect(screen.getByTestId("map-embed")).toBeDefined();
    expect(screen.getByText("Hotel Sol")).toBeDefined();
    expect(screen.getByText("details.viewGoogleMaps")).toBeDefined();
  });

  it("shows pending state for an invalid URL", () => {
    render(
      <AccommodationSection
        className="test-class"
        style={{}}
        accommodationURL="https://maps.app.goo.gl/abc"
      />,
    );
    expect(screen.getByText("accommodation.pending")).toBeDefined();
    expect(screen.queryByTestId("map-embed")).toBeNull();
  });

  it("shows only the place name when accommodationMapMode is 'name'", () => {
    render(
      <AccommodationSection
        className="test-class"
        style={{}}
        accommodationURL="https://www.google.com/maps/place/Hotel+Sol/@40.41,-3.70,17z"
        accommodationMapMode="name"
      />,
    );
    expect(screen.getByText("Hotel Sol")).toBeDefined();
    expect(screen.queryByTestId("map-embed")).toBeNull();
    expect(screen.queryByText("details.viewGoogleMaps")).toBeNull();
  });

  it("hides the accommodation map when accommodationMapMode is 'hidden'", () => {
    render(
      <AccommodationSection
        className="test-class"
        style={{}}
        accommodationURL="https://www.google.com/maps/place/Hotel+Sol/@40.41,-3.70,17z"
        accommodationMapMode="hidden"
      />,
    );
    expect(screen.queryByText("Hotel Sol")).toBeNull();
    expect(screen.queryByTestId("map-embed")).toBeNull();
    expect(screen.getByText("accommodation.pending")).toBeDefined();
  });
});
