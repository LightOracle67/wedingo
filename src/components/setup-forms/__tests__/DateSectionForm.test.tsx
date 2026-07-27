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

const mockSearchLocations = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/geo-utils", () => ({
  searchLocations: mockSearchLocations,
}));

const mockPreviewBackgrounds = vi.hoisted(() => [] as { id: string; src: string }[]);

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: {},
    updateFormField: mockUpdateFormField,
    handleDayChange: mockHandleDayChange,
    handleYearChange: mockHandleYearChange,
    handleHourChange: mockHandleHourChange,
    handleMinuteChange: mockHandleMinuteChange,
    handleMinuteBlur: mockHandleMinuteBlur,
    maxAllowedYear: 2099,
    previewBackgrounds: mockPreviewBackgrounds,
  }),
}));

import DateSectionForm from "../DateSectionForm";

describe("DateSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreviewBackgrounds.length = 0;
    mockSearchLocations.mockResolvedValue([]);
  });

  it("renders without crashing", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.placeLabel")).toBeDefined();
  });

  it("renders place input", () => {
    render(<DateSectionForm />);
    expect(screen.getByPlaceholderText("setup.placePlaceholder")).toBeDefined();
  });

  it("renders place help text", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.placeHint")).toBeDefined();
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

  it("renders time help texts", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.hourHint")).toBeDefined();
    expect(screen.getByText("setup.minuteHint")).toBeDefined();
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

  it("renders schedule help text", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.scheduleHint")).toBeDefined();
  });

  it("renders month options", () => {
    render(<DateSectionForm />);
    const select = screen.getByLabelText("setup.monthLabel");
    expect(select).toBeDefined();
    const options = screen.getAllByRole("option");
    expect(options.length).toBe(5);
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

  it("does not render location preview when no backgrounds", () => {
    render(<DateSectionForm />);
    expect(screen.queryByText("setup.mapPreview")).toBeNull();
  });

  it("renders location preview when backgrounds include default", () => {
    mockPreviewBackgrounds.push({ id: "default", src: "https://example.com/map.png" });
    render(<DateSectionForm />);
    expect(screen.getByText("setup.mapPreview")).toBeDefined();
    const img = screen.getByAltText("setup.mapPreviewAlt");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/map.png");
  });

  it("does not render location preview when backgrounds have no default entry", () => {
    mockPreviewBackgrounds.push({ id: "other", src: "https://example.com/other.png" });
    render(<DateSectionForm />);
    expect(screen.queryByText("setup.mapPreview")).toBeNull();
  });

  it("calls handlePlaceChange and updates fields with short value", () => {
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.change(input, { target: { value: "NY" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingPlace", "NY");
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingLatitude", "");
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingLongitude", "");
  });

  it("clears weddingPlaceResults on place input blur after timeout", () => {
    vi.useFakeTimers();
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.change(input, { target: { value: "New York" } });
    const resultsEl = document.getElementById("weddingPlaceResults");
    expect(resultsEl?.textContent).toBe("setup.searching");
    fireEvent.blur(input);
    vi.advanceTimersByTime(200);
    expect(resultsEl?.textContent).toBe("");
    vi.useRealTimers();
  });

  it("limits place value to 120 characters", () => {
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    const longText = "a".repeat(150);
    fireEvent.change(input, { target: { value: longText } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingPlace", "a".repeat(120));
  });

  it("shows searching placeholder when place has 3+ chars", () => {
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.change(input, { target: { value: "New York" } });
    const resultsEl = document.getElementById("weddingPlaceResults");
    expect(resultsEl?.textContent).toBe("setup.searching");
  });

  it("renders location search results", async () => {
    mockSearchLocations.mockResolvedValue([
      { latitude: "40.7128", longitude: "-74.0060", label: "New York, USA" },
    ]);
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.change(input, { target: { value: "New York" } });
    await vi.waitFor(() => {
      expect(screen.getByText("New York, USA")).toBeDefined();
    });
  });

  it("clicks search result and updates fields", async () => {
    mockSearchLocations.mockResolvedValue([
      { latitude: "40.7128", longitude: "-74.0060", label: "New York, USA" },
    ]);
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.change(input, { target: { value: "New York" } });
    await vi.waitFor(() => {
      expect(screen.getByText("New York, USA")).toBeDefined();
    });
    fireEvent.click(screen.getByText("New York, USA"));
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingPlace", "New York, USA");
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingLatitude", "40.7128");
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingLongitude", "-74.0060");
  });

  it("shows no results message when search returns empty", async () => {
    mockSearchLocations.mockResolvedValue([]);
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.change(input, { target: { value: "Nowhere" } });
    await vi.waitFor(() => {
      expect(screen.getByText("setup.noResults")).toBeDefined();
    });
  });

  it("renders with prefix", () => {
    render(<DateSectionForm prefix="admin" />);
    expect(screen.getByText("setup.placeLabel")).toBeDefined();
  });

  it("does not crash when weddingPlaceResults element is missing on 3+ char input", () => {
    render(<DateSectionForm />);
    const el = document.getElementById("weddingPlaceResults");
    el?.remove();
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    expect(() => fireEvent.change(input, { target: { value: "New York" } })).not.toThrow();
  });

  it("clears results element on short value change when element exists", () => {
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.change(input, { target: { value: "NY" } });
    const el = document.getElementById("weddingPlaceResults");
    expect(el?.textContent).toBe("");
  });

  it("renders schedule textarea and updates on change", () => {
    render(<DateSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.schedulePlaceholder");
    fireEvent.change(textarea, { target: { value: "Ceremony at 4pm" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingSchedule", "Ceremony at 4pm");
  });

  it("resets coordinates on place change", () => {
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.change(input, { target: { value: "Madrid" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingLatitude", "");
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingLongitude", "");
  });

  it("handles onBlur when weddingPlaceResults element is missing", () => {
    vi.useFakeTimers();
    render(<DateSectionForm />);
    const el = document.getElementById("weddingPlaceResults");
    el?.remove();
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.blur(input);
    expect(() => vi.advanceTimersByTime(200)).not.toThrow();
    vi.useRealTimers();
  });

  it("handles onBlur timeout cleanup when element exists", () => {
    vi.useFakeTimers();
    render(<DateSectionForm />);
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    fireEvent.blur(input);
    vi.advanceTimersByTime(200);
    const el = document.getElementById("weddingPlaceResults");
    expect(el?.textContent).toBe("");
    vi.useRealTimers();
  });

  it("does not crash when short value change and results element is missing", () => {
    render(<DateSectionForm />);
    const el = document.getElementById("weddingPlaceResults");
    el?.remove();
    const input = screen.getByPlaceholderText("setup.placePlaceholder");
    expect(() => fireEvent.change(input, { target: { value: "AB" } })).not.toThrow();
  });
});
