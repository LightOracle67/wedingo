import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUpdateFormField = vi.fn();
const mockFormData = vi.hoisted(() => ({
  transportEnabled: "both",
  transportDepartures: "",
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    formData: mockFormData,
    updateFormField: mockUpdateFormField,
  }),
}));

vi.mock("../../../lib/geo-utils", () => ({
  isValidGoogleMapsUrl: (url: string) => url.startsWith("https://www.google.com/maps/place/"),
}));

import TransportSectionForm from "../TransportSectionForm";

function getStored() {
  const calls = [...mockUpdateFormField.mock.calls].reverse();
  const call = calls.find((c) => c[0] === "transportDepartures");
  return call ? JSON.parse(call[1] as string) : [];
}

// Harness: re-renderiza el form al actualizar formData (como haría el contexto real)
function Harness() {
  const [, force] = useState(0);
  mockUpdateFormField.mockImplementation((field: string, value: unknown) => {
    (mockFormData as Record<string, unknown>)[field] = value;
    force((x) => x + 1);
  });
  return <TransportSectionForm />;
}

function renderForm() {
  return render(<Harness />);
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
    fireEvent.change(screen.getByLabelText("setup.transportUrlLabel"), { target: { value: "https://www.google.com/maps/place/Plaza" } });
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
    mockFormData.transportDepartures = JSON.stringify([
      { time: "12:00", url: "" },
    ]);
    renderForm();
    const select = screen.getByLabelText("setup.transportTypeLabel") as HTMLSelectElement;
    expect(select.value).toBe("bus");
  });
});
