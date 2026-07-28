import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AttendeeCard from "../AttendeeCard";
import type { Attendee } from "../../types";

afterEach(cleanup);

describe("AttendeeCard", () => {
  const defaultProps = {
    attendee: { name: "", menu: "" as Attendee["menu"], allergies: [] as string[] },
    index: 0,
    total: 1,
    menuEnabled: true,
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
    menus: [{ key: "carne", label: "Carne", desc: "Filete con guarnición" }],
    allergiesOptions: ["sin gluten", "frutos secos"],
    t: (key: string, _opts?: Record<string, unknown>) => key,
  };

  it("renders attendee name input", () => {
    render(<AttendeeCard {...defaultProps} />);
    expect(screen.getByPlaceholderText("rsvp.attendeeNamePlaceholder")).toBeDefined();
  });

  it("calls onUpdate when name changes", () => {
    const onUpdate = vi.fn();
    render(<AttendeeCard {...defaultProps} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByPlaceholderText("rsvp.attendeeNamePlaceholder"), { target: { value: "John" } });
    expect(onUpdate).toHaveBeenCalled();
  });

  it("shows menu description when a menu is selected", () => {
    const attendee = { name: "John", menu: "carne" as Attendee["menu"], allergies: [] };
    render(<AttendeeCard {...defaultProps} attendee={attendee} />);
    expect(screen.getByText("Filete con guarnición")).toBeDefined();
  });

  it("does not show menu description when no menu is selected", () => {
    render(<AttendeeCard {...defaultProps} />);
    expect(screen.queryByText("Filete con guarnición")).toBeNull();
  });

  it("shows remove button when total > 1", () => {
    render(<AttendeeCard {...defaultProps} total={2} index={0} />);
    const removeBtn = screen.getByLabelText("rsvp.removeAttendee");
    expect(removeBtn).toBeDefined();
  });

  it("hides remove button when total is 1", () => {
    render(<AttendeeCard {...defaultProps} total={1} />);
    expect(screen.queryByLabelText("rsvp.removeAttendee")).toBeNull();
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    render(<AttendeeCard {...defaultProps} total={2} index={0} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText("rsvp.removeAttendee"));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("renders allergies checkboxes", () => {
    render(<AttendeeCard {...defaultProps} />);
    expect(screen.getByLabelText(/sin gluten/)).toBeDefined();
    expect(screen.getByLabelText(/frutos secos/)).toBeDefined();
  });

  it("toggles allergy on click", () => {
    const onUpdate = vi.fn();
    render(<AttendeeCard {...defaultProps} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByLabelText(/sin gluten/));
    expect(onUpdate).toHaveBeenCalledWith(0, "allergies", ["sin gluten"]);
  });

  it("removes allergy on second click", () => {
    const onUpdate = vi.fn();
    const attendee = { name: "John", menu: "" as Attendee["menu"], allergies: ["sin gluten"] };
    render(<AttendeeCard {...defaultProps} attendee={attendee} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByLabelText(/sin gluten/));
    expect(onUpdate).toHaveBeenCalledWith(0, "allergies", []);
  });

  it("does not render menu section when menuEnabled is false", () => {
    render(<AttendeeCard {...defaultProps} menuEnabled={false} />);
    expect(screen.queryByLabelText("rsvp.menuLabel")).toBeNull();
  });

  it("renders menu select when menuEnabled is true", () => {
    render(<AttendeeCard {...defaultProps} />);
    expect(screen.getByLabelText("rsvp.menuLabel")).toBeDefined();
  });

  it("calls onUpdate when menu selection changes", () => {
    const onUpdate = vi.fn();
    render(<AttendeeCard {...defaultProps} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByLabelText("rsvp.menuLabel"), { target: { value: "carne" } });
    expect(onUpdate).toHaveBeenCalledWith(0, "menu", "carne");
  });

  it("handles nullish allergies in handleAllergyToggle", () => {
    const onUpdate = vi.fn();
    render(<AttendeeCard {...defaultProps} attendee={{ name: "", menu: "" as Attendee["menu"] }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByLabelText(/sin gluten/));
    expect(onUpdate).toHaveBeenCalledWith(0, "allergies", ["sin gluten"]);
  });

  it("handles nullish name via ?? fallback", () => {
    render(<AttendeeCard {...defaultProps} attendee={{ menu: "" as Attendee["menu"], allergies: [] }} />);
    const input = screen.getByPlaceholderText("rsvp.attendeeNamePlaceholder") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("handles nullish menu via ?? fallback", () => {
    render(<AttendeeCard {...defaultProps} menuEnabled={true} attendee={{ name: "John", allergies: [] }} />);
    const select = screen.getByLabelText("rsvp.menuLabel") as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("handles nullish allergies in checkbox rendering", () => {
    render(<AttendeeCard {...defaultProps} attendee={{ name: "John", menu: "" as Attendee["menu"] }} />);
    const checkbox = screen.getByLabelText(/sin gluten/) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });
});
