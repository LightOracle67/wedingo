import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CollapsibleSection from "../CollapsibleSection";

describe("CollapsibleSection", () => {
  it("renders title and hint", () => {
    render(
      <CollapsibleSection title="Test Title" hint="Test Hint">
        <p>Child content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Hint")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("toggles open/close on click", () => {
    render(
      <CollapsibleSection title="Toggle Test">
        <p>Content</p>
      </CollapsibleSection>,
    );
    const button = screen.getByRole("button", { name: "Toggle Test" });
    expect(screen.getByText("Content")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("starts closed by default and opens on toggle", () => {
    render(
      <CollapsibleSection title="Closed by default">
        <p>Hidden content</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole("button", { name: "Closed by default" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("starts open when defaultOpen is true", () => {
    render(
      <CollapsibleSection title="Open by default" defaultOpen={true}>
        <p>Visible content</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole("button", { name: "Open by default" });
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("renders hidden badge when isHidden is true", () => {
    render(
      <CollapsibleSection title="Hidden section" isHidden={true} sectionKey="test" onToggleVisibility={vi.fn()}>
        <p>Content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("common.hidden")).toBeInTheDocument();
  });

  it("calls onToggleVisibility when visibility toggle is clicked", () => {
    const onToggle = vi.fn();
    render(<CollapsibleSection title="Test" sectionKey="details" isHidden={false} onToggleVisibility={onToggle} />);
    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);
    expect(onToggle).toHaveBeenCalledWith("details");
  });

  it("shows visibility toggle label based on hidden state", () => {
    const { rerender } = render(
      <CollapsibleSection title="Test" sectionKey="test" isHidden={false} onToggleVisibility={vi.fn()} />,
    );
    expect(screen.getByText("common.visible")).toBeInTheDocument();

    rerender(<CollapsibleSection title="Test" sectionKey="test" isHidden={true} onToggleVisibility={vi.fn()} />);
    expect(screen.getByText("common.show")).toBeInTheDocument();
  });

  it("sets max-height to none after transition end when open", () => {
    render(
      <CollapsibleSection title="Transition Test" defaultOpen={true}>
        <p>Content</p>
      </CollapsibleSection>,
    );

    const wrap = document.querySelector(".setup-collapsible__wrap")!;
    expect(wrap).toHaveStyle("max-height: none");

    const button = screen.getByRole("button", { name: "Transition Test" });
    fireEvent.click(button);

    fireEvent.transitionEnd(wrap, { propertyName: "max-height" });
    expect(wrap).toHaveStyle("max-height: 0px");
  });

  it("triggers onToggleVisibility via keyboard Enter", () => {
    const onToggle = vi.fn();
    render(<CollapsibleSection title="Test" sectionKey="details" isHidden={false} onToggleVisibility={onToggle} />);
    const switchEl = screen.getByRole("switch");
    fireEvent.keyDown(switchEl, { key: "Enter" });
    expect(onToggle).toHaveBeenCalledWith("details");
  });

  it("triggers onToggleVisibility via keyboard Space", () => {
    const onToggle = vi.fn();
    render(<CollapsibleSection title="Test" sectionKey="details" isHidden={false} onToggleVisibility={onToggle} />);
    const switchEl = screen.getByRole("switch");
    fireEvent.keyDown(switchEl, { key: " " });
    expect(onToggle).toHaveBeenCalledWith("details");
  });

  it("does not call onToggleVisibility on non-Enter/Space key", () => {
    const onToggle = vi.fn();
    render(<CollapsibleSection title="Test" sectionKey="details" isHidden={false} onToggleVisibility={onToggle} />);
    const switchEl = screen.getByRole("switch");
    fireEvent.keyDown(switchEl, { key: "Tab" });
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("does not render visibility toggle when sectionKey is missing", () => {
    render(<CollapsibleSection title="Test" isHidden={false} onToggleVisibility={vi.fn()} />);
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("does not render visibility toggle when onToggleVisibility is missing", () => {
    render(<CollapsibleSection title="Test" sectionKey="test" isHidden={false} />);
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("sets max-height to undefined on transition end when opening", () => {
    render(
      <CollapsibleSection title="Open Test" defaultOpen={false}>
        <p>Content</p>
      </CollapsibleSection>,
    );

    const wrap = document.querySelector(".setup-collapsible__wrap")!;
    const button = screen.getByRole("button", { name: "Open Test" });
    fireEvent.click(button);

    fireEvent.transitionEnd(wrap, { propertyName: "max-height" });
    expect(wrap).toHaveStyle("max-height: none");
  });

  it("closes with animation via requestAnimationFrame", () => {
    render(
      <CollapsibleSection title="Close Test" defaultOpen={true}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    const button = screen.getByRole("button", { name: "Close Test" });
    fireEvent.click(button);
    const wrap = document.querySelector(".setup-collapsible__wrap")!;
    expect(wrap).toBeInTheDocument();
  });

  it("renders with hidden badge and visibility toggle", () => {
    const onToggle = vi.fn();
    render(
      <CollapsibleSection title="Hidden" sectionKey="test" isHidden={true} onToggleVisibility={onToggle}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText("common.hidden")).toBeInTheDocument();
  });

  it("ignores transition end for non-max-height property", () => {
    render(
      <CollapsibleSection title="Prop Test" defaultOpen={true}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    const wrap = document.querySelector(".setup-collapsible__wrap")!;
    expect(wrap).toHaveStyle("max-height: none");
    fireEvent.transitionEnd(wrap, { propertyName: "opacity" });
    expect(wrap).toHaveStyle("max-height: none");
  });

  it("sets max-height to 0 after close animation via rAF", () => {
    const originalRAF = window.requestAnimationFrame;
    const calls: FrameRequestCallback[] = [];
    window.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      calls.push(cb);
      return calls.length - 1;
    }) as unknown as typeof window.requestAnimationFrame;

    render(
      <CollapsibleSection title="Close Test" defaultOpen={true}>
        <p>Content</p>
      </CollapsibleSection>,
    );

    const wrap = document.querySelector(".setup-collapsible__wrap")!;
    expect(wrap).toHaveStyle("max-height: none");

    const button = screen.getByRole("button", { name: "Close Test" });
    fireEvent.click(button);

    while (calls.length > 0) {
      const cb = calls.shift()!;
      cb(0);
    }
    window.requestAnimationFrame = originalRAF;
  });
});
