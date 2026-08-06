import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CharacterCounter from "../CharacterCounter";

describe("CharacterCounter", () => {
  it("renders current and max values", () => {
    render(<CharacterCounter value="Hola" max={500} />);
    expect(screen.getByText("4/500")).toBeDefined();
  });

  it("is announced to screen readers", () => {
    render(<CharacterCounter value="" max={2000} />);
    expect(screen.getByText("0/2000").getAttribute("aria-live")).toBe("polite");
  });

  it("counts code points (emojis count as one)", () => {
    render(<CharacterCounter value="😀😀😀" max={500} />);
    expect(screen.getByText("3/500")).toBeDefined();
  });

  it("renders the same count on the boundary", () => {
    const value = "x".repeat(500);
    render(<CharacterCounter value={value} max={500} />);
    expect(screen.getByText("500/500")).toBeDefined();
  });

  it("handles an empty value", () => {
    render(<CharacterCounter value="" max={10} />);
    expect(screen.getByText("0/10")).toBeDefined();
  });
});
