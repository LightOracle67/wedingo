import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUpdateFormField = vi.fn();
const mockHandleDayChange = vi.fn();
const mockHandleYearChange = vi.fn();
const mockHandleHourChange = vi.fn();
const mockHandleMinuteChange = vi.fn();
const mockHandleMinuteBlur = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../lib/constants", () => ({
  MONTH_OPTIONS: [
    { value: "enero", label: "Enero" },
    { value: "febrero", label: "Febrero" },
    { value: "marzo", label: "Marzo" },
    { value: "undefmonth", label: "Undefined" },
  ],
  MONTH_VALUE_TO_NUMBER: { enero: 1, febrero: 2, marzo: 3 },
}));

const mockFormData = vi.hoisted(() => ({ weddingSiteURL: "" }));
vi.mock("../../../lib/geo-utils", () => ({
  isValidGoogleMapsUrl: (url: string) => url.startsWith("https://maps.google.com"),
  convertToEmbedUrl: (url: string) => url.replace("maps.google.com", "maps.google.com/embed"),
  extractPlaceNameFromUrl: (url: string) => (url.includes("place") ? "Iglesia San José" : ""),
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: mockFormData,
    updateFormField: mockUpdateFormField,
    handleDayChange: mockHandleDayChange,
    handleYearChange: mockHandleYearChange,
    handleHourChange: mockHandleHourChange,
    handleMinuteChange: mockHandleMinuteChange,
    handleMinuteBlur: mockHandleMinuteBlur,
    maxAllowedYear: 2099,
  }),
}));

import DateSectionForm from "../DateSectionForm";

describe("DateSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData.weddingSiteURL = "";
  });

  it("renders without crashing", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.mapUrlLabel")).toBeDefined();
  });

  it("renders date fields", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.dayLabel")).toBeDefined();
    expect(screen.getByText("setup.monthLabel")).toBeDefined();
    expect(screen.getByText("setup.yearLabel")).toBeDefined();
  });

  it("renders time fields", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.hourLabel")).toBeDefined();
    expect(screen.getByText("setup.minuteLabel")).toBeDefined();
  });

  it("renders year max hint", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.yearMaxHint")).toBeDefined();
  });

  it("renders schedule textarea", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.scheduleLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.schedulePlaceholder")).toBeDefined();
  });

  it("renders month options", () => {
    render(<DateSectionForm />);
    const select = screen.getByLabelText("setup.monthLabel");
    expect(select).toBeDefined();
    const options = screen.getAllByRole("option");
    expect(options.length).toBe(8);
  });

  it("calls handleDayChange on day input change", () => {
    render(<DateSectionForm />);
    const input = screen.getByLabelText("setup.dayLabel");
    fireEvent.change(input, { target: { value: "15" } });
    expect(mockHandleDayChange).toHaveBeenCalledWith("15");
  });

  it("calls updateFormField on month select change", () => {
    render(<DateSectionForm />);
    const select = screen.getByLabelText("setup.monthLabel");
    fireEvent.change(select, { target: { value: "marzo" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingMonth", "marzo");
  });

  it("calls handleYearChange on year input change", () => {
    render(<DateSectionForm />);
    const input = screen.getByLabelText("setup.yearLabel");
    fireEvent.change(input, { target: { value: "2025" } });
    expect(mockHandleYearChange).toHaveBeenCalledWith("2025");
  });

  it("calls handleHourChange on hour input change", () => {
    render(<DateSectionForm />);
    const input = screen.getByLabelText("setup.hourLabel");
    fireEvent.change(input, { target: { value: "14" } });
    expect(mockHandleHourChange).toHaveBeenCalledWith("14");
  });

  it("calls handleMinuteChange on minute input change", () => {
    render(<DateSectionForm />);
    const input = screen.getByLabelText("setup.minuteLabel");
    fireEvent.change(input, { target: { value: "30" } });
    expect(mockHandleMinuteChange).toHaveBeenCalledWith("30");
  });

  it("calls handleMinuteBlur on minute blur", () => {
    render(<DateSectionForm />);
    const input = screen.getByLabelText("setup.minuteLabel");
    fireEvent.blur(input);
    expect(mockHandleMinuteBlur).toHaveBeenCalled();
  });

  it("calls updateFormField on schedule change", () => {
    render(<DateSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.schedulePlaceholder");
    fireEvent.change(textarea, { target: { value: "Ceremony at 5pm" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingSchedule", "Ceremony at 5pm");
  });

  it("limits schedule to 2000 characters", () => {
    render(<DateSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.schedulePlaceholder");
    const longText = "a".repeat(3000);
    fireEvent.change(textarea, { target: { value: longText } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingSchedule", "a".repeat(2000));
  });

  it("renders site URL input", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.mapUrlLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.mapUrlPlaceholder")).toBeDefined();
    expect(screen.getByText("setup.mapUrlHowTo")).toBeDefined();
  });

  it("calls updateFormField with weddingSiteURL on input change", () => {
    render(<DateSectionForm />);
    const input = screen.getByLabelText("setup.mapUrlLabel");
    fireEvent.change(input, { target: { value: "https://maps.google.com/maps/place/Madrid" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingSiteURL", "https://maps.google.com/maps/place/Madrid");
  });

  it("does not render a venue name input", () => {
    render(<DateSectionForm />);
    expect(screen.queryByText("setup.placeLabel")).toBeNull();
    expect(screen.queryByPlaceholderText("setup.placePlaceholder")).toBeNull();
  });

  it("renders iframe preview when valid URL entered", () => {
    mockFormData.weddingSiteURL = "https://maps.google.com/maps?q=40.4168,-3.7038";
    render(<DateSectionForm />);
    expect(document.querySelector("iframe")).toBeDefined();
    expect(screen.getByText("setup.mapPreview")).toBeDefined();
  });

  it("shows recovered venue name when URL contains a place", () => {
    mockFormData.weddingSiteURL = "https://maps.google.com/maps/place/Iglesia";
    render(<DateSectionForm />);
    expect(screen.getByText(/Iglesia San José/)).toBeDefined();
  });

  it("shows invalid URL error and explanation", () => {
    mockFormData.weddingSiteURL = "not-a-valid-url";
    render(<DateSectionForm />);
    expect(screen.getAllByText(/setup.mapUrlInvalid/).length).toBeGreaterThan(0);
    expect(screen.getByText("setup.mapUrlInvalidInfo")).toBeDefined();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("renders with prefix", () => {
    render(<DateSectionForm prefix="admin" />);
    expect(screen.getByText("setup.mapUrlLabel")).toBeDefined();
  });
});
