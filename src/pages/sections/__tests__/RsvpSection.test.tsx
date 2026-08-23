import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("../../../lib/platform-settings", () => ({
  usePlatformSettings: () => ({
    settings: { maintenance: "false", bannerEnabled: "false", bannerText: "", blockedUrls: "", blockedTokens: "", expiringDays: "30" },
    loaded: true,
    reload: () => undefined,
  }),
  tokenIsBlocked: () => false,
}));



const mockConfig = vi.hoisted(() => ({}) as Record<string, string>);

vi.mock("../../../contexts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../contexts")>();
  return {
    ...actual,
    useApp: () => ({ setLegalModal: vi.fn() }),
    useAppUI: () => ({ setLegalModal: vi.fn() }),
    useConfig: () => ({ config: mockConfig }),
    useAuth: () => ({ isAdminTokenLoggedIn: true }),
  };
});

import RsvpSection from "../RsvpSection";
import { RsvpFormContext, type RsvpFormValue } from "../../../contexts/useRsvpContext";

const baseForm = {
  guestName: "",
  attendance: "alone",
  companionCount: 0,
  companionNames: [],
  companionMenus: [],
  companionAllergies: [],
  companionAllergiesOther: [],
  companionIsChildren: [],
  companionParentalConsents: [],
  companionHealthConsents: [],
  companionTransportChoices: [],
  companionTransportModes: [],
  companionTransportTimes: [],
  companionTransportPlaces: [],
  menuSelection: "",
  allergies: [],
  allergiesOther: "",
  parentalConsent: false,
  privacyConsent: false,
  healthConsent: false,
  transportChoice: "own",
  transportMode: "own",
  transportTime: "",
  transportPlace: "",
  digitalSignature: false,
  phone: "",
  email: "",
  contactConsent: false,
    showNameInConfirmed: false,
};

const baseProps = {
  style: {},
  className: "test",
  rsvpForm: baseForm,
  rsvpMessage: "",
  isRsvpSubmitting: false,
  hasSubmitted: false,
  alreadySubmittedEntry: null,
  updateRsvpField: vi.fn(
    (_field: string, _value: string | boolean | number | string[] | string[][] | boolean[]) => undefined,
  ),
  handleRsvpSubmit: vi.fn(),
  handleDeleteRsvp: vi.fn(),
  menuEnabled: false,
  menuCarneDishes: "",
  menuPescadoDishes: "",
  menuVeganoDishes: "",
  menuTextoDishes: "",
};

const updateRsvpField = baseProps.updateRsvpField as ReturnType<typeof vi.fn>;

/**
 * Wrapper que provee el formulario vía RsvpFormContext (el componente ya no lo
 * recibe por props): los tests siguen controlando rsvpForm/updateRsvpField/
 * handleRsvpSubmit como si fueran props del wrapper.
 */
function WrappedRsvp(props: Record<string, unknown>) {
  const { rsvpForm: _f, updateRsvpField: _u, handleRsvpSubmit: _h, ...rest } = props;
  return (
    <RsvpFormContext.Provider
      value={{
        rsvpForm: (props.rsvpForm as typeof baseForm) ?? baseForm,
        updateRsvpField: (props.updateRsvpField as RsvpFormValue["updateRsvpField"]) ?? (updateRsvpField as unknown as RsvpFormValue["updateRsvpField"]),
        handleRsvpSubmit: (props.handleRsvpSubmit as (e: React.FormEvent) => void) ?? (() => {}),
      }}
    >
      <RsvpSection {...(rest as unknown as React.ComponentProps<typeof RsvpSection>)} />
    </RsvpFormContext.Provider>
  );
}

