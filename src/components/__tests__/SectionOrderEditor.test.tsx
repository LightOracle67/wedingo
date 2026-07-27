import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import SectionOrderEditor from "../SectionOrderEditor";

describe("SectionOrderEditor", () => {
  const defaultProps = {
    value: "hero,details,info,story,gifts,gallery,rsvp,accommodation",
    onChange: vi.fn(),
    hiddenValue: "",
    onHiddenChange: vi.fn(),
  };

  it("renders section order editor", () => {
    render(<SectionOrderEditor {...defaultProps} />);
    expect(screen.getByText("sectionOrder.title")).toBeDefined();
  });

  it("renders all section items", () => {
    render(<SectionOrderEditor {...defaultProps} />);
    expect(screen.getByText("hero.sectionLabel")).toBeDefined();
    expect(screen.getByText("details.sectionLabel")).toBeDefined();
  });

  it("toggles visibility of a section", () => {
    const onHiddenChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onHiddenChange={onHiddenChange} />);

    const detailsToggle = screen.getByRole("button", { name: "common.hide details.sectionLabel" });
    fireEvent.click(detailsToggle);
    expect(onHiddenChange).toHaveBeenCalledWith("hiddenSections", "details");
  });

  it("shows hidden badge when section is hidden", () => {
    const onHiddenChange = vi.fn();
    render(
      <SectionOrderEditor
        {...defaultProps}
        hiddenValue="details"
        onHiddenChange={onHiddenChange}
      />
    );

    expect(screen.getByText("setup.hiddenSectionBadge")).toBeDefined();

    const detailsToggle = screen.getByRole("button", { name: "common.show details.sectionLabel" });
    fireEvent.click(detailsToggle);
    expect(onHiddenChange).toHaveBeenCalledWith("hiddenSections", "");
  });

  it("moves an item up with the up button", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const infoUp = screen.getByRole("button", { name: "sectionOrder.moveUp info.sectionLabel" });
    fireEvent.click(infoUp);
    expect(onChange).toHaveBeenCalledWith("sectionOrder", "hero,info,details,story,gifts,gallery,rsvp,accommodation");
  });

  it("moves an item down with the down button", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const infoDown = screen.getByRole("button", { name: "sectionOrder.moveDown info.sectionLabel" });
    fireEvent.click(infoDown);
    expect(onChange).toHaveBeenCalledWith("sectionOrder", "hero,details,story,info,gifts,gallery,rsvp,accommodation");
  });

  it("disables up button for hero section", () => {
    render(<SectionOrderEditor {...defaultProps} />);
    const heroUp = screen.queryByRole("button", { name: "sectionOrder.moveUp hero.sectionLabel" });
    expect(heroUp).not.toBeInTheDocument();
  });

  it("simulates drag and drop via start/over/drop/end events", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const items = document.querySelectorAll(".section-order-item");
    expect(items.length).toBeGreaterThanOrEqual(2);

    const fromEl = items[1];
    const toEl = items[2];

    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
    } as unknown as DataTransfer;

    fireEvent.dragStart(fromEl, { dataTransfer });
    fireEvent.dragEnter(toEl, { dataTransfer });
    fireEvent.dragOver(toEl, { dataTransfer });
    fireEvent.drop(toEl, { dataTransfer });
    fireEvent.dragEnd(fromEl, { dataTransfer });

    expect(onChange).toHaveBeenCalled();
  });
});
