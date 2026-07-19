import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Fireflies from "../Fireflies";

describe("Fireflies", () => {
  it("renders 20 fireflies", () => {
    const { container } = render(<Fireflies />);
    const fireflies = container.querySelectorAll(".firefly");
    expect(fireflies.length).toBe(20);
  });
});
