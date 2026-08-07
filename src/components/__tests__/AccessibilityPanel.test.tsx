import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import AccessibilityPanel from "../AccessibilityPanel";

afterEach(() => {
  cleanup();
  localStorageMock.clear();
  document.documentElement.className = "";
  document.documentElement.style.cssText = "";
});

beforeEach(() => {
  localStorageMock.clear();
  document.documentElement.className = "";
  document.documentElement.style.cssText = "";
});

describe("AccessibilityPanel", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<AccessibilityPanel open={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders modal when open", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByText("a11y.title")).toBeDefined();
  });

  function findCheckbox(label: string): HTMLInputElement {
    const labelEl = screen.getByText(label).closest(".a11y-toggle") as HTMLElement;
    return labelEl.querySelector("input[type=checkbox]") as HTMLInputElement;
  }

  it("toggles high contrast checkbox", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const checkbox = findCheckbox("a11y.highContrast");
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(document.documentElement.classList.contains("a11y-high-contrast")).toBe(true);
  });

  it("toggles reduced motion checkbox", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const checkbox = findCheckbox("a11y.reducedMotion");
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(document.documentElement.classList.contains("a11y-reduced-motion")).toBe(true);
  });

  it("toggles dyslexia font checkbox", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const checkbox = findCheckbox("a11y.dyslexiaFont");
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(document.documentElement.classList.contains("a11y-dyslexia-font")).toBe(true);
  });

  it("toggles more spacing checkbox", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const checkbox = findCheckbox("a11y.moreSpacing");
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(document.documentElement.classList.contains("a11y-more-spacing")).toBe(true);
  });

  it("toggles underline links checkbox", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const checkbox = findCheckbox("a11y.underlineLinks");
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(document.documentElement.classList.contains("a11y-underline-links")).toBe(true);
  });

  it("toggles big cursor checkbox", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const checkbox = findCheckbox("a11y.bigCursor");
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(document.documentElement.classList.contains("a11y-big-cursor")).toBe(true);
  });

  it("toggles desaturate checkbox", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const checkbox = findCheckbox("a11y.desaturate");
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(document.documentElement.classList.contains("a11y-desaturate")).toBe(true);
  });

  it("toggles strong focus checkbox", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const checkbox = findCheckbox("a11y.strongFocus");
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(document.documentElement.classList.contains("a11y-strong-focus")).toBe(true);
  });

  it("sets font size buttons", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const largeBtn = screen.getByText("a11y.fontLarge");
    fireEvent.click(largeBtn);
    expect(document.documentElement.style.getPropertyValue("--a11y-font-scale")).toBe("1.15");
    expect(document.documentElement.classList.contains("a11y-font-scale")).toBe(true);
  });

  it("highlights active font size button", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const normalBtn = screen.getByText("a11y.fontNormal");
    expect(normalBtn.classList.contains("a11y-btn--active")).toBe(true);
  });

  it("sets line spacing buttons", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const wideBtn = screen.getByText("a11y.lineWide");
    fireEvent.click(wideBtn);
    expect(document.documentElement.style.getPropertyValue("--a11y-line-spacing")).toBe("0.4");
    expect(document.documentElement.classList.contains("a11y-line-spacing")).toBe(true);
  });

  it("calls onClose when overlay is clicked", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<AccessibilityPanel open={true} onClose={onClose} />);
    const overlay = document.querySelector(".modal-overlay") as HTMLElement;
    fireEvent.click(overlay);
    act(() => { vi.advanceTimersByTime(250); });
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("calls onClose when close button is clicked", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<AccessibilityPanel open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("a11y.close"));
    act(() => { vi.advanceTimersByTime(250); });
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("persists preferences to localStorage", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const checkbox = findCheckbox("a11y.highContrast");
    fireEvent.click(checkbox);
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0]![1]);
    expect(saved.highContrast).toBe(true);
  });

  it("removes font scale when reset to normal", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const largeBtn = screen.getByText("a11y.fontLarge");
    fireEvent.click(largeBtn);
    expect(document.documentElement.classList.contains("a11y-font-scale")).toBe(true);
    const normalBtn = screen.getByText("a11y.fontNormal");
    fireEvent.click(normalBtn);
    expect(document.documentElement.classList.contains("a11y-font-scale")).toBe(false);
  });

  it("removes line spacing when reset to normal", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const wideBtn = screen.getByText("a11y.lineWide");
    fireEvent.click(wideBtn);
    expect(document.documentElement.classList.contains("a11y-line-spacing")).toBe(true);
    const normalBtn = screen.getByText("a11y.lineNormal");
    fireEvent.click(normalBtn);
    expect(document.documentElement.classList.contains("a11y-line-spacing")).toBe(false);
  });

  it("handles localStorage error gracefully", () => {
    const origGetItem = localStorageMock.getItem;
    localStorageMock.getItem = vi.fn(() => { throw new Error("storage error"); });
    expect(() => render(<AccessibilityPanel open={true} onClose={vi.fn()} />)).not.toThrow();
    localStorageMock.getItem = origGetItem;
  });

  it("handles corrupted JSON in localStorage", () => {
    localStorageMock.getItem = vi.fn(() => "{invalid json}");
    expect(() => render(<AccessibilityPanel open={true} onClose={vi.fn()} />)).not.toThrow();
  });

  it("handles JSON parse returning null", () => {
    localStorageMock.getItem = vi.fn(() => "null");
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByText("a11y.title")).toBeDefined();
  });

  it("handles empty localStorage string", () => {
    localStorageMock.getItem = vi.fn(() => "");
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByText("a11y.title")).toBeDefined();
  });
});
