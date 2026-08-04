import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CharacterCounter from "../CharacterCounter";

describe("CharacterCounter", () => {
  it("renders current and max values", () => {
    render(<CharacterCounter current={12} max={500} />);
    expect(screen.getByText("12/500")).toBeDefined();
  });

  it("marks the counter as aria-hidden", () => {
    render(<CharacterCounter current={0} max={2000} />);
    expect(screen.getByText("0/2000").getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the same count on the boundary", () => {
    render(<CharacterCounter current={500} max={500} />);
    expect(screen.getByText("500/500")).toBeDefined();
  });
});
