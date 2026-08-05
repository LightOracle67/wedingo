import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({ setLegalModal: vi.fn() }),
}));

import RsvpSection from "../RsvpSection";

const baseForm = {
  guestName: "",
  attendance: "alone",
  birthDate: "",
  companionCount: 0,
  companionNames: [],
  companionMenus: [],
  companionAllergies: [],
  companionAllergiesOther: [],
  companionTransportChoices: [],
  companionTransportModes: [],
  menuSelection: "",
  allergies: [],
  allergiesOther: "",
  parentalConsent: false,
  privacyConsent: false,
  healthConsent: false,
  transportChoice: "own",
  transportMode: "own",
};

const baseProps = {
  style: {},
  className: "test",
  rsvpForm: baseForm,
  rsvpMessage: "",
  isRsvpSubmitting: false,
  hasSubmitted: false,
  alreadySubmittedEntry: null,
  updateRsvpField: vi.fn((_field: string, _value: string | boolean | number | string[] | string[][] | boolean[]) => undefined),
  handleRsvpSubmit: vi.fn(),
  handleDeleteRsvp: vi.fn(),
  menuEnabled: false,
  menuCarneDishes: "",
  menuPescadoDishes: "",
  menuVeganoDishes: "",
  menuTextoDishes: "",
  computeAge: vi.fn((_d: string) => 0),
};

const updateRsvpField = baseProps.updateRsvpField as ReturnType<typeof vi.fn>;

