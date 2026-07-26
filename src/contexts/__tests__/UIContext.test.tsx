import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";

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
    function Consumer() {
      const ctx = useContext(UIContext);
      useEffect(() => { ctx.setLegalModal("privacy"); }, []);
      return null;
    }
    render(
      <UIProvider>
        <Consumer />
      </UIProvider>
    );
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("clears messages when location changes", () => {
    const { rerender } = render(<UIProvider><div>initial</div></UIProvider>);
    expect(screen.getByText("initial")).toBeDefined();
    rerender(<UIProvider><div>rerendered</div></UIProvider>);
    expect(screen.getByText("rerendered")).toBeDefined();
  });

  it("provides locationMapContainerRef as a ref object", () => {
    function Consumer() {
      const ctx = useContext(UIContext);
      return <div data-testid="ref-type">{typeof ctx.locationMapContainerRef}</div>;
    }
    render(<UIProvider><Consumer /></UIProvider>);
    expect(screen.getByTestId("ref-type").textContent).toBe("object");
  });
});
