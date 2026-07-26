import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/test" }),
}));

import { UIProvider } from "../UIContext";

describe("UIProvider", () => {
  it("renders children", () => {
    render(<UIProvider><div>child</div></UIProvider>);
    expect(screen.getByText("child")).toBeDefined();
  });
});
