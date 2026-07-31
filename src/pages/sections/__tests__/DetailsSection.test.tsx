import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("../../../lib/geo-utils", () => ({
  isValidGoogleMapsUrl: (url: string) => url.startsWith("https://maps.google.com"),
}));

vi.mock("../../../lib/utils", () => ({
  buildGoogleMapsUrl: vi.fn(() => "https://maps.google.com"),
  buildAppleMapsUrl: vi.fn(() => "https://maps.apple.com"),
  buildGoogleMapsSearchUrl: vi.fn(() => "https://maps.google.com/search"),
  buildAppleMapsSearchUrl: vi.fn(() => "https://maps.apple.com/search"),
}));

vi.mock("../../../components/WeddingMap", () => ({
  default: () => <div data-testid="wedding-map">Map</div>,
}));

import DetailsSection from "../DetailsSection";

const baseProps = {
  style: {},
  className: "test",
  formattedDate: "15 Jun 2025",
  formattedTime: "18:30",
  hasLocationData: true,
  locationDescription: "Madrid",
  calendarLink: "https://calendar.example.com",
  weddingMapUrl: "https://maps.google.com/maps?q=40.4168,-3.7038",
  configWeddingPlace: "Madrid",
  transportInfo: "Bus available",
};

describe("DetailsSection", () => {
  it("renders with all data", () => {
    render(<DetailsSection {...baseProps} />);
    expect(screen.getByText("details.sectionLabel")).toBeDefined();
    expect(screen.getByText("15 Jun 2025")).toBeDefined();
    expect(screen.getByText("details.timeLabel")).toBeDefined();
    expect(screen.getByText("details.welcomeWithTime")).toBeDefined();
    expect(screen.getByText("Madrid")).toBeDefined();
    expect(screen.getByText("details.transport")).toBeDefined();
    expect(screen.getByText("details.addToCalendar")).toBeDefined();
    expect(screen.getByTestId("wedding-map")).toBeDefined();
    expect(screen.getByText("details.viewGoogleMaps")).toBeDefined();
  });

  it("renders without location data", () => {
    render(
      <DetailsSection
        style={{}}
        className="test"
        formattedDate=""
        formattedTime=""
        hasLocationData={false}
        locationDescription=""
        calendarLink={null}
        weddingMapUrl=""
        configWeddingPlace=""
        transportInfo=""
      />,
    );
    expect(screen.getByText("details.datePending")).toBeDefined();
    expect(screen.getByText("details.timePending")).toBeDefined();
    expect(screen.getByText("details.placePending")).toBeDefined();
    expect(screen.getByText("details.welcomeWithoutTime")).toBeDefined();
  });

  it("renders with only location description (no map target)", () => {
    render(
      <DetailsSection
        style={{}}
        className="test"
        formattedDate="15 Jun 2025"
        formattedTime="18:30"
        hasLocationData={true}
        locationDescription="Unknown location"
        calendarLink={null}
        weddingMapUrl=""
        configWeddingPlace="Madrid"
        transportInfo=""
      />,
    );
    expect(screen.getByText("Unknown location")).toBeDefined();
  });

  it("renders with no location data", () => {
    render(
      <DetailsSection
        style={{}}
        className="test"
        formattedDate="15 Jun 2025"
        formattedTime="18:30"
        hasLocationData={false}
        locationDescription=""
        calendarLink={null}
        weddingMapUrl=""
        configWeddingPlace=""
        transportInfo=""
      />,
    );
    expect(screen.getByText("details.placePending")).toBeDefined();
    expect(screen.queryByText("details.viewGoogleMaps")).toBeNull();
    expect(screen.queryByTestId("wedding-map")).toBeNull();
  });
});
