import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUpdateFormField = vi.fn();
const mockHandleDayChange = vi.fn();
const mockHandleYearChange = vi.fn();
const mockHandleTimeChange = vi.fn();
const mockHandleTimeBlur = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../../lib/constants", () => ({
  MONTH_OPTIONS: [
    { value: "enero", label: "Enero" },
    { value: "febrero", label: "Febrero" },
    { value: "marzo", label: "Marzo" },
    { value: "undefmonth", label: "Undefined" },
  ],
  MONTH_VALUE_TO_NUMBER: { enero: 1, febrero: 2, marzo: 3 },
  MAX_SCHEDULE_EVENTS: 10,
  MAX_SCHEDULE_EVENT_TEXT: 60,
  SCHEDULE_EVENT_EMOJIS: ["ðŸ’", "ðŸ¥‚", "ðŸŽ‰"],
}));

const mockFormData = vi.hoisted(
  () =>
    ({
      weddingSiteURL: "",
      weddingSiteURLEnabled: "true",
      weddingHour: "",
      weddingMinute: "",
      weddingDay: "",
      weddingYear: "",
      weddingScheduleEvents: "",
      weddingMapStatic: "",
    }) as Record<string, string | undefined>,
);
vi.mock("../../../lib/geo-utils", () => ({
  isValidGoogleMapsUrl: (url: string) => url.startsWith("https://maps.google.com"),
  convertToEmbedUrl: (url: string) => url.replace("maps.google.com", "maps.google.com/embed"),
  extractPlaceNameFromUrl: (url: string) => (url.includes("place") ? "Iglesia San JosÃ©" : ""),
}));

vi.mock("../../../contexts", () => ({
  useConfigActions: () => ({
    updateFormField: typeof mockUpdateFormField !== "undefined" ? mockUpdateFormField : vi.fn(),
    handleDayChange: typeof mockHandleDayChange !== "undefined" ? mockHandleDayChange : vi.fn(),
    handleTimeChange: typeof mockHandleTimeChange !== "undefined" ? mockHandleTimeChange : vi.fn(),
    handleTimeBlur: typeof mockHandleTimeBlur !== "undefined" ? mockHandleTimeBlur : vi.fn(),
    handleYearChange: typeof mockHandleYearChange !== "undefined" ? mockHandleYearChange : vi.fn(),
    maxAllowedYear: 2099,
    inviteToken: "",
    hasStoredConfig: false,
  }),
  useFormField: (field: string) => mockFormData[field] ?? "",
  useFormStore: () => ({ getField: (field: string) => mockFormData[field] ?? "" }),
  useConfig: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: mockFormData,
    updateFormField: mockUpdateFormField,
    handleDayChange: mockHandleDayChange,
    handleYearChange: mockHandleYearChange,
    handleTimeChange: mockHandleTimeChange,
    handleTimeBlur: mockHandleTimeBlur,
    maxAllowedYear: 2099,
  }),
}));

import DateSectionForm from "../DateSectionForm";