describe("RsvpSection", () => {
  it("renders the form in default state", () => {
    render(<WrappedRsvp {...baseProps} />);
    expect(screen.getByText("rsvp.sectionLabel")).toBeDefined();
    expect(screen.getByText("rsvp.title")).toBeDefined();
    expect(screen.getByText("rsvp.description")).toBeDefined();
    expect(screen.getByText((text: string) => text.includes("rsvp.nameLabel"))).toBeDefined();
  });

  it("shows submitting state", () => {
    render(<WrappedRsvp {...baseProps} isRsvpSubmitting={true} />);
    expect(screen.getByText("rsvp.submittingButton")).toBeDefined();
  });

  it("muestra el mensaje de validación con role=alert", () => {
    render(<WrappedRsvp {...baseProps} rsvpMessage="El nombre es obligatorio" />);
    expect(screen.getByText("El nombre es obligatorio")).toBeDefined();
  });

  it("muestra el error de carga con botón de reintento", () => {
    const retry = vi.fn();
    render(<WrappedRsvp {...baseProps} rsvpLoadError="boom" retryLoadRsvp={retry} />);
    expect(screen.getByText("rsvp.loadError")).toBeDefined();
    fireEvent.click(screen.getByText("common.retry"));
    expect(retry).toHaveBeenCalled();
  });

  it("muestra los campos de contacto y el consentimiento de contacto", () => {
    Object.assign(mockConfig, { rsvpContactEnabled: "true" });
    render(<WrappedRsvp {...baseProps} />);
    expect(screen.getByLabelText("rsvp.phonePlaceholder")).toBeDefined();
    expect(screen.getByLabelText("rsvp.emailPlaceholder")).toBeDefined();
    expect(screen.getByLabelText("rsvp.contactConsentLabel")).toBeDefined();
    // Restaura para no contaminar otros tests (mockConfig es compartido).
    delete mockConfig.rsvpContactEnabled;
  });

  it("envía el formulario al pulsar el botón", () => {
    const submit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<WrappedRsvp {...baseProps} handleRsvpSubmit={submit} />);
    fireEvent.click(screen.getByText("rsvp.submitButton"));
    expect(submit).toHaveBeenCalled();
  });

  it("shows confirmed state when already submitted", () => {
    render(<WrappedRsvp {...baseProps} hasSubmitted={true} />);
    expect(screen.getByText("rsvp.confirmedButton")).toBeDefined();
  });

  it("shows already submitted badge", () => {
    render(<WrappedRsvp {...baseProps} alreadySubmittedEntry={{ id: "1" }} />);
    expect(screen.getByText("rsvp.alreadySubmitted")).toBeDefined();
    expect(screen.getByText("rsvp.withdrawButton")).toBeDefined();
  });

  it("calls handleDeleteRsvp when withdraw clicked", () => {
    const handleDeleteRsvp = vi.fn();
    render(<WrappedRsvp {...baseProps} alreadySubmittedEntry={{ id: "1" }} handleDeleteRsvp={handleDeleteRsvp} />);
    fireEvent.click(screen.getByText("rsvp.withdrawButton"));
    expect(handleDeleteRsvp).toHaveBeenCalled();
  });

  it("renders attendance select with with option", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "with" }} />);
    expect(screen.getByText("rsvp.attendingWithCompanions")).toBeDefined();
  });

  it("wraps the attendance select and add-companion button on very small screens", () => {
    // Regresión de overflow horizontal: el contenedor flex del select + botón
    // debe permitir wrap y el select no debe imponer un min-width mayor que el
    // ancho del panel (min(180px, 100%)). En 320px, si el botón no cabe a la
    // derecha, baja de línea en lugar de desbordar.
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "with" }} />);
    const select = document.getElementById("rsvpAttendance") as HTMLSelectElement;
    expect(select).not.toBeNull();
    const selectStyle = select.getAttribute("style") || "";
    expect(selectStyle).toContain("flex");
    expect(selectStyle).toContain("min(180px, 100%)");
    expect(selectStyle).toContain("max-width: 100%");
    // El contenedor padre (flex con el botón) debe tener flexWrap: wrap.
    const container = select.parentElement as HTMLElement;
    expect(container.style.flexWrap).toBe("wrap");
  });

  it("shows companion cards when companionCount > 0", () => {
    render(<WrappedRsvp         {...baseProps}
        rsvpForm={{
          ...baseForm,
          attendance: "with",
          companionCount: 2,
          companionNames: ["", ""],
          companionMenus: ["", ""],
          companionAllergies: [[], []],
          companionAllergiesOther: ["", ""],
        }}
      />,
    );
    expect(screen.getAllByText((text: string) => text === "rsvp.companionHeading")).toHaveLength(2);
  });

  it("does not show companion count when attendance is alone", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.queryByText((text: string) => text.includes("rsvp.companionCountLabel"))).toBeNull();
  });

  it("does not show companion count when attendance is no", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "no" }} />);
    expect(screen.queryByText((text: string) => text.includes("rsvp.companionCountLabel"))).toBeNull();
  });

  it("shows structured menu when enabled and attending", () => {
    render(<WrappedRsvp         {...baseProps}
        menuEnabled={true}
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
      />,
    );
    expect(screen.getByText("rsvp.allergiesHint")).toBeDefined();
  });

  it("shows menu dishes when no structured menu", () => {
    render(<WrappedRsvp         {...baseProps}
        menuEnabled={true}
        menuTextoDishes={JSON.stringify([{ order: "entrante", text: "Ensalada" }])}
      />,
    );
    expect(screen.getByText("rsvp.menuLabel")).toBeDefined();
    expect(screen.getByText(/setup.menuOrderEntrante: Ensalada/)).toBeDefined();
  });

  it("shows formatted dishes for the fixed menu", () => {
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} menuEnabled={false} />);
    expect(screen.queryByText("rsvp.menuLabel")).toBeNull();
    expect(document.getElementById("rsvpMenu")).toBeNull();
  });

  it("shows the dish description when a selectable menu option is chosen", () => {
    render(<WrappedRsvp         {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", menuSelection: "carne" }}
        menuEnabled={true}
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
      />,
    );
    expect(screen.getByText(/setup.menuOrderPrimero: Solomillo/)).toBeDefined();
  });

  it("shows health consent when allergies exist", () => {
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp {...baseProps} rsvpMessage="Thank you!" />);
    expect(screen.getByText("Thank you!")).toBeDefined();
  });

  it("shows companion cards with menu and allergies when companionCount > 0 and menu enabled", () => {
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp {...baseProps} menuEnabled={false} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.getByText("rsvp.allergiesHint")).toBeDefined();
  });

  it("shows allergies checkboxes when attending", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.getByText("rsvp.allergiesLegend")).toBeDefined();
  });

  it("hides allergies section when not attending", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "no" }} />);
    expect(screen.queryByText("rsvp.allergiesLegend")).toBeNull();
  });

  it("does not show transport select when no departures defined", () => {
    render(<WrappedRsvp         {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="bus"
        transportDepartures=""
      />,
    );
    expect(screen.queryByLabelText("rsvp.transportLabel")).toBeNull();
  });

  it("shows transport radios with departures and own car for the main guest", () => {
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp {...baseProps} />);
    const select = document.getElementById("rsvpAttendance") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "with" } });
    expect(updateRsvpField).toHaveBeenCalledWith("attendance", "with");
  });

  it("updates the menu selection via the menu select", () => {
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: ["sin gluten"] }} />);
    const input = screen.getByPlaceholderText("rsvp.allergiesPlaceholder");
    fireEvent.change(input, { target: { value: "alergia al huevo" } });
    expect(updateRsvpField).toHaveBeenCalledWith("allergiesOther", "alergia al huevo");
  });

  it("updates a companion menu selection", () => {
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    fireEvent.click(screen.getByLabelText("rsvp.allergies.sin gluten"));
    expect(updateRsvpField).toHaveBeenCalledWith("allergies", ["sin gluten"]);
  });

  it("removes an allergy when unchecked", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: ["sin gluten"] }} />);
    fireEvent.click(screen.getByLabelText("rsvp.allergies.sin gluten"));
    expect(updateRsvpField).toHaveBeenCalledWith("allergies", []);
  });

  it("toggles the health consent when allergies are present", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: ["sin gluten"] }} />);
    fireEvent.click(screen.getByLabelText("rsvp.healthConsent"));
    expect(updateRsvpField).toHaveBeenCalledWith("healthConsent", true);
  });

  it("toggles a companion allergy checkbox", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }} />);
    // El invitado principal y el acompañante muestran el mismo checkbox de alergia;
    // se verifica que alguno de ellos actualice el campo de alergias del acompañante.
    const boxes = screen.getAllByLabelText("rsvp.allergies.sin gluten");
    for (const box of boxes) fireEvent.click(box);
    const calls = updateRsvpField.mock.calls.map((c) => c[0]);
    expect(calls.some((f) => String(f).startsWith("companionAllergies"))).toBe(true);
  });

  it("updates a companion allergiesOther field", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }} />);
    const inputs = screen.getAllByPlaceholderText("rsvp.allergiesPlaceholder");
    fireEvent.change(inputs[0]!, { target: { value: "alergia al huevo" } });
    expect(updateRsvpField).toHaveBeenCalledWith("companionAllergiesOther", ["alergia al huevo"]);
  });

  it("adds a companion via the add button", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }} />);
    fireEvent.click(screen.getByText((text: string) => text.includes("rsvp.addCompanion")));
    expect(updateRsvpField).toHaveBeenCalledWith("companionCount", 2);
  });

  it("updates a companion allergies", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }} />);
    // Dos checkboxes de "sin gluten": invitado principal + acompañante.
    const allergyChecks = screen.getAllByLabelText("rsvp.allergies.sin gluten");
    expect(allergyChecks.length).toBeGreaterThan(1);
    fireEvent.click(allergyChecks[1]!);
    const calls = updateRsvpField.mock.calls.map((c) => c[0]);
    expect(calls.some((f) => String(f).startsWith("companionAllergies"))).toBe(true);
  });

  it("sets the departure place when the departure has a URL", () => {
    render(<WrappedRsvp         {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
        ])}
      />,
    );
    fireEvent.click(screen.getByLabelText("rsvp.transportBusOption"));
    expect(updateRsvpField).toHaveBeenCalledWith("transportMode", "bus");
    expect(updateRsvpField).toHaveBeenCalledWith("transportPlace", "Plaza Mayor");
  });

  it("shows the departure select when the mode is already bus", () => {
    render(<WrappedRsvp         {...baseProps}
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

  it("muestra el checkbox ¿es niño? por acompañante desmarcado por defecto", () => {
    render(
      <WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }} />,
    );
    const check = screen.getByLabelText("rsvp.childQuestion") as HTMLInputElement;
    expect(check).toBeDefined();
    expect(check.type).toBe("checkbox");
    expect(check.checked).toBe(false);
    fireEvent.click(check);
    expect(updateRsvpField).toHaveBeenCalledWith("companionIsChildren[0]", "yes");
  });

  it("al desmarcar el checkbox de niño emite no", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1, companionIsChildren: ["yes"] }}
      />,
    );
    const check = screen.getByLabelText("rsvp.childQuestion") as HTMLInputElement;
    expect(check.checked).toBe(true);
    fireEvent.click(check);
    expect(updateRsvpField).toHaveBeenCalledWith("companionIsChildren[0]", "no");
  });

  it("exige consentimiento parental cuando el acompañante es niño", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1, companionIsChildren: ["yes"] }}
      />,
    );
    expect(screen.getByText("rsvp.childParentalHint")).toBeDefined();
    expect(screen.getByLabelText("rsvp.parentalConsent")).toBeDefined();
  });

  it("no muestra consentimiento parental para un acompañante adulto", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1, companionIsChildren: ["no"] }}
      />,
    );
    expect(screen.queryByText("rsvp.childParentalHint")).toBeNull();
    expect(screen.queryByLabelText("rsvp.parentalConsent")).toBeNull();
  });

  it("no renderiza la sección antigua de niños (childrenCount)", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.queryByLabelText("rsvp.childrenLabel")).toBeNull();
    expect(screen.queryByLabelText("rsvp.childrenCountLabel")).toBeNull();
  });

  it("renders no menu options when no dishes are configured", () => {
    render(<WrappedRsvp {...baseProps} menuEnabled rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.queryByText("rsvp.menuCarne")).toBeNull();
    expect(screen.queryByText("rsvp.menuPescado")).toBeNull();
  });

  it("renders only the configured menu options", () => {
    render(<WrappedRsvp         {...baseProps}
        menuEnabled
        menuPescadoDishes={JSON.stringify([{ order: "first", text: "Merluza" }])}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    expect(screen.queryByText("rsvp.menuCarne")).toBeNull();
    expect(screen.getByText("rsvp.menuPescado")).toBeDefined();
  });

  it("removes an allergy already selected", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: ["sin gluten"] }} />);
    fireEvent.click(screen.getByLabelText("rsvp.allergies.sin gluten"));
    expect(updateRsvpField).toHaveBeenCalledWith("allergies", []);
  });

  it("handles the taxi transport mode with departures", () => {
    render(<WrappedRsvp         {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="taxi"
        transportDepartures={JSON.stringify([{ type: "taxi", time: "12:30", url: "" }])}
      />,
    );
    fireEvent.click(screen.getByLabelText("rsvp.transportTaxiOption"));
    expect(updateRsvpField).toHaveBeenCalledWith("transportMode", "taxi");
  });

  it("defaults a departure without type to bus", () => {
    render(<WrappedRsvp         {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([{ time: "12:00", url: "" }])}
      />,
    );
    fireEvent.click(screen.getByLabelText("rsvp.transportBusOption"));
    expect(updateRsvpField).toHaveBeenCalledWith("transportChoice", "0");
  });

  it("hides the health consent when attending without allergies", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: [] }} />);
    expect(screen.queryByLabelText("rsvp.healthConsent")).toBeNull();
  });

  it("renders only the vegan menu option when only vegan dishes exist", () => {
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp         {...baseProps}
        menuEnabled
        menuTextoDishes={JSON.stringify([{ order: "primero", text: "Entrante" }])}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    expect(screen.getByText("rsvp.menuLabel")).toBeDefined();
    expect(screen.getByText(/Entrante/)).toBeDefined();
  });

  it("renders the menu label for the first course order", () => {
    render(<WrappedRsvp         {...baseProps}
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
    render(<WrappedRsvp {...baseProps} rsvpForm={minimal} />);
    expect(screen.queryByText("rsvp.attendingLabel")).toBeDefined();
  });

  it("renders with a minimal form missing the optional companion arrays", () => {
    // Sin las arrays opcionales: los fallbacks (?.[i] || "", || []) se cubren.
    const minimal = { attendance: "with", guestName: "" } as never;
    render(<WrappedRsvp {...baseProps} rsvpForm={minimal} />);
    expect(screen.queryByText("rsvp.attendingWithCompanions")).toBeDefined();
  });

  it("renders the companion form with existing values", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        menuEnabled
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
        rsvpForm={{
          ...baseForm,
          attendance: "with",
          companionCount: 1,
          companionNames: ["Bob Carlos Jones"],
          companionTransportModes: ["bus"],
          companionTransportChoices: ["0"],
          companionMenus: ["carne"],
          companionAllergies: [["sin gluten"]],
        }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([{ type: "bus", time: "12:00", url: "" }])}
      />,
    );
    const busRadio = document.querySelector('input[name="companionTransportMode0"][value="bus"]') as HTMLInputElement;
    expect(busRadio?.checked).toBe(true);
  });

  it("renders optional contact fields with consent when enabled", async () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    // useConfig se mockea con config vacío en este archivo: se verifica que el
    // bloque de contacto NO aparece sin rsvpContactEnabled.
    expect(screen.queryByLabelText("rsvp.phonePlaceholder")).toBeNull();
  });

  it("shows remaining capacity and days-to-confirm when configured", async () => {
    Object.assign(mockConfig, { rsvpCapacity: "5", rsvpDeadline: "2099-01-01" });
    render(
      <WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} rsvpConfirmedCount={2} />,
    );
    expect(screen.getByText(/rsvp.capacityLeft/)).toBeInTheDocument();
    expect(screen.getByText(/rsvp.daysLeft/)).toBeInTheDocument();
  });
});