describe("RsvpSection", () => {
  it("renders the form in default state", () => {
    render(<RsvpSection {...baseProps} />);
    expect(screen.getByText("rsvp.sectionLabel")).toBeDefined();
    expect(screen.getByText("rsvp.title")).toBeDefined();
    expect(screen.getByText("rsvp.description")).toBeDefined();
    expect(screen.getByText((text: string) => text.includes("rsvp.nameLabel"))).toBeDefined();
  });

  it("shows submitting state", () => {
    render(<RsvpSection {...baseProps} isRsvpSubmitting={true} />);
    expect(screen.getByText("rsvp.submittingButton")).toBeDefined();
  });

  it("shows confirmed state when already submitted", () => {
    render(<RsvpSection {...baseProps} hasSubmitted={true} />);
    expect(screen.getByText("rsvp.confirmedButton")).toBeDefined();
  });

  it("shows already submitted badge", () => {
    render(<RsvpSection {...baseProps} alreadySubmittedEntry={{ id: "1" }} />);
    expect(screen.getByText("rsvp.alreadySubmitted")).toBeDefined();
    expect(screen.getByText("rsvp.withdrawButton")).toBeDefined();
  });

  it("calls handleDeleteRsvp when withdraw clicked", () => {
    const handleDeleteRsvp = vi.fn();
    render(<RsvpSection {...baseProps} alreadySubmittedEntry={{ id: "1" }} handleDeleteRsvp={handleDeleteRsvp} />);
    fireEvent.click(screen.getByText("rsvp.withdrawButton"));
    expect(handleDeleteRsvp).toHaveBeenCalled();
  });

  it("renders attendance select with with option", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with" }}
      />,
    );
    expect(screen.getByText("rsvp.attendingWithCompanions")).toBeDefined();
  });

  it("shows companion cards when companionCount > 0", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 2, companionNames: ["", ""], companionMenus: ["", ""], companionAllergies: [[], []], companionAllergiesOther: ["", ""] }}
      />,
    );
    expect(screen.getAllByText((text: string) => text === "rsvp.companionHeading")).toHaveLength(2);
  });

  it("does not show companion count when attendance is alone", () => {
    render(<RsvpSection {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.queryByText((text: string) => text.includes("rsvp.companionCountLabel"))).toBeNull();
  });

  it("does not show companion count when attendance is no", () => {
    render(<RsvpSection {...baseProps} rsvpForm={{ ...baseForm, attendance: "no" }} />);
    expect(screen.queryByText((text: string) => text.includes("rsvp.companionCountLabel"))).toBeNull();
  });

  it("shows structured menu when enabled and attending", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled={true}
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
      />,
    );
    expect(screen.getByText("rsvp.allergiesHint")).toBeDefined();
  });

  it("shows menu dishes when no structured menu", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled={true}
        menuTextoDishes={JSON.stringify([{ order: "entrante", text: "Ensalada" }])}
      />,
    );
    expect(screen.getByText("rsvp.menuLabel")).toBeDefined();
    expect(screen.getByText(/setup.menuOrderEntrante: Ensalada/)).toBeDefined();
  });

  it("shows formatted dishes for the fixed menu", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled={true}
        menuTextoDishes={JSON.stringify([
          { order: "entrante", text: "Ensalada" },
          { order: "postre", text: "Tarta" },
        ])}
      />,
    );
    expect(screen.getByText(/setup.menuOrderEntrante: Ensalada/)).toBeDefined();
    expect(screen.getByText(/setup.menuOrderPostre: Tarta/)).toBeDefined();
  });

  it("shows the fixed menu without a selector when menu is disabled", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        menuEnabled={false}
        menuTextoDishes={JSON.stringify([
          { order: "entrante", text: "Ensalada" },
          { order: "primero", text: "Lubina" },
        ])}
      />,
    );
    expect(screen.getByText("rsvp.menuLabel")).toBeDefined();
    expect(screen.getByText(/setup.menuOrderEntrante: Ensalada/)).toBeDefined();
    expect(screen.getByText(/setup.menuOrderPrimero: Lubina/)).toBeDefined();
    expect(document.getElementById("rsvpMenu")).toBeNull();
  });

  it("does not show the fixed menu when there are no dishes", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        menuEnabled={false}
      />,
    );
    expect(screen.queryByText("rsvp.menuLabel")).toBeNull();
    expect(document.getElementById("rsvpMenu")).toBeNull();
  });

  it("shows the dish description when a selectable menu option is chosen", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", menuSelection: "carne" }}
        menuEnabled={true}
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
      />,
    );
    expect(screen.getByText(/setup.menuOrderPrimero: Solomillo/)).toBeDefined();
  });

  it("shows health consent when allergies exist", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{
          ...baseForm,
          attendance: "alone",
          allergies: ["sin gluten"],
        }}
      />,
    );
    expect(screen.getByText("rsvp.healthConsent")).toBeDefined();
  });

  it("shows feedback message when rsvpMessage is set", () => {
    render(<RsvpSection {...baseProps} rsvpMessage="Thank you!" />);
    expect(screen.getByText("Thank you!")).toBeDefined();
  });

  it("shows companion cards with menu and allergies when companionCount > 0 and menu enabled", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled={true}
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
        rsvpForm={{
          ...baseForm,
          attendance: "with",
          companionCount: 2,
          companionNames: ["", ""],
          companionMenus: ["", ""],
          companionAllergies: [[], []],
        }}
      />,
    );
    expect(screen.getAllByText((text: string) => text.includes("rsvp.companionHeading"))).toHaveLength(2);
    expect(screen.getAllByText("rsvp.allergiesLegend").length).toBeGreaterThanOrEqual(2);
  });

  it("shows companion remove buttons when more than 1 companion", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{
          ...baseForm,
          attendance: "with",
          companionCount: 2,
          companionNames: ["", ""],
          companionMenus: ["", ""],
          companionAllergies: [[], []],
        }}
      />,
    );
    expect(screen.getAllByText("✕")).toHaveLength(1);
  });

  it("shows allergies hint when not menuEnabled and attending", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled={false}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    expect(screen.getByText("rsvp.allergiesHint")).toBeDefined();
  });

  it("shows allergies checkboxes when attending", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    expect(screen.getByText("rsvp.allergiesLegend")).toBeDefined();
  });

  it("hides allergies section when not attending", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "no" }}
      />,
    );
    expect(screen.queryByText("rsvp.allergiesLegend")).toBeNull();
  });

  it("shows age warning when under 14", () => {
    render(
      <RsvpSection
        {...baseProps}
        computeAge={() => 10}
        rsvpForm={{ ...baseForm, birthDate: "2016-01-01" }}
      />,
    );
    expect(screen.getByText("rsvp.ageUnder14Warning")).toBeDefined();
    expect(screen.getByText("rsvp.parentalConsent")).toBeDefined();
  });

  it("does not show transport select when no departures defined", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="bus"
        transportDepartures=""
      />,
    );
    expect(screen.queryByLabelText("rsvp.transportLabel")).toBeNull();
  });

  it("shows transport radios with departures and own car for the main guest", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="both"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/X" },
          { type: "taxi", time: "14:30", url: "" },
        ])}
      />,
    );
    expect(screen.getByLabelText("rsvp.transportOwnCarOption")).toBeDefined();
    expect(screen.getByLabelText("rsvp.transportBusOption")).toBeDefined();
    expect(screen.getByLabelText("rsvp.transportTaxiOption")).toBeDefined();
    expect(document.getElementById("rsvpTransportDeparture")).toBeNull();
  });

  it("hides bus option when only taxi is enabled", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="taxi"
        transportDepartures={JSON.stringify([{ type: "taxi", time: "14:30", url: "" }])}
      />,
    );
    expect(screen.getByLabelText("rsvp.transportOwnCarOption")).toBeDefined();
    expect(screen.getByLabelText("rsvp.transportTaxiOption")).toBeDefined();
    expect(screen.queryByLabelText("rsvp.transportBusOption")).toBeNull();
  });

  it("shows the departure select after choosing bus and preselects the first departure", () => {
    const update = baseProps.updateRsvpField as ReturnType<typeof vi.fn>;
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="both"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "" },
          { type: "bus", time: "16:00", url: "" },
          { type: "taxi", time: "14:30", url: "" },
        ])}
      />,
    );
    fireEvent.click(screen.getByLabelText("rsvp.transportBusOption"));
    expect(update).toHaveBeenCalledWith("transportMode", "bus");
    expect(update).toHaveBeenCalledWith("transportChoice", "0");
  });

  it("shows only bus departures when taxi is chosen", () => {
    const update = baseProps.updateRsvpField as ReturnType<typeof vi.fn>;
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "taxi", transportChoice: "1" }}
        transportEnabled="both"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "" },
          { type: "taxi", time: "14:30", url: "" },
        ])}
      />,
    );
    const select = document.getElementById("rsvpTransportDeparture") as HTMLSelectElement;
    expect(select).toBeDefined();
    expect([...select.options].map((o) => o.textContent)).toEqual(["14:30 (transport.typeTaxi)"]);
    fireEvent.click(screen.getByLabelText("rsvp.transportBusOption"));
    expect(update).toHaveBeenCalledWith("transportMode", "bus");
    expect(update).toHaveBeenCalledWith("transportChoice", "0");
  });

  it("shows the departure place name in the options when the URL is valid", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "bus", transportChoice: "0" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
        ])}
      />,
    );
    const select = document.getElementById("rsvpTransportDeparture") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["Plaza Mayor (12:00)"]);
  });

  it("stores time and place when changing the departure", () => {
    const update = baseProps.updateRsvpField as ReturnType<typeof vi.fn>;
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "bus", transportChoice: "0" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "" },
          { type: "bus", time: "16:00", url: "https://www.google.com/maps/place/Estación+Norte/@40.4,-3.7,17z" },
        ])}
      />,
    );
    fireEvent.change(document.getElementById("rsvpTransportDeparture")!, { target: { value: "1" } });
    expect(update).toHaveBeenCalledWith("transportChoice", "1");
    expect(update).toHaveBeenCalledWith("transportTime", "16:00");
    expect(update).toHaveBeenCalledWith("transportPlace", "Estación Norte");
  });

  it("labels departures with the 24h time", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "bus", transportChoice: "0" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "08:30", url: "" },
          { type: "bus", time: "22:00", url: "" },
        ])}
      />,
    );
    const select = document.getElementById("rsvpTransportDeparture") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      "08:30 (transport.typeBus)",
      "22:00 (transport.typeBus)",
    ]);
  });

  it("shows transport radios inside each companion card", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([{ type: "bus", time: "12:00", url: "" }])}
      />,
    );
    expect(screen.getAllByLabelText("rsvp.transportOwnCarOption")).toHaveLength(2);
    fireEvent.click(screen.getAllByLabelText("rsvp.transportBusOption")[1]!);
    const companionSelect = document.getElementById("companion-departure-0");
    expect(companionSelect).toBeDefined();
  });

  it("updates attendance via the attendance select", () => {
    render(<RsvpSection {...baseProps} />);
    const select = document.getElementById("rsvpAttendance") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "with" } });
    expect(updateRsvpField).toHaveBeenCalledWith("attendance", "with");
  });

  it("updates the menu selection via the menu select", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    const select = document.getElementById("rsvpMenu") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "carne" } });
    expect(updateRsvpField).toHaveBeenCalledWith("menuSelection", "carne");
  });

  it("updates the main transport departure", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "bus", transportChoice: "0" }}
        transportEnabled="both"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
          { type: "taxi", time: "14:30", url: "" },
        ])}
      />,
    );
    const select = document.getElementById("rsvpTransportDeparture") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "1" } });
    expect(updateRsvpField).toHaveBeenCalledWith("transportChoice", "1");
  });

  it("updates allergiesOther when typed", () => {
    render(<RsvpSection {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: ["sin gluten"] }} />);
    const input = screen.getByPlaceholderText("rsvp.allergiesPlaceholder");
    fireEvent.change(input, { target: { value: "alergia al huevo" } });
    expect(updateRsvpField).toHaveBeenCalledWith("allergiesOther", "alergia al huevo");
  });

  it("updates a companion menu selection", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
        menuPescadoDishes={JSON.stringify([{ order: "primero", text: "Lubina" }])}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }}
      />,
    );
    const select = document.getElementById("companion-menu-0") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "pescado" } });
    expect(updateRsvpField).toHaveBeenCalledWith("companionMenus[0]", "pescado");
  });

  it("toggles an allergy checkbox", () => {
    render(<RsvpSection {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    fireEvent.click(screen.getByLabelText("rsvp.allergies.sin gluten"));
    expect(updateRsvpField).toHaveBeenCalledWith("allergies", ["sin gluten"]);
  });

  it("removes an allergy when unchecked", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", allergies: ["sin gluten"] }}
      />,
    );
    fireEvent.click(screen.getByLabelText("rsvp.allergies.sin gluten"));
    expect(updateRsvpField).toHaveBeenCalledWith("allergies", []);
  });

  it("toggles the health consent when allergies are present", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", allergies: ["sin gluten"] }}
      />,
    );
    fireEvent.click(screen.getByLabelText("rsvp.healthConsent"));
    expect(updateRsvpField).toHaveBeenCalledWith("healthConsent", true);
  });

  it("toggles the parental consent when the guest is under 14", () => {
    const props = { ...baseProps, computeAge: vi.fn(() => 10) };
    render(<RsvpSection {...props} rsvpForm={{ ...baseForm, attendance: "alone", birthDate: "2015-01-01" }} />);
    fireEvent.click(screen.getByLabelText("rsvp.parentalConsent"));
    expect(updateRsvpField).toHaveBeenCalledWith("parentalConsent", true);
  });

  it("toggles a companion allergy checkbox", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }}
      />,
    );
    // El invitado principal y el acompañante muestran el mismo checkbox de alergia;
    // se verifica que alguno de ellos actualice el campo de alergias del acompañante.
    const boxes = screen.getAllByLabelText("rsvp.allergies.sin gluten");
    for (const box of boxes) fireEvent.click(box);
    const calls = updateRsvpField.mock.calls.map((c) => c[0]);
    expect(calls.some((f) => String(f).startsWith("companionAllergies"))).toBe(true);
  });

  it("updates a companion allergiesOther field", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }}
      />,
    );
    const inputs = screen.getAllByPlaceholderText("rsvp.allergiesPlaceholder");
    fireEvent.change(inputs[0]!, { target: { value: "alergia al huevo" } });
    expect(updateRsvpField).toHaveBeenCalledWith("companionAllergiesOther", ["alergia al huevo"]);
  });

  it("toggles a companion parental consent when the companion is under 14", () => {
    const props = { ...baseProps, computeAge: vi.fn(() => 10) };
    render(
      <RsvpSection
        {...props}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1, companionBirthDates: ["2015-01-01"] }}
      />,
    );
    fireEvent.click(screen.getAllByLabelText("rsvp.parentalConsent")[0]!);
    expect(updateRsvpField).toHaveBeenCalledWith("companionParentalConsents", [true]);
  });

  it("toggles a companion health consent when the companion has allergies", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1, companionAllergies: [["sin gluten"]] }}
      />,
    );
    fireEvent.click(screen.getAllByLabelText("rsvp.healthConsent")[0]!);
    expect(updateRsvpField).toHaveBeenCalledWith("companionHealthConsents", [true]);
  });

  it("shows the companion info banner when the submitted entry is a companion", () => {
    render(
      <RsvpSection
        {...baseProps}
        alreadySubmittedEntry={{ id: "c1", rsvpType: "companion", mainGuestName: "Alice María Smith" }}
      />,
    );
    expect(screen.getByText((text: string) => text.includes("rsvp.companionInfo"))).toBeDefined();
  });

  it("adds a companion via the add button", () => {
    render(<RsvpSection {...baseProps} rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }} />);
    fireEvent.click(screen.getByText((text: string) => text.includes("rsvp.addCompanion")));
    expect(updateRsvpField).toHaveBeenCalledWith("companionCount", 2);
  });

  it("updates a companion birth date", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }}
      />,
    );
    const input = document.getElementById("companion-birth-0") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2000-05-15" } });
    expect(updateRsvpField).toHaveBeenCalledWith("companionBirthDates", ["2000-05-15"]);
  });

  it("sets the departure place when the departure has a URL", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([{ type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" }])}
      />,
    );
    fireEvent.click(screen.getByLabelText("rsvp.transportBusOption"));
    expect(updateRsvpField).toHaveBeenCalledWith("transportMode", "bus");
    expect(updateRsvpField).toHaveBeenCalledWith("transportPlace", "Plaza Mayor");
  });

  it("shows the departure select when the mode is already bus", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "bus", transportChoice: "0" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([{ type: "bus", time: "12:00", url: "" }])}
      />,
    );
    const select = screen.getByLabelText("rsvp.transportDepartureLabel") as HTMLSelectElement;
    expect(select).toBeDefined();
    fireEvent.change(select, { target: { value: "0" } });
    expect(updateRsvpField).toHaveBeenCalledWith("transportChoice", "0");
  });

  it("does not require parental consent for guests aged 14 or older", () => {
    const props = { ...baseProps, computeAge: vi.fn(() => 20) };
    render(<RsvpSection {...props} rsvpForm={{ ...baseForm, attendance: "alone", birthDate: "2000-01-01" }} />);
    expect(screen.queryByText("rsvp.ageUnder14Warning")).toBeNull();
    expect(screen.queryByLabelText("rsvp.parentalConsent")).toBeNull();
  });

  it("renders no menu options when no dishes are configured", () => {
    render(<RsvpSection {...baseProps} menuEnabled rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.queryByText("rsvp.menuCarne")).toBeNull();
    expect(screen.queryByText("rsvp.menuPescado")).toBeNull();
  });

  it("renders only the configured menu options", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled
        menuPescadoDishes={JSON.stringify([{ order: "first", text: "Merluza" }])}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    expect(screen.queryByText("rsvp.menuCarne")).toBeNull();
    expect(screen.getByText("rsvp.menuPescado")).toBeDefined();
  });

  it("removes an allergy already selected", () => {
    render(<RsvpSection {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: ["sin gluten"] }} />);
    fireEvent.click(screen.getByLabelText("rsvp.allergies.sin gluten"));
    expect(updateRsvpField).toHaveBeenCalledWith("allergies", []);
  });

  it("handles the taxi transport mode with departures", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="taxi"
        transportDepartures={JSON.stringify([{ type: "taxi", time: "12:30", url: "" }])}
      />,
    );
    fireEvent.click(screen.getByLabelText("rsvp.transportTaxiOption"));
    expect(updateRsvpField).toHaveBeenCalledWith("transportMode", "taxi");
  });

  it("defaults a departure without type to bus", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([{ time: "12:00", url: "" }])}
      />,
    );
    fireEvent.click(screen.getByLabelText("rsvp.transportBusOption"));
    expect(updateRsvpField).toHaveBeenCalledWith("transportChoice", "0");
  });

  it("hides the health consent when attending without allergies", () => {
    render(<RsvpSection {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: [] }} />);
    expect(screen.queryByLabelText("rsvp.healthConsent")).toBeNull();
  });

  it("renders only the vegan menu option when only vegan dishes exist", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled
        menuVeganoDishes={JSON.stringify([{ order: "first", text: "Hummus" }])}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    expect(screen.queryByText("rsvp.menuCarne")).toBeNull();
    expect(screen.queryByText("rsvp.menuPescado")).toBeNull();
    expect(screen.getByText("rsvp.menuVegano")).toBeDefined();
  });

  it("renders all menu options when every dish type is configured", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
        menuPescadoDishes={JSON.stringify([{ order: "primero", text: "Merluza" }])}
        menuVeganoDishes={JSON.stringify([{ order: "primero", text: "Hummus" }])}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    expect(screen.getByText("rsvp.menuCarne")).toBeDefined();
    expect(screen.getByText("rsvp.menuPescado")).toBeDefined();
    expect(screen.getByText("rsvp.menuVegano")).toBeDefined();
  });

  it("renders the menu text dishes block when configured", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled
        menuTextoDishes={JSON.stringify([{ order: "primero", text: "Entrante" }])}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    expect(screen.getByText("rsvp.menuLabel")).toBeDefined();
    expect(screen.getByText(/Entrante/)).toBeDefined();
  });

  it("renders the menu label for the first course order", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled
        menuCarneDishes={JSON.stringify([{ order: "first", text: "Solomillo" }])}
        rsvpForm={{ ...baseForm, attendance: "alone", menuSelection: "carne" }}
      />,
    );
    expect(screen.getByText((text: string) => text.includes("rsvp.menuCarne"))).toBeDefined();
    expect(screen.getByText((text: string) => text.includes("Solomillo"))).toBeDefined();
  });

  it("does not crash when the allergies array is missing", () => {
    const minimal = { ...baseForm } as never;
    render(<RsvpSection {...baseProps} rsvpForm={minimal} />);
    expect(screen.queryByText("rsvp.attendingLabel")).toBeDefined();
  });

  it("renders with a minimal form missing the optional companion arrays", () => {
    // Sin las arrays opcionales: los fallbacks (?.[i] || "", || []) se cubren.
    const minimal = { attendance: "with", guestName: "" } as never;
    render(<RsvpSection {...baseProps} rsvpForm={minimal} />);
    expect(screen.queryByText("rsvp.attendingWithCompanions")).toBeDefined();
  });
});