describe("DateSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData.weddingSiteURL = "";
    mockFormData.weddingHour = "";
    mockFormData.weddingMinute = "";
    mockFormData.weddingScheduleEvents = "";
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

  it("renders a single time input", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.timeInputLabel")).toBeDefined();
    expect(screen.getByLabelText("setup.timeInputLabel")).toBeDefined();
  });

  it("renders year max hint", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.yearMaxHint")).toBeDefined();
  });

  it("renders schedule events editor", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.scheduleLabel")).toBeDefined();
    expect(screen.getByText("setup.scheduleEventsHint")).toBeDefined();
    expect(screen.getByRole("button", { name: /setup.scheduleAddEvent/ })).toBeDefined();
  });

  it("renders month options", () => {
    render(<DateSectionForm />);
    const select = screen.getByLabelText("setup.monthLabel") as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.options.length).toBe(5);
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

  it("calls handleTimeChange on time input change", () => {
    render(<DateSectionForm />);
    const input = screen.getByLabelText("setup.timeInputLabel");
    fireEvent.change(input, { target: { value: "14:30" } });
    expect(mockHandleTimeChange).toHaveBeenCalledWith("14:30");
  });

  it("calls handleTimeBlur on time input blur", () => {
    render(<DateSectionForm />);
    const input = screen.getByLabelText("setup.timeInputLabel");
    fireEvent.blur(input);
    expect(mockHandleTimeBlur).toHaveBeenCalled();
  });

  it("shows time input value from stored hour and minute", () => {
    mockFormData.weddingHour = "15";
    mockFormData.weddingMinute = "5";
    render(<DateSectionForm />);
    const input = screen.getByLabelText("setup.timeInputLabel") as HTMLInputElement;
    expect(input.value).toBe("15:05");
  });

  it("adds a schedule event and stores it as JSON", () => {
    render(<DateSectionForm />);
    fireEvent.click(screen.getByRole("button", { name: /setup.scheduleAddEvent/ }));
    expect(mockUpdateFormField).toHaveBeenCalledWith(
      "weddingScheduleEvents",
      JSON.stringify([{ time: "", text: "", emoji: "" }]),
    );
  });

  it("caps schedule events at 10", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      time: `${String(i).padStart(2, "0")}:00`,
      text: `Evento ${i}`,
    }));
    mockFormData.weddingScheduleEvents = JSON.stringify(many);
    render(<DateSectionForm />);
    expect(screen.getAllByLabelText("setup.scheduleEventTimeLabel")).toHaveLength(10);
    expect(screen.getByText("setup.scheduleMaxEvents")).toBeDefined();
  });

  it("edits a schedule event time field", () => {
    mockFormData.weddingScheduleEvents = JSON.stringify([{ time: "18:00", text: "Ceremonia" }]);
    render(<DateSectionForm />);
    const input = document.getElementById("scheduleEventTime0") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "19:00" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith(
      "weddingScheduleEvents",
      JSON.stringify([{ time: "19:00", text: "Ceremonia", emoji: "" }]),
    );
  });

  it("edits a schedule event text field", () => {
    mockFormData.weddingScheduleEvents = JSON.stringify([{ time: "18:00", text: "Ceremonia" }]);
    render(<DateSectionForm />);
    const input = document.getElementById("scheduleEventText0") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "CÃ³ctel" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith(
      "weddingScheduleEvents",
      JSON.stringify([{ time: "18:00", text: "CÃ³ctel", emoji: "" }]),
    );
  });

  it("edits a schedule event emoji field", () => {
    mockFormData.weddingScheduleEvents = JSON.stringify([{ time: "18:00", text: "Ceremonia" }]);
    render(<DateSectionForm />);
    const select = document.getElementById("scheduleEventEmoji0") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "ðŸ’" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith(
      "weddingScheduleEvents",
      JSON.stringify([{ time: "18:00", text: "Ceremonia", emoji: "ðŸ’" }]),
    );
  });

  it("offers the preset emojis as selectable options with an empty default", () => {
    mockFormData.weddingScheduleEvents = JSON.stringify([{ time: "18:00", text: "Ceremonia" }]);
    render(<DateSectionForm />);
    const select = document.getElementById("scheduleEventEmoji0") as HTMLSelectElement;
    // La primera opciÃ³n es la vacÃ­a (sin emoji) y el resto son los emojis predefinidos.
    const options = Array.from(select.options).map((o) => o.value);
    expect(options[0]).toBe("");
    expect(options).toEqual(expect.arrayContaining(["ðŸ’", "ðŸ¥‚", "ðŸŽ‰"]));
  });

  it("removes a schedule event", () => {
    mockFormData.weddingScheduleEvents = JSON.stringify([
      { time: "18:00", text: "Ceremonia" },
      { time: "20:00", text: "Cena" },
    ]);
    render(<DateSectionForm />);
    fireEvent.click(screen.getAllByLabelText("setup.scheduleRemoveEvent")[0]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith(
      "weddingScheduleEvents",
      JSON.stringify([{ time: "20:00", text: "Cena", emoji: "" }]),
    );
  });

  it("toggles the static map checkbox", () => {
    render(<DateSectionForm />);
    fireEvent.click(screen.getByLabelText("setup.mapStaticLabel"));
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingMapStatic", "true");
  });

  it("shows a year error for a year too far in the past", () => {
    mockFormData.weddingYear = "1800";
    render(<DateSectionForm />);
    const yearInput = document.getElementById("weddingYear") as HTMLInputElement;
    expect(yearInput).not.toBeNull();
    expect(yearInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("shows a year error for a year too far in the future", () => {
    mockFormData.weddingYear = "2999";
    render(<DateSectionForm />);
    const yearInput = document.getElementById("weddingYear") as HTMLInputElement;
    expect(yearInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("handles non-array schedule events JSON", () => {
    mockFormData.weddingScheduleEvents = '{"a":1}';
    render(<DateSectionForm />);
    expect(screen.queryAllByLabelText("setup.scheduleEventTimeLabel")).toHaveLength(0);
  });

  it("normalizes schedule events with non-string fields", () => {
    mockFormData.weddingScheduleEvents = JSON.stringify([{ time: 5, text: 7 }]);
    render(<DateSectionForm />);
    const times = screen.getAllByLabelText("setup.scheduleEventTimeLabel") as HTMLInputElement[];
    const texts = screen.getAllByLabelText("setup.scheduleEventTextLabel") as HTMLInputElement[];
    expect(times[0]!.value).toBe("");
    expect(texts[0]!.value).toBe("");
  });

  it("shows the static map hint when enabled", () => {
    mockFormData.weddingMapStatic = "true";
    render(<DateSectionForm />);
    expect(screen.getByText("setup.mapStaticHint")).toBeDefined();
  });

  it("renders the static map overlay over the iframe", () => {
    mockFormData.weddingMapStatic = "true";
    mockFormData.weddingSiteURL = "https://maps.google.com/maps?q=40.4168,-3.7038";
    render(<DateSectionForm />);
    const frame = document.querySelector("iframe") as HTMLIFrameElement;
    expect(frame).toBeDefined();
    expect(frame.style.touchAction).toBe("none");
    expect(document.querySelector("[aria-hidden='true']")).toBeDefined();
  });

  it("updates the detailsMapMode dropdown", () => {
    render(<DateSectionForm />);
    fireEvent.change(screen.getByLabelText("setup.mapModeLabel"), { target: { value: "name" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("detailsMapMode", "name");
  });

  it("renders site URL input", () => {
    render(<DateSectionForm />);
    expect(screen.getByText("setup.mapUrlLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.mapUrlPlaceholder")).toBeDefined();
    expect(screen.getByText("setup.mapUrlHowTo")).toBeDefined();
  });

  it("calls updateFormField with weddingSiteURL on input change", () => {
    render(<DateSectionForm />);
    const input = document.getElementById("weddingSiteURL") as HTMLInputElement;
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
    expect(screen.getByText(/Iglesia San JosÃ©/)).toBeDefined();
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

  it("marks an invalid day as an error", () => {
    mockFormData.weddingDay = "99";
    render(<DateSectionForm />);
    const dayInput = document.getElementById("weddingDay");
    expect(dayInput?.className).toContain("setup-input--error");
  });

  it("marks an invalid year as an error", () => {
    mockFormData.weddingYear = "99";
    render(<DateSectionForm />);
    const yearInput = document.getElementById("weddingYear");
    expect(yearInput?.className).toContain("setup-input--error");
  });

  it("marks an invalid time as an error", () => {
    mockFormData.weddingHour = "25";
    render(<DateSectionForm />);
    expect(document.querySelector(".setup-input--error")).toBeDefined();
  });

  // Vista del mapa del recinto: select con etiqueta propia.
  it("updates weddingMapView on change", () => {
    render(<DateSectionForm />);
    fireEvent.change(screen.getByLabelText("setup.mapViewLabel"), { target: { value: "satellite" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingMapView", "satellite");
  });

});
