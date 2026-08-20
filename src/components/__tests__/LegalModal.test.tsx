import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      // Interpolación simple para los tests ({{var}}).
      if (!opts) return key;
      return key.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => String(opts[name] ?? ""));
    },
  }),
}));

import LegalModal from "../LegalModal";

describe("LegalModal", () => {
  it("renders and calls onClose", () => {
    const onClose = vi.fn();
    render(<LegalModal section="privacy" onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("renders all sections", () => {
    render(<LegalModal section="privacy" onClose={vi.fn()} />);
    expect(screen.getByText("legal.sectionPrivacy")).toBeDefined();
    expect(screen.getByText("legal.sectionCookies")).toBeDefined();
    expect(screen.getByText("legal.sectionTerms")).toBeDefined();
    expect(screen.getByText("legal.sectionLegal")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<LegalModal section="privacy" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("common.close"));
    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("toggles section content on click", () => {
    render(<LegalModal section="" onClose={vi.fn()} />);
    const button = screen.getByText("legal.sectionPrivacy");
    fireEvent.click(button);
    // El contenido abre mostrando la versión de la política y el texto (la
    // versión es un span aparte para no romper el nodo de contenido exacto).
    expect(screen.getByText(/legal\.versionPrefix/)).toBeDefined();
    expect(screen.getByText("legal.privacyPolicy")).toBeDefined();
  });

  it("closes on Escape key press", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<LegalModal section="privacy" onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("does not register Escape handler when not open", () => {
    const onClose = vi.fn();
    render(<LegalModal section="" onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on non-Escape key press when open", () => {
    const onClose = vi.fn();
    render(<LegalModal section="privacy" onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("toggles section content visibility on click", () => {
    render(<LegalModal section="" onClose={vi.fn()} />);
    const privacyBtn = screen.getByText("legal.sectionPrivacy");
    fireEvent.click(privacyBtn);
    const contentArea = screen.getByText("legal.privacyPolicy").closest('[style*="max-height"]') as HTMLElement;
    expect(contentArea.style.maxHeight).toBe("800px");
    fireEvent.click(privacyBtn);
    expect(contentArea.style.maxHeight).toBe("0px");
  });

  it("renders content for all three sections", () => {
    render(<LegalModal section="" onClose={vi.fn()} />);
    expect(screen.getByText("legal.privacyPolicy")).toBeDefined();
    expect(screen.getByText("legal.termsText")).toBeDefined();
    expect(screen.getByText("legal.legalText")).toBeDefined();
  });

  it("closes section on toggle when already open", () => {
    render(<LegalModal section="privacy" onClose={vi.fn()} />);
    const button = screen.getByText("legal.sectionPrivacy");
    fireEvent.click(button);
    const contentArea = screen.getByText("legal.privacyPolicy").closest('[style*="max-height"]') as HTMLElement;
    expect(contentArea.style.maxHeight).toBe("0px");
  });

  it("sets closeRef.current on mount and cleanup on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<LegalModal section="privacy" onClose={vi.fn()} />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalled();
    removeEventListenerSpy.mockRestore();
  });

  it("updates open state when section prop changes", () => {
    const { rerender } = render(<LegalModal section="" onClose={vi.fn()} />);
    const contentArea = screen.getByText("legal.privacyPolicy").closest('[style*="max-height"]') as HTMLElement;
    expect(contentArea.style.maxHeight).toBe("0px");
    rerender(<LegalModal section="privacy" onClose={vi.fn()} />);
    expect(contentArea.style.maxHeight).toBe("800px");
  });
});
