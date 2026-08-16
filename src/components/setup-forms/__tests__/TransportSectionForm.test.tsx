import { useSyncExternalStore } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUpdateFormField = vi.fn();
const mockFormData = vi.hoisted(() => ({
  transportEnabled: "both",
  transportDepartures: "",
}) as Record<string, string | undefined>);

// Mini-tienda reactiva para el mock: `useFormField` se suscribe y notifica al
// actualizar mockFormData, de modo que el formulario (memoizado en producción)
// re-renderiza como lo haría el FormStore real.
const listeners = new Set<() => void>();
const subscribeField = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const notify = () => {
  listeners.forEach((l) => l());
};

vi.mock("../../../contexts", () => ({
  useConfigActions: () => ({
    updateFormField: typeof mockUpdateFormField !== "undefined" ? mockUpdateFormField : vi.fn(),
    handleDayChange: vi.fn(),
    handleTimeChange: vi.fn(),
    handleTimeBlur: vi.fn(),
    handleYearChange: vi.fn(),
    maxAllowedYear: 2099,
    inviteToken: "",
    hasStoredConfig: false,
  }),
  useFormField: (field: string) => useSyncExternalStore(subscribeField, () => mockFormData[field] ?? ""),
  useFormStore: () => ({
    getField: (field: string) => mockFormData[field] ?? "",
    subscribeField,
  }),
  useConfig: () => ({
    formData: mockFormData,
    updateFormField: mockUpdateFormField,
  }),
}));

vi.mock("../../../lib/geo-utils", () => ({
  isValidGoogleMapsUrl: (url: string) => url.startsWith("https://www.google.com/maps/place/"),
  extractPlaceNameFromUrl: (url: string) =>
    url.includes("place/") ? url.split("/place/")[1]?.split("/")[0]?.replace(/\+/g, " ") || "" : "",
}));

import TransportSectionForm from "../TransportSectionForm";

function getStored() {
  const calls = [...mockUpdateFormField.mock.calls].reverse();
  const call = calls.find((c) => c[0] === "transportDepartures");
  return call ? JSON.parse(call[1] as string) : [];
}

// Harness: actualiza mockFormData y notifica a los suscriptores (como haría el
// contexto real con FormStore) al llamar a updateFormField.
function renderForm() {
  mockUpdateFormField.mockImplementation((field: string, value: unknown) => {
    (mockFormData as Record<string, unknown>)[field] = value;
    notify();
  });
  return render(<TransportSectionForm />);
}

