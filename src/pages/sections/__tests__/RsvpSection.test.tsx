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
});
