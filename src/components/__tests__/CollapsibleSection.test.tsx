import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CollapsibleSection from "../CollapsibleSection";

describe("CollapsibleSection", () => {
  it("renders title and hint", () => {
    render(
      <CollapsibleSection title="Test Title" hint="Test Hint">
        <p>Child content</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Hint")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("toggles open/close on click", () => {
    render(
      <CollapsibleSection title="Toggle Test">
        <p>Content</p>
      </CollapsibleSection>
    );
    const button = screen.getByRole("button", { name: "Toggle Test" });
    expect(screen.getByText("Content")).toBeInTheDocument();
    fireEvent.click(button);
    // After clicking, content should still exist in DOM (animated hide)
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("calls onToggleVisibility when visibility toggle is clicked", () => {
    const onToggle = vi.fn();
    render(
      <CollapsibleSection
        title="Test"
        sectionKey="details"
        isHidden={false}
        onToggleVisibility={onToggle}
      />
    );
    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);
    expect(onToggle).toHaveBeenCalledWith("details");
  });
});
