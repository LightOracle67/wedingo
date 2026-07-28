import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({ setLegalModal: vi.fn() }),
}));

vi.mock("../../../components/AttendeeCard", () => ({
  default: ({ index, attendee }: { index: number; attendee: { name: string } }) => (
    <div data-testid={`attendee-${index}`}>{attendee.name || "Unnamed"}</div>
  ),
}));

import RsvpSection from "../RsvpSection";

const baseForm = {
  guestName: "",
  attendance: "yes",
  birthDate: "",
  attendees: [],
  parentalConsent: false,
  privacyConsent: false,
  healthConsent: false,
  notAttendingCount: 1,
};

const baseProps = {
  style: {},
  className: "test",
  rsvpForm: baseForm,
  rsvpMessage: "",
  isRsvpSubmitting: false,
  hasSubmitted: false,
  alreadySubmittedEntry: null,
  updateRsvpField: vi.fn(),
  handleRsvpSubmit: vi.fn(),
  handleDeleteRsvp: vi.fn(),
  menuEnabled: false,
  menuCarne: "",
  menuPescado: "",
  menuVegano: "",
  menuPostre: "",
  menuTexto: "",
  computeAge: vi.fn(),
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

  it("shows not attending attendance option", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "no" }}
      />,
    );
    expect(screen.getByText((text: string) => text.includes("rsvp.notAttendingCountLabel"))).toBeDefined();
  });

  it("shows attendee section when attending", () => {
    render(<RsvpSection {...baseProps} rsvpForm={{ ...baseForm, attendance: "yes" }} />);
    expect(screen.getByText("rsvp.attendeesLabel")).toBeDefined();
    expect(screen.getByText("+ rsvp.addAttendee")).toBeDefined();
  });

  it("adds an attendee", () => {
    const updateRsvpField = vi.fn();
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{ ...baseForm, attendance: "yes" }}
        updateRsvpField={updateRsvpField}
      />,
    );
    fireEvent.click(screen.getByText("+ rsvp.addAttendee"));
    expect(updateRsvpField).toHaveBeenCalledWith("attendees", [{ name: "", menu: "", allergies: [] }]);
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

  it("shows structured menu when enabled", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled={true}
        menuCarne="Meat option"
        menuPescado="Fish option"
        menuVegano="Vegan option"
      />,
    );
    expect(screen.getByText("rsvp.allergiesHint")).toBeDefined();
  });

  it("shows menu texto when no structured menu", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled={true}
        menuCarne=""
        menuPescado=""
        menuVegano=""
        menuTexto="Custom menu info"
      />,
    );
    expect(screen.getByText("rsvp.menuLabel")).toBeDefined();
    expect(screen.getByText("Custom menu info")).toBeDefined();
  });

  it("shows health consent when dietary data exists", () => {
    render(
      <RsvpSection
        {...baseProps}
        rsvpForm={{
          ...baseForm,
          attendance: "yes",
          attendees: [{ name: "Test", menu: "", allergies: ["sin gluten"] }],
        }}
      />,
    );
    expect(screen.getByText("rsvp.healthConsent")).toBeDefined();
  });

  it("shows feedback message when rsvpMessage is set", () => {
    render(<RsvpSection {...baseProps} rsvpMessage="Thank you!" />);
    expect(screen.getByText("Thank you!")).toBeDefined();
  });

  it("shows postre when menuPostre is provided", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuPostre="Chocolate cake"
        menuEnabled={true}
        menuCarne="Meat"
      />,
    );
    expect(screen.getByText("rsvp.postre")).toBeDefined();
    expect(screen.getByText("Chocolate cake")).toBeDefined();
  });

  it("shows allergies hint when not menuEnabled", () => {
    render(
      <RsvpSection
        {...baseProps}
        menuEnabled={false}
        rsvpForm={{ ...baseForm, attendance: "yes" }}
      />,
    );
    expect(screen.getByText("rsvp.allergiesHint")).toBeDefined();
  });
});
