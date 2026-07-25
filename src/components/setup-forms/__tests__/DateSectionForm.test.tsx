import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../lib/constants", () => ({
  MONTH_OPTIONS: [
    { value: "enero", label: "Enero" },
    { value: "febrero", label: "Febrero" },
  ],
  MONTH_VALUE_TO_NUMBER: { enero: 1, febrero: 2 },
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: {},
    updateFormField: vi.fn(),
    handleDayChange: vi.fn(),
    handleYearChange: vi.fn(),
    handleHourChange: vi.fn(),
    handleMinuteChange: vi.fn(),
    handleMinuteBlur: vi.fn(),
    maxAllowedYear: 2099,
    previewBackgrounds: [],
  }),
}));

import DateSectionForm from "../DateSectionForm";

describe("DateSectionForm", () => {
  it("renders without crashing", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.placeLabel")).toBeDefined();
  });

  it("renders place input", () => {
    render(<DateSectionForm />);
    expect(screen.getByPlaceholderText("setup.placePlaceholder")).toBeDefined();
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

  it("renders schedule textarea", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.scheduleLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.schedulePlaceholder")).toBeDefined();
  });

  it("renders with prefix", () => {
    render(<DateSectionForm prefix="admin" />);
    expect(screen.getByText("setup.placeLabel")).toBeDefined();
  });
});
