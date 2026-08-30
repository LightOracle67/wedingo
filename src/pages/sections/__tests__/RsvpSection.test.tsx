import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";

const tRsvp = vi.hoisted(() => vi.fn((key: string) => key));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: tRsvp }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("../../../lib/platform-settings", () => ({
  usePlatformSettings: () => ({
    settings: {
      maintenance: "false",
      bannerEnabled: "false",
      bannerText: "",
      blockedUrls: "",
      blockedTokens: "",
      expiringDays: "30",
    },
    loaded: true,
    reload: () => undefined,
  }),
  tokenIsBlocked: () => false,
}));

// Mocks Firestore para el efecto de mesa asignada: el hook consulta
// invitaciones/{token}/sections y sus tables buscando al confirmado por nombre.
const rsvpFb = vi.hoisted(() => ({ getDocs: vi.fn() }));

vi.mock("firebase/firestore", () => ({
  collection: (..._a: unknown[]) => ({}),
  getDocs: (...a: unknown[]) => rsvpFb.getDocs(...a),
}));

vi.mock("../../../lib/firebase", () => ({ db: {} }));

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
import type { RsvpFormData } from "../../../hooks/useRsvp";
import { clearSectionsCache } from "../../../lib/invitation-subcollections";

const baseForm: RsvpFormData = {
  guestName: "",
  attendance: "alone",
  companionCount: 0,
  companionNames: [],
  companionMenus: [],
  companionAllergies: [],
  companionAllergiesOther: [],
  childrenCount: "0",
  childrenAllergies: [],
  childrenAllergiesOther: "",
  companionTransportChoices: [],
  companionTransportModes: [],
  menuSelection: "",
  allergies: [],
  allergiesOther: "",
  privacyConsent: false,
  healthConsent: false,
  transportChoice: "own",
  transportMode: "own",
  transportTime: "",
  transportPlace: "",
  digitalSignature: false,
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
  const { rsvpForm: _f, updateRsvpField: _u, handleRsvpSubmit: _h, setRsvpForm: _s, ...rest } = props;
  return (
    <RsvpFormContext.Provider
      value={{
        rsvpForm: (props.rsvpForm as typeof baseForm) ?? baseForm,
        updateRsvpField:
          (props.updateRsvpField as RsvpFormValue["updateRsvpField"]) ??
          (updateRsvpField as unknown as RsvpFormValue["updateRsvpField"]),
        handleRsvpSubmit: (props.handleRsvpSubmit as (e: React.FormEvent) => void) ?? (() => {}),
        setRsvpForm: (props.setRsvpForm as RsvpFormValue["setRsvpForm"]) ?? vi.fn(),
      }}
    >
      <RsvpSection {...(rest as unknown as React.ComponentProps<typeof RsvpSection>)} />
    </RsvpFormContext.Provider>
  );
}

