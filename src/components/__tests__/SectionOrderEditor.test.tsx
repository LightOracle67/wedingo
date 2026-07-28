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

  it("prevents drag on hero section", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const items = document.querySelectorAll(".section-order-item");
    const heroEl = items[0];
    expect(heroEl.getAttribute("draggable")).toBe("false");

    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
    } as unknown as DataTransfer;

    fireEvent.dragStart(heroEl, { dataTransfer });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does nothing on drop when from equals to", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const items = document.querySelectorAll(".section-order-item");
    const el = items[1];

    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
    } as unknown as DataTransfer;

    fireEvent.dragStart(el, { dataTransfer });
    fireEvent.dragEnter(el, { dataTransfer });
    fireEvent.dragEnter(el, { dataTransfer });
    fireEvent.dragOver(el, { dataTransfer });
    fireEvent.drop(el, { dataTransfer });
    fireEvent.dragEnd(el, { dataTransfer });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("prevents drop at position 0 (hero)", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const items = document.querySelectorAll(".section-order-item");
    const fromEl = items[2];
    const toEl = items[0];

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

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not move up first non-hero item (index <= 1)", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const detailsUp = screen.getByRole("button", { name: "sectionOrder.moveUp details.sectionLabel" });
    expect(detailsUp).toBeDisabled();
    fireEvent.click(detailsUp);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not move down last item", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const items = document.querySelectorAll(".section-order-item");
    const lastItemLabel = items[items.length - 1].querySelector(".section-order-item__label")?.textContent;
    const lastDownBtn = screen.getByRole("button", { name: `sectionOrder.moveDown accommodation.sectionLabel` });
    expect(lastDownBtn).toBeDisabled();
    fireEvent.click(lastDownBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("triggers moveUp early return when index <= 1 via dispatchEvent", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const detailsUp = screen.getByRole("button", { name: "sectionOrder.moveUp details.sectionLabel" });
    detailsUp.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("triggers moveDown early return when index is last", () => {
    const onChange = vi.fn();
    render(<SectionOrderEditor {...defaultProps} onChange={onChange} />);

    const lastDownBtn = screen.getByRole("button", { name: "sectionOrder.moveDown accommodation.sectionLabel" });
    lastDownBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
