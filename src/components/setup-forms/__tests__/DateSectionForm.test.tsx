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
  ],
  MONTH_VALUE_TO_NUMBER: { enero: 1, febrero: 2, marzo: 3 },
}));

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
    previewBackgrounds: [],
  }),
}));

import DateSectionForm from "../DateSectionForm";

describe("DateSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(options.length).toBe(4);
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

  it("does not render location preview when no backgrounds", () => {
    render(<DateSectionForm />);
    expect(screen.queryByText("setup.mapPreview")).toBeNull();
  });

  it("renders with prefix", () => {
    render(<DateSectionForm prefix="admin" />);
    expect(screen.getByText("setup.placeLabel")).toBeDefined();
  });
});
