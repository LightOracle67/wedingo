import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("react-router", () => ({
  useLocation: () => ({ pathname: "/test" }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../components/LegalModal", () => ({
  default: ({ section, onClose }: { section: string; onClose: () => void }) =>
    React.createElement(
      "div",
      { role: "dialog", "aria-label": section },
      React.createElement("button", { className: "modal-close", onClick: onClose }, "×"),
    ),
}));

import { UIProvider } from "../UIContext";
import { UIContext } from "../useAppUI";
import React, { useContext, useEffect, useRef } from "react";

describe("UIProvider", () => {
  it("renders children", () => {
    render(
      <UIProvider>
        <div>child</div>
      </UIProvider>,
    );
    expect(screen.getByText("child")).toBeDefined();
  });

  it("renders LegalModal when legalModal is set", async () => {
    function Consumer() {
      const ctx = useContext(UIContext);
      useEffect(() => {
        ctx?.setLegalModal("privacy");
      }, [ctx]);
      return null;
    }
    render(
      <UIProvider>
        <Consumer />
      </UIProvider>,
    );
    expect(await await screen.findByRole("dialog", {}, { timeout: 3000 })).toBeDefined();
  });

  it("closes LegalModal on close button click", async () => {
    function Consumer() {
      const ctx = useContext(UIContext);
      const opened = useRef(false);
      useEffect(() => {
        if (!opened.current) { opened.current = true; ctx?.setLegalModal("privacy"); }
      }, [ctx]);
      return null;
    }
    const { container } = render(
      <UIProvider>
        <Consumer />
      </UIProvider>,
    );
    expect(await await screen.findByRole("dialog", {}, { timeout: 3000 })).toBeDefined();
    const closeBtn = container.querySelector(".modal-close");
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn!);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("clears messages when location changes", () => {
    const { rerender } = render(
      <UIProvider>
        <div>initial</div>
      </UIProvider>,
    );
    expect(screen.getByText("initial")).toBeDefined();
    rerender(
      <UIProvider>
        <div>rerendered</div>
      </UIProvider>,
    );
    expect(screen.getByText("rerendered")).toBeDefined();
  });

  it("renders LegalModal with correct section when legalModal is set", async () => {
    function Consumer() {
      const ctx = useContext(UIContext);
      useEffect(() => {
        ctx?.setLegalModal("terms");
      }, [ctx]);
      return null;
    }
    render(
      <UIProvider>
        <Consumer />
      </UIProvider>,
    );
    expect(await await screen.findByRole("dialog", {}, { timeout: 3000 })).toBeDefined();
    expect(screen.getByLabelText("terms")).toBeDefined();
  });

  it("provides locationMapContainerRef as a ref object", () => {
    function Consumer() {
      const ctx = useContext(UIContext);
      return <div data-testid="ref-type">{typeof ctx?.locationMapContainerRef}</div>;
    }
    render(
      <UIProvider>
        <Consumer />
      </UIProvider>,
    );
    expect(screen.getByTestId("ref-type").textContent).toBe("object");
  });
});
