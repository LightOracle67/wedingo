import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

vi.mock("../../../components/MapEmbed", () => ({
  default: () => <div data-testid="wedding-map">Map</div>,
}));

vi.mock("../../../contexts", () => ({
  useConfigActions: () => ({
    updateFormField: vi.fn(),
    handleDayChange: vi.fn(),
    handleTimeChange: vi.fn(),
    handleTimeBlur: vi.fn(),
    handleYearChange: vi.fn(),
    maxAllowedYear: 2099,
    inviteToken: "",
    hasStoredConfig: false,
  }),

  useConfig: () => ({
    config: {
      firstName: "John",
      secondName: "Jane",
      weddingDay: "15",
      weddingMonth: "Jun",
      weddingYear: "2025",
      weddingHour: "18",
      weddingMinute: "30",
      weddingPlace: "Church",
    },
  }),
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
  weddingSiteURL: "https://maps.google.com/maps?q=40.4168,-3.7038",
  configWeddingPlace: "Madrid",
};

describe("DetailsSection", () => {
  it("renders with all data", () => {
    render(<DetailsSection {...baseProps} />);
    expect(screen.getByText("details.sectionLabel")).toBeDefined();
    expect(screen.getByText("15 Jun 2025")).toBeDefined();
    expect(screen.getByText("details.timeLabel")).toBeDefined();
    expect(screen.getByText("Madrid")).toBeDefined();
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
        calendarLink={""}
        weddingSiteURL=""
      />,
    );
    expect(screen.getByText("details.datePending")).toBeDefined();
    expect(screen.getByText("details.timePending")).toBeDefined();
    expect(screen.getByText("details.placePending")).toBeDefined();
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
        calendarLink={""}
        weddingSiteURL=""
      />,
    );
    expect(screen.getByText("Unknown location")).toBeDefined();
  });

  it("shows the time pending label when there is no time", () => {
    render(
      <DetailsSection
        style={{}}
        className="test"
        formattedDate="15 Jun 2025"
        formattedTime=""
        hasLocationData={true}
        locationDescription="Madrid"
        calendarLink={""}
        weddingSiteURL=""
      />,
    );
    expect(screen.getByText("details.timePending")).toBeDefined();
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
        calendarLink={""}
        weddingSiteURL=""
      />,
    );
    expect(screen.getByText("details.placePending")).toBeDefined();
    expect(screen.queryByText("details.viewGoogleMaps")).toBeNull();
    expect(screen.queryByTestId("wedding-map")).toBeNull();
  });

  it("shows only the location name when detailsMapMode is 'name'", () => {
    render(<DetailsSection {...baseProps} detailsMapMode="name" />);
    expect(screen.getByText("Madrid")).toBeDefined();
    expect(screen.queryByTestId("wedding-map")).toBeNull();
    expect(screen.queryByText("details.viewGoogleMaps")).toBeNull();
  });

  it("hides the location block when detailsMapMode is 'hidden'", () => {
    render(<DetailsSection {...baseProps} detailsMapMode="hidden" />);
    expect(screen.queryByText("details.locationLabel")).toBeNull();
    expect(screen.queryByText("Madrid")).toBeNull();
    expect(screen.queryByTestId("wedding-map")).toBeNull();
    expect(screen.queryByText("details.viewGoogleMaps")).toBeNull();
  });

  it("downloads an .ics file with the wedding event", async () => {
    const createUrl = vi.fn(() => "blob:ics");
    const revokeUrl = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<DetailsSection {...baseProps} />);
    fireEvent.click(screen.getByText("details.addToIcs"));
    expect(createUrl).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

});
