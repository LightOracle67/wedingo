import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/test" }),
}));

import { UIProvider } from "../UIContext";
import { UIContext } from "../useAppUI";
import { useContext, useEffect } from "react";

describe("UIProvider", () => {
  it("renders children", () => {
    render(<UIProvider><div>child</div></UIProvider>);
    expect(screen.getByText("child")).toBeDefined();
  });

  it("renders LegalModal when legalModal is set", () => {
    function Setter() {
      const ctx = useContext(UIContext);
      useEffect(() => { ctx.setLegalModal("privacy"); }, []);
      return null;
    }
    render(
      <UIProvider>
        <Setter />
      </UIProvider>
    );
    expect(screen.getByRole("dialog")).toBeDefined();
  });
});
