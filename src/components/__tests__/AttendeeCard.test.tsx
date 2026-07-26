import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AttendeeCard from "../AttendeeCard";

afterEach(cleanup);

describe("AttendeeCard", () => {
  const defaultProps = {
    attendee: { name: "", menu: "", allergies: [] },
    index: 0,
    total: 1,
    menuEnabled: true,
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
    menus: [],
    allergiesOptions: ["sin gluten"],
    t: (key: string) => key,
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
});
