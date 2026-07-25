import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LoadingOverlay from "../LoadingOverlay";

describe("LoadingOverlay", () => {
  it("renders null when not visible", () => {
    const { container } = render(<LoadingOverlay />);
    expect(container.innerHTML).toBe("");
  });

  it("renders loading div when visible", () => {
    const { container } = render(<LoadingOverlay visible />);
    expect(container.querySelector(".page-loading")).toBeDefined();
  });
});