describe("TransportSectionForm departures flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData.transportDepartures = "";
    mockFormData.transportEnabled = "both";
  });

  it("adds departures up to the maximum of 4", () => {
    renderForm();
    for (let i = 0; i < 5; i++) {
      const btn = screen.queryByRole("button", { name: /setup.transportAddDeparture/ });
      if (!btn) break;
      fireEvent.click(btn);
    }
    const stored = getStored();
    expect(stored).toHaveLength(4);
    expect(screen.queryByText("setup.transportMaxDepartures")).toBeDefined();
    expect(screen.queryByRole("button", { name: /setup.transportAddDeparture/ })).toBeNull();
  });

  it("edits time and url of a departure", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /setup.transportAddDeparture/ }));
    fireEvent.change(screen.getByLabelText("setup.transportTimeLabel"), { target: { value: "12:30" } });
    fireEvent.change(screen.getByLabelText("setup.transportUrlLabel"), {
      target: { value: "https://www.google.com/maps/place/Plaza" },
    });
    const stored = getStored();
    expect(stored[0]).toEqual({ type: "bus", time: "12:30", url: "https://www.google.com/maps/place/Plaza" });
  });

  it("removes a departure", () => {
    mockFormData.transportDepartures = JSON.stringify([
      { type: "bus", time: "12:00", url: "" },
      { type: "taxi", time: "14:00", url: "" },
    ]);
    renderForm();
    const removeButtons = screen.getAllByLabelText("setup.transportRemoveDeparture");
    fireEvent.click(removeButtons[0]!);
    const stored = getStored();
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe("taxi");
  });

  it("caps legacy departures at 4 for display", () => {
    mockFormData.transportDepartures = JSON.stringify(
      Array.from({ length: 6 }, (_, i) => ({ type: "bus", time: `${i}:00`, url: "" })),
    );
    renderForm();
    expect(screen.getAllByLabelText("setup.transportRemoveDeparture")).toHaveLength(4);
  });

  it("sanitizes legacy entries without type", () => {
    mockFormData.transportDepartures = JSON.stringify([{ time: "12:00", url: "" }]);
    renderForm();
    const select = screen.getByLabelText("setup.transportTypeLabel") as HTMLSelectElement;
    expect(select.value).toBe("bus");
  });

  it("disables the type select and defaults it to bus when the option is bus", () => {
    mockFormData.transportEnabled = "bus";
    mockFormData.transportDepartures = JSON.stringify([{ type: "taxi", time: "12:00", url: "" }]);
    renderForm();
    const select = screen.getByLabelText("setup.transportTypeLabel") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.value).toBe("bus");
  });

  it("disables the type select and defaults it to taxi when the option is taxi", () => {
    mockFormData.transportEnabled = "taxi";
    mockFormData.transportDepartures = JSON.stringify([{ type: "bus", time: "12:00", url: "" }]);
    renderForm();
    const select = screen.getByLabelText("setup.transportTypeLabel") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.value).toBe("taxi");
  });

  it("normalizes all departure types when switching to a single option", () => {
    mockFormData.transportDepartures = JSON.stringify([
      { type: "bus", time: "12:00", url: "" },
      { type: "taxi", time: "14:00", url: "" },
    ]);
    renderForm();
    fireEvent.change(screen.getByLabelText("setup.transportEnabledLabel"), { target: { value: "taxi" } });
    const stored = getStored();
    expect(stored.every((d: { type: string }) => d.type === "taxi")).toBe(true);
    const selects = screen.getAllByLabelText("setup.transportTypeLabel") as HTMLSelectElement[];
    expect(selects).toHaveLength(2);
    selects.forEach((s) => {
      expect(s.disabled).toBe(true);
      expect(s.value).toBe("taxi");
    });
  });

  it("keeps the type selects enabled when the option is both", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("setup.transportEnabledLabel"), { target: { value: "both" } });
    fireEvent.click(screen.getByRole("button", { name: /setup.transportAddDeparture/ }));
    const select = screen.getByLabelText("setup.transportTypeLabel") as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    expect(select.value).toBe("bus");
  });

  it("shows the site name hint when a valid departure URL is entered", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("setup.transportEnabledLabel"), { target: { value: "both" } });
    fireEvent.click(screen.getByRole("button", { name: /setup.transportAddDeparture/ }));
    const urlInput = screen.getByLabelText("setup.transportUrlLabel");
    fireEvent.change(urlInput, { target: { value: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" } });
    expect(screen.getByText(/setup.siteNameLabel/)).toBeDefined();
    expect(screen.getByText(/Plaza Mayor/)).toBeDefined();
  });

  it("handles non-array departures JSON as empty", () => {
    mockFormData.transportDepartures = '{"a":1}';
    renderForm();
    expect(screen.getByText("setup.transportDeparturesLabel")).toBeDefined();
  });

  it("normalizes taxi types and non-string times", () => {
    mockFormData.transportDepartures = JSON.stringify([{ type: "taxi", time: 7 }, { time: "10:00" }]);
    renderForm();
    const times = screen.getAllByLabelText("setup.transportTimeLabel") as HTMLInputElement[];
    expect(times[0]!.value).toBe("");
    expect(times[1]!.value).toBe("10:00");
  });

  it("marks an invalid departure URL with an error", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("setup.transportEnabledLabel"), { target: { value: "both" } });
    fireEvent.click(screen.getByRole("button", { name: /setup.transportAddDeparture/ }));
    const urlInput = screen.getByLabelText("setup.transportUrlLabel");
    fireEvent.change(urlInput, { target: { value: "https://evil.example.com/x" } });
    expect(screen.getByText("setup.mapUrlInvalid")).toBeDefined();
  });

  it("updates the transportMapMode dropdown", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("setup.transportEnabledLabel"), { target: { value: "bus" } });
    fireEvent.change(screen.getByLabelText("setup.mapModeLabel"), { target: { value: "hidden" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("transportMapMode", "hidden");
  });

  it("does not show the site hint for a valid URL without a place", () => {
    mockFormData.transportDepartures = JSON.stringify([
      { type: "bus", time: "12:00", url: "https://maps.google.com/maps?q=40.41,-3.70" },
    ]);
    renderForm();
    expect(screen.queryByText(/setup.siteNameLabel/)).toBeNull();
  });
});