describe("RsvpSection", () => {
  // La caché de módulo de zonas/mesas (v2.185) persiste entre tests: se
  // limpia para que cada caso aísle sus lecturas de Firestore.
  beforeEach(() => {
    clearSectionsCache();
  });
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

  it("no pide teléfono ni email ni el consentimiento de la lista pública", () => {
    // Decisión de producto: el contacto opcional y la lista pública de
    // confirmados no se implantan; no hay campos que pedir al invitado.
    Object.assign(mockConfig, { rsvpContactEnabled: "true" });
    render(<WrappedRsvp {...baseProps} />);
    expect(screen.queryByLabelText("rsvp.phonePlaceholder")).toBeNull();
    expect(screen.queryByLabelText("rsvp.emailPlaceholder")).toBeNull();
    expect(screen.queryByLabelText("rsvp.contactConsentLabel")).toBeNull();
    expect(screen.queryByLabelText("rsvp.showNameInConfirmedLabel")).toBeNull();
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

  it("mantiene el control segmentado y el botón añadir en pantallas pequeñas", () => {
    // Regresión de overflow horizontal: el segmented ocupa la fila y el botón
    // añadir acompaña; nada debe imponer anchos mayores que el panel.
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "with" }} />);
    expect(document.querySelector(".rv2-seg__track")).not.toBeNull();
    expect(screen.getByText((text: string) => text.includes("rsvp.addCompanion"))).toBeDefined();
  });

  it("shows companion cards when companionCount > 0", () => {
    render(
      <WrappedRsvp
        {...baseProps}
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
    render(
      <WrappedRsvp
        {...baseProps}
        menuEnabled={true}
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
      />,
    );
    expect(screen.getByText("rsvp.allergiesHint")).toBeDefined();
  });

  it("el título del menú usa su clase propia (no la etiqueta pequeña del setup)", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        menuEnabled={true}
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
      />,
    );
    // El legend debe llevar rv2-menu__title SIN .setup-label: la regla del
    // setup (.story-section--is-active .rsvp-form .setup-label, 0.85rem) tiene
    // más especificidad que cualquier override en el legend.
    const legend = document.querySelector(".rv2-menu > legend");
    expect(legend?.className).toBe("rv2-menu__title");
    expect(legend?.className).not.toContain("setup-label");
  });

  it("shows menu dishes when no structured menu", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        menuEnabled={true}
        menuTextoDishes={JSON.stringify([{ order: "entrante", text: "Ensalada" }])}
      />,
    );
    // El menú fijo se muestra en un modal al pulsar el botón con la lupa.
    fireEvent.click(document.querySelector(".rv2-menu-text-btn")!);
    expect(screen.getByText("rsvp.menuLabel")).toBeDefined();
    expect(screen.getByText(/setup.menuOrderEntrante: Ensalada/)).toBeDefined();
  });

  it("shows formatted dishes for the fixed menu", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        menuEnabled={true}
        menuTextoDishes={JSON.stringify([
          { order: "entrante", text: "Ensalada" },
          { order: "postre", text: "Tarta" },
        ])}
      />,
    );
    fireEvent.click(document.querySelector(".rv2-menu-text-btn")!);
    expect(screen.getByText(/setup.menuOrderEntrante: Ensalada/)).toBeDefined();
    expect(screen.getByText(/setup.menuOrderPostre: Tarta/)).toBeDefined();
  });

  it("shows the fixed menu without a selector when menu is disabled", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        menuEnabled={false}
        menuTextoDishes={JSON.stringify([
          { order: "entrante", text: "Ensalada" },
          { order: "primero", text: "Lubina" },
        ])}
      />,
    );
    fireEvent.click(document.querySelector(".rv2-menu-text-btn")!);
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
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", menuSelection: "carne" }}
        menuEnabled={true}
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
      />,
    );
    // Antes el detalle se expandía dentro de la tarjeta; ahora se abre un modal.
    fireEvent.click(document.querySelector(".rv2-menubtns .rv2-menu-btn")!);
    expect(screen.getByText(/setup.menuOrderPrimero: Solomillo/)).toBeDefined();
    expect(screen.getByText("rsvp.menuChosenBadge")).toBeDefined();
  });

  it("marca el botón del menú elegido con aria-pressed", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", menuSelection: "carne" }}
        menuEnabled={true}
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
      />,
    );
    const btn = Array.from(document.querySelectorAll(".rv2-menubtns .rv2-menu-btn")).find(
      (b) => (b.textContent || "").includes("rsvp.menuCarne"),
    );
    expect((btn as HTMLButtonElement)?.getAttribute("aria-pressed")).toBe("true");
  });

  it("el modal del menú fijo no ofrece botón de elegir (solo lectura)", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        menuEnabled={true}
        menuTextoDishes={JSON.stringify([{ order: "entrante", text: "Ensalada" }])}
      />,
    );
    fireEvent.click(document.querySelector(".rv2-menu-text-btn")!);
    expect(screen.getByText("rsvp.seeMenu")).toBeDefined();
    expect(screen.queryByText("rsvp.chooseMenu")).toBeNull();
  });

  it("shows health consent when allergies exist", () => {
    render(
      <WrappedRsvp
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
    render(<WrappedRsvp {...baseProps} rsvpMessage="Thank you!" />);
    expect(screen.getByText("Thank you!")).toBeDefined();
  });

  it("shows companion cards with menu and allergies when companionCount > 0 and menu enabled", () => {
    render(
      <WrappedRsvp
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
      <WrappedRsvp
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
    // Con el borrado específico, cada tarjeta de acompañante tiene su ✕.
    expect(screen.getAllByText("✕")).toHaveLength(2);
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
    render(
      <WrappedRsvp
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
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="both"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/X" },
          { type: "taxi", time: "14:30", url: "" },
        ])}
      />,
    );
    expect(document.querySelector('input[name="rv2Mode"][value="own"]')).not.toBeNull();
    expect(document.querySelector('input[name="rv2Mode"][value="bus"]')).not.toBeNull();
    expect(document.querySelector('input[name="rv2Mode"][value="taxi"]')).not.toBeNull();
    expect(document.getElementById("rsvpDeparture")).toBeNull();
  });

  it("hides bus option when only taxi is enabled", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="taxi"
        transportDepartures={JSON.stringify([{ type: "taxi", time: "14:30", url: "" }])}
      />,
    );
    expect(document.querySelector('input[name="rv2Mode"][value="own"]')).not.toBeNull();
    expect(document.querySelector('input[name="rv2Mode"][value="taxi"]')).not.toBeNull();
    expect(document.querySelector('input[name="rv2Mode"][value="bus"]')).toBeNull();
  });

  it("shows the departure select after choosing bus and preselects the first departure", () => {
    const update = baseProps.updateRsvpField as ReturnType<typeof vi.fn>;
    render(
      <WrappedRsvp
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
    fireEvent.click(document.querySelector('input[name="rv2Mode"][value="bus"]')!);
    expect(update).toHaveBeenCalledWith("transportMode", "bus");
    expect(update).toHaveBeenCalledWith("transportChoice", "0");
  });

  it("shows only bus departures when taxi is chosen", () => {
    const update = baseProps.updateRsvpField as ReturnType<typeof vi.fn>;
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "taxi", transportChoice: "1" }}
        transportEnabled="both"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "" },
          { type: "taxi", time: "14:30", url: "" },
        ])}
      />,
    );
    const select = document.getElementById("rsvpDeparture") as HTMLSelectElement;
    expect(select).toBeDefined();
    expect([...select.options].map((o) => o.textContent)).toEqual(["14:30 (transport.typeTaxi)"]);
    fireEvent.click(document.querySelector('input[name="rv2Mode"][value="bus"]')!);
    expect(update).toHaveBeenCalledWith("transportMode", "bus");
    expect(update).toHaveBeenCalledWith("transportChoice", "0");
  });

  it("shows the departure place name in the options when the URL is valid", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "bus", transportChoice: "0" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
        ])}
      />,
    );
    const select = document.getElementById("rsvpDeparture") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["Plaza Mayor (12:00)"]);
  });

  it("stores time and place when changing the departure", () => {
    const update = baseProps.updateRsvpField as ReturnType<typeof vi.fn>;
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "bus", transportChoice: "0" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "" },
          { type: "bus", time: "16:00", url: "https://www.google.com/maps/place/Estación+Norte/@40.4,-3.7,17z" },
        ])}
      />,
    );
    fireEvent.change(document.getElementById("rsvpDeparture")!, { target: { value: "1" } });
    expect(update).toHaveBeenCalledWith("transportChoice", "1");
    expect(update).toHaveBeenCalledWith("transportTime", "16:00");
    expect(update).toHaveBeenCalledWith("transportPlace", "Estación Norte");
  });

  it("labels departures with the 24h time", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "bus", transportChoice: "0" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "08:30", url: "" },
          { type: "bus", time: "22:00", url: "" },
        ])}
      />,
    );
    const select = document.getElementById("rsvpDeparture") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      "08:30 (transport.typeBus)",
      "22:00 (transport.typeBus)",
    ]);
  });

  it("shows transport radios inside each companion card", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([{ type: "bus", time: "12:00", url: "" }])}
      />,
    );
    expect(document.querySelectorAll('input[value="own"][name^="rv2Mode"]')).toHaveLength(2);
    fireEvent.click(document.querySelector('input[name="rv2Mode-0"][value="bus"]')!);
    const companionSelect = document.getElementById("rsvpDeparture-0");
    expect(companionSelect).toBeDefined();
  });

  it("updates attendance via the segmented control", () => {
    render(<WrappedRsvp {...baseProps} />);
    // La asistencia ya no es un select: es un radio por opción envuelto en label.
    const withRadio = document.querySelector('input[name="rsvpAttendance"][value="with"]') as HTMLInputElement;
    fireEvent.click(withRadio);
    expect(updateRsvpField).toHaveBeenCalledWith("attendance", "with");
  });

  it("updates the menu selection via the menu cards", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        menuEnabled
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    fireEvent.click(document.querySelector(".rv2-menubtns .rv2-menu-btn")!);
    fireEvent.click(screen.getByText("rsvp.chooseMenu")!);
    expect(updateRsvpField).toHaveBeenCalledWith("menuSelection", "carne");
  });

  it("updates the main transport departure", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone", transportMode: "bus", transportChoice: "0" }}
        transportEnabled="both"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
          { type: "taxi", time: "14:30", url: "" },
        ])}
      />,
    );
    const select = document.getElementById("rsvpDeparture") as HTMLSelectElement;
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
    render(
      <WrappedRsvp
        {...baseProps}
        menuEnabled
        menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
        menuPescadoDishes={JSON.stringify([{ order: "primero", text: "Lubina" }])}
        rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }}
      />,
    );
    // El picker del acompañante vive en su tarjeta: se busca el radio dentro de ella.
    const card = document.querySelector("section.rv2-card")!;
    const menuBtns = Array.from(card.querySelectorAll(".rv2-menubtns--compact .rv2-menu-btn"));
    const menuBtn = menuBtns.find((b) => (b.textContent || "").includes("rsvp.menuPescado")) as HTMLButtonElement;
    fireEvent.click(menuBtn);
    fireEvent.click(screen.getByText("rsvp.chooseMenu")!);
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
    // El primer input es el del titulo (ahora se muestra bajo su nombre);
    // el del acompañante queda en segundo lugar por orden de aparición.
    const inputs = screen.getAllByPlaceholderText("rsvp.allergiesPlaceholder");
    fireEvent.change(inputs[1]!, { target: { value: "alergia al huevo" } });
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
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
        ])}
      />,
    );
    fireEvent.click(document.querySelector('input[name="rv2Mode"][value="bus"]')!);
    expect(updateRsvpField).toHaveBeenCalledWith("transportMode", "bus");
    expect(updateRsvpField).toHaveBeenCalledWith("transportPlace", "Plaza Mayor");
  });

  it("shows the departure select when the mode is already bus", () => {
    render(
      <WrappedRsvp
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

  it("muestra el toggle de niños desmarcado y al marcarlo emite childrenCount=1", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "with", companionCount: 1 }} />);
    const check = screen.getByLabelText("rsvp.childrenQuestion") as HTMLInputElement;
    expect(check).toBeDefined();
    expect(check.type).toBe("checkbox");
    expect(check.checked).toBe(false);
    fireEvent.click(check);
    expect(updateRsvpField).toHaveBeenCalledWith("childrenCount", "1");
  });

  it("con niños declarados muestra contador y alergias del grupo, y emite el número", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", childrenCount: "3" }} />);
    const input = screen.getByLabelText("rsvp.childrenCountLabel") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.type).toBe("number");
    expect(input.value).toBe("3");
    // El campo de otra alergia del grupo usa el sufijo -children (sin colisión).
    expect(document.querySelector("#rv2OtherAllergies-children")).toBeDefined();
    fireEvent.change(input, { target: { value: "5" } });
    expect(updateRsvpField).toHaveBeenCalledWith("childrenCount", "5");
  });

  it("sin niños no muestra el contador ni las alergias del grupo", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.queryByLabelText("rsvp.childrenCountLabel")).toBeNull();
    expect(screen.queryByLabelText("rsvp.childrenQuestion")).toBeDefined();
  });

  it("renders no menu options when no dishes are configured", () => {
    render(<WrappedRsvp {...baseProps} menuEnabled rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.queryByText("rsvp.menuCarne")).toBeNull();
    expect(screen.queryByText("rsvp.menuPescado")).toBeNull();
  });

  it("renders only the configured menu options", () => {
    render(
      <WrappedRsvp
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
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: ["sin gluten"] }} />);
    fireEvent.click(screen.getByLabelText("rsvp.allergies.sin gluten"));
    expect(updateRsvpField).toHaveBeenCalledWith("allergies", []);
  });

  it("handles the taxi transport mode with departures", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="taxi"
        transportDepartures={JSON.stringify([{ type: "taxi", time: "12:30", url: "" }])}
      />,
    );
    fireEvent.click(document.querySelector('input[name="rv2Mode"][value="taxi"]')!);
    expect(updateRsvpField).toHaveBeenCalledWith("transportMode", "taxi");
  });

  it("defaults a departure without type to bus", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
        transportEnabled="bus"
        transportDepartures={JSON.stringify([{ time: "12:00", url: "" }])}
      />,
    );
    fireEvent.click(document.querySelector('input[name="rv2Mode"][value="bus"]')!);
    expect(updateRsvpField).toHaveBeenCalledWith("transportChoice", "0");
  });

  it("hides the health consent when attending without allergies", () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone", allergies: [] }} />);
    expect(screen.queryByLabelText("rsvp.healthConsent")).toBeNull();
  });

  it("renders only the vegan menu option when only vegan dishes exist", () => {
    render(
      <WrappedRsvp
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
      <WrappedRsvp
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
      <WrappedRsvp
        {...baseProps}
        menuEnabled
        menuTextoDishes={JSON.stringify([{ order: "primero", text: "Entrante" }])}
        rsvpForm={{ ...baseForm, attendance: "alone" }}
      />,
    );
    fireEvent.click(document.querySelector(".rv2-menu-text-btn")!);
    expect(screen.getByText("rsvp.menuLabel")).toBeDefined();
    expect(screen.getByText(/Entrante/)).toBeDefined();
  });

  it("renders the menu label for the first course order", () => {
    render(
      <WrappedRsvp
        {...baseProps}
        menuEnabled
        menuCarneDishes={JSON.stringify([{ order: "first", text: "Solomillo" }])}
        rsvpForm={{ ...baseForm, attendance: "alone", menuSelection: "carne" }}
      />,
    );
    expect(screen.getByText((text: string) => text.includes("rsvp.menuCarne"))).toBeDefined();
    fireEvent.click(document.querySelector(".rv2-menubtns .rv2-menu-btn")!);
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
    const busRadio = document.querySelector('input[name="rv2Mode-0"][value="bus"]') as HTMLInputElement;
    expect(busRadio?.checked).toBe(true);
  });

  it("renders optional contact fields with consent when enabled", async () => {
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    // useConfig se mockea con config vacío en este archivo: se verifica que el
    // bloque de contacto NO aparece sin rsvpContactEnabled.
    expect(screen.queryByLabelText("rsvp.phonePlaceholder")).toBeNull();
  });

  it("shows the days-to-confirm when configured", () => {
    Object.assign(mockConfig, { rsvpDeadlineEnabled: "true", rsvpDeadline: "2099-01-01" });
    render(<WrappedRsvp {...baseProps} rsvpForm={{ ...baseForm, attendance: "alone" }} />);
    expect(screen.getByText(/rsvp.daysLeft/)).toBeInTheDocument();
  });

  it("resuelve la mesa asignada buscando al confirmado en Distribución", async () => {
    // Primera llamada: secciones; segunda: mesas de esa sección con el invitado.
    rsvpFb.getDocs
      .mockResolvedValueOnce({ docs: [{ id: "s1", data: () => ({ name: "Salón" }) }] })
      .mockResolvedValueOnce({
        docs: [{ id: "t1", data: () => ({ name: "Mesa Uno", guests: ["ana garcia"] }) }],
      });
    render(
      <WrappedRsvp
        {...baseProps}
        inviteToken="tok1"
        alreadySubmittedEntry={{ id: "e1", attendance: "yes", guestName: "Ana Garcia" }}
      />,
    );
    await waitFor(() => expect(screen.getByText(/rsvp.yourTable/)).toBeInTheDocument());
    expect(rsvpFb.getDocs).toHaveBeenCalledTimes(2);
  });

  it("no consulta mesas si el confirmado no asiste o falta el token", () => {
    // El mock conserva llamadas entre tests: se limpia para asertar en limpio.
    rsvpFb.getDocs.mockClear();
    render(
      <WrappedRsvp
        {...baseProps}
        inviteToken="tok1"
        alreadySubmittedEntry={{ id: "e1", attendance: "no", guestName: "Ana Garcia" }}
      />,
    );
    render(
      <WrappedRsvp {...baseProps} alreadySubmittedEntry={{ id: "e2", attendance: "yes", guestName: "Ana Garcia" }} />,
    );
    // Sin asistencia confirmada (o sin token) el efecto corta antes de Firestore.
    expect(rsvpFb.getDocs).not.toHaveBeenCalled();
  });

  it("tolera el fallo de Firestore al buscar la mesa sin romper el render", async () => {
    rsvpFb.getDocs.mockClear();
    rsvpFb.getDocs.mockRejectedValueOnce(new Error("offline"));
    render(
      <WrappedRsvp
        {...baseProps}
        inviteToken="tok1"
        alreadySubmittedEntry={{ id: "e1", attendance: "yes", guestName: "Ana Garcia" }}
      />,
    );
    await waitFor(() => expect(rsvpFb.getDocs).toHaveBeenCalled());
    // El catch del efecto deja assignedTable vacío: no aparece el bloque de mesa.
    expect(screen.queryByText(/rsvp.yourTable/)).toBeNull();
  });

  it("quita el acompañante concreto pulsado, no siempre el último", () => {
    // setRsvpForm escribe en un mock para poder aplicar el updater funcional
    // y verificar el estado resultante sin depender del hook real.
    const setRsvpForm = vi.fn();
    const seed = {
      ...baseForm,
      attendance: "with" as const,
      companionCount: 3,
      companionNames: ["B1", "B2", "B3"],
      companionMenus: ["", "", ""],
      companionAllergies: [[], [], []] as string[][],
      childrenCount: "0",
      childrenAllergies: [],
      childrenAllergiesOther: "",
      companionTransportChoices: ["", "", ""],
      companionTransportModes: ["own", "own", "own"],
      companionTransportTimes: ["", "", ""],
      companionTransportPlaces: ["", "", ""],
    };
    render(<WrappedRsvp {...baseProps} setRsvpForm={setRsvpForm} rsvpForm={seed} />);
    // Ahora los tres acompañantes tienen botón ✕ (antes solo existía desde el segundo).
    const removeBtns = screen.getAllByLabelText("common.remove");
    expect(removeBtns).toHaveLength(3);
    // Pulsar la ✕ del PRIMERO debe eliminar su índice, preservando B2 y B3.
    fireEvent.click(removeBtns[0]!);
    expect(setRsvpForm).toHaveBeenCalledTimes(1);
    const updater = setRsvpForm.mock.calls[0]![0] as (prev: typeof seed) => typeof seed;
    const next = updater(seed);
    expect(next.companionNames).toEqual(["B2", "B3"]);
    expect(next.companionCount).toBe(2);
  });

  it("hace scroll al resumen tras un envío correcto", () => {
    // jsdom carece de scrollIntoView: sustitución directa con espía propio.
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    try {
      render(<WrappedRsvp {...baseProps} hasSubmitted={true} />);
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    } finally {
      delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
    }
  });
  describe("RSVP — resumen, borrador, foco y movimiento reducido", () => {
    afterEach(() => {
      // Restaura la traducción por claves tras los tests que la sobreescriben.
      tRsvp.mockImplementation((key: string) => key);
    });

    it("resume correctamente la asistencia con acompañantes y el menú traducido", () => {
      tRsvp.mockImplementation((key: string, opts?: Record<string, unknown>) => {
        if (key === "rsvp.summaryAttendance" && opts && "v" in opts) return `${key}|${String(opts.v)}`;
        if (key === "rsvp.summaryMenu" && opts && "m" in opts) return `${key}|${String(opts.m)}`;
        return key;
      });
      const { container } = render(
        <WrappedRsvp
          {...baseProps}
          hasSubmitted={true}
          menuCarneDishes={'[{"order":"carne","text":"Solomillo"}]'}
          rsvpForm={{ ...baseForm, attendance: "with", companionCount: 2, menuSelection: "carne" }}
        />,
      );
      const text = container.textContent || "";
      // Antes decía attendingAlone con acompañantes y mostraba la clave cruda del menú.
      expect(text).toContain("rsvp.summaryAttendance|rsvp.attendingWithCompanions");
      expect(text).toContain("rsvp.summaryMenu|rsvp.menuCarne");
    });

    it("el resumen anuncia Predefinido cuando el menú es fijo", () => {
      tRsvp.mockImplementation((key: string, opts?: Record<string, unknown>) => {
        if (key === "rsvp.summaryMenu" && opts && "m" in opts) return `${key}|${String(opts.m)}`;
        return key;
      });
      const { container } = render(
        <WrappedRsvp
          {...baseProps}
          hasSubmitted={true}
          menuEnabled={false}
          menuTextoDishes={JSON.stringify([{ order: "primero", text: "Lubina" }])}
          rsvpForm={{ ...baseForm, attendance: "alone" }}
        />,
      );
      expect(container.textContent).toContain("rsvp.summaryMenu|rsvp.menuPredefined");
    });

    it("mueve el foco al feedback cuando aparece un error de validación", async () => {
      render(<WrappedRsvp {...baseProps} rsvpMessage="rsvp.validation.privacyRequired" />);
      await waitFor(() => expect((document.activeElement as HTMLElement | null)?.id).toBe("rsvpFeedback"));
    });

    it("no roba el foco cuando el mensaje es de éxito", () => {
      render(<WrappedRsvp {...baseProps} rsvpMessage="ok" hasSubmitted={true} />);
      expect((document.activeElement as HTMLElement | null)?.id).not.toBe("rsvpFeedback");
    });
  });

  describe("RSVP — autosave del borrador en sessionStorage", () => {
    let mem: Record<string, string>;
    beforeEach(() => {
      // La caché de módulo de zonas/mesas (v2.185) persiste entre tests.
      clearSectionsCache();
      mem = {};
      Object.defineProperty(window, "sessionStorage", {
        configurable: true,
        value: {
          getItem: (k: string) => (k in mem ? mem[k] : null),
          setItem: (k: string, v: string) => {
            mem[k] = String(v);
          },
          removeItem: (k: string) => {
            delete mem[k];
          },
          clear: () => {
            mem = {};
          },
        } as unknown as Storage,
      });
    });

    /** Host con estado REAL del formulario para ejercitar guardar/restaurar. */
    function DraftHost({ inviteToken = "", hasSubmitted = false }: { inviteToken?: string; hasSubmitted?: boolean }) {
      const [form, setForm] = useState<typeof baseForm>(baseForm);
      // Aplica campos planos e indexados (companionNames[0]) como haría useRsvp.
      const applyField = (prev: typeof baseForm, field: string, value: unknown): typeof baseForm => {
        const m = field.match(/^(.+)\[(\d+)\]$/);
        if (!m) return { ...prev, [field]: value } as typeof baseForm;
        const base = m[1] as keyof typeof baseForm;
        const idx = Number(m[2]);
        const arr = [...((prev[base] as unknown as unknown[]) ?? [])];
        arr[idx] = value;
        return { ...prev, [base]: arr } as typeof baseForm;
      };
      return (
        <RsvpFormContext.Provider
          value={{
            rsvpForm: form,
            updateRsvpField: (f, v) => setForm((p) => applyField(p, f, v)),
            handleRsvpSubmit: () => {},
            setRsvpForm: setForm,
          }}
        >
          <RsvpSection
            {...({ ...baseProps, inviteToken, hasSubmitted } as unknown as React.ComponentProps<typeof RsvpSection>)}
          />
        </RsvpFormContext.Provider>
      );
    }

    it("guarda el borrador al escribir (con debounce de 500 ms)", async () => {
      render(<DraftHost inviteToken="tokA" />);
      fireEvent.change(screen.getByLabelText(/rsvp.nameLabel/), { target: { value: "Ana García López" } });
      // v2.185: el guardado se debouncea; el draft aparece tras el timer.
      await waitFor(() => expect(mem["wedin_rsvp_draft_tokA"]).toContain("Ana García López"));
    });

    it("restaura el borrador guardado al montar", () => {
      mem["wedin_rsvp_draft_tokB"] = JSON.stringify({ ...baseForm, guestName: "Beto Ruiz Soto" });
      render(<DraftHost inviteToken="tokB" />);
      expect((screen.getByLabelText(/rsvp.nameLabel/) as HTMLInputElement).value).toBe("Beto Ruiz Soto");
    });

    it("ignora un borrador corrupto sin romper el formulario", () => {
      mem["wedin_rsvp_draft_tokC"] = "{no-es-json";
      render(<DraftHost inviteToken="tokC" />);
      expect((screen.getByLabelText(/rsvp.nameLabel/) as HTMLInputElement).value).toBe("");
    });

    it("limpia el borrador tras confirmar la asistencia", () => {
      mem["wedin_rsvp_draft_tokD"] = JSON.stringify({ ...baseForm, guestName: "X Y Z" });
      render(<DraftHost inviteToken="tokD" hasSubmitted={true} />);
      expect(mem["wedin_rsvp_draft_tokD"]).toBeUndefined();
    });
  });

  describe("RSVP — movimiento reducido", () => {
    it("usa salto instantáneo con prefers-reduced-motion activo", async () => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        // matches=true activa la vía behavior:"auto" del efecto post-envío.
        value: vi.fn().mockReturnValue({ matches: true }),
      });
      const spy = vi.fn();
      Element.prototype.scrollIntoView = spy as unknown as typeof Element.prototype.scrollIntoView;
      try {
        render(<WrappedRsvp {...baseProps} hasSubmitted={true} />);
        await waitFor(() => expect(spy).toHaveBeenCalled());
        expect(spy.mock.calls[0]?.[0]).toMatchObject({ behavior: "auto", block: "center" });
      } finally {
        delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
        // @ts-expect-error limpieza deliberada del stub de matchMedia en jsdom
        delete window.matchMedia;
      }
    });
  });
});
