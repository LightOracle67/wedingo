import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es" } }),
}));

import EnvelopeOverlay from "../EnvelopeOverlay";

describe("EnvelopeOverlay", () => {
  afterEach(cleanup);

  const defaultProps = { onOpen: vi.fn(), firstName: "John", secondName: "Jane" };

  it("renders couple names", () => {
    render(<EnvelopeOverlay {...defaultProps} />);
    const names = screen.getAllByText(/John/);
    expect(names.length).toBeGreaterThan(0);
  });

  it("calls onOpen on second click", () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(<EnvelopeOverlay {...defaultProps} onOpen={onOpen} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.click(btn);
    vi.advanceTimersByTime(3500);
    expect(onOpen).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("dispatches custom event on Enter key", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    render(<EnvelopeOverlay {...defaultProps} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect(dispatchSpy.mock.calls[0][0].type).toBe("wedin:play-audio");
    dispatchSpy.mockRestore();
  });

  it("dispatches custom event on Space key", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    render(<EnvelopeOverlay {...defaultProps} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.keyDown(btn, { key: " " });
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    dispatchSpy.mockRestore();
  });

  it("prevents duplicate clicks while exiting", () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(<EnvelopeOverlay {...defaultProps} onOpen={onOpen} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    vi.advanceTimersByTime(3500);
    expect(onOpen).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("shows golden message with correct animation class", () => {
    vi.useFakeTimers();
    render(<EnvelopeOverlay {...defaultProps} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    vi.advanceTimersByTime(1400);
    expect(document.querySelector(".envelope-golden--in")).toBeDefined();
    fireEvent.click(btn);
    expect(document.querySelector(".envelope-golden--out")).toBeDefined();
    vi.useRealTimers();
  });

  it("shows correct hint text at each state", () => {
    vi.useFakeTimers();
    render(<EnvelopeOverlay {...defaultProps} />);
    const btn = screen.getByRole("button");
    expect(screen.getByText("envelope.tapHint")).toBeDefined();
    fireEvent.click(btn);
    expect(screen.queryByText("envelope.tapHint")).toBeNull();
    expect(screen.getByText("envelope.tapContinue")).toBeDefined();
    fireEvent.click(btn);
    expect(screen.queryByText("envelope.tapContinue")).toBeNull();
    vi.useRealTimers();
  });

  it("adds exit class and calls onOpen after delay", () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(<EnvelopeOverlay {...defaultProps} onOpen={onOpen} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(document.querySelector(".envelope-overlay--exit")).toBeDefined();
    vi.advanceTimersByTime(3500);
    expect(onOpen).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("focuses main-content element after exit", () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const mainEl = document.createElement("div");
    mainEl.id = "main-content";
    mainEl.tabIndex = -1;
    document.body.appendChild(mainEl);
    const focusSpy = vi.spyOn(mainEl, "focus");

    render(<EnvelopeOverlay {...defaultProps} onOpen={onOpen} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.click(btn);
    vi.advanceTimersByTime(3500);
    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(mainEl);
    vi.useRealTimers();
  });

  it("shows golden text with exit animation during exiting state", () => {
    vi.useFakeTimers();
    render(<EnvelopeOverlay {...defaultProps} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    vi.advanceTimersByTime(1400);
    vi.waitFor(() => {
      expect(document.querySelector(".envelope-golden--in")).toBeDefined();
    });
    fireEvent.click(btn);
    vi.waitFor(() => {
      expect(document.querySelector(".envelope-golden--out")).toBeDefined();
    });
    vi.useRealTimers();
  });

  it("does nothing on pressing non-Enter/Space key", () => {
    render(<EnvelopeOverlay {...defaultProps} />);
    const btn = screen.getByRole("button");
    fireEvent.keyDown(btn, { key: "Tab" });
    expect(document.querySelector(".envelope-overlay--exit")).toBeNull();
  });

  it("does not show golden text before first click", () => {
    render(<EnvelopeOverlay {...defaultProps} />);
    expect(document.querySelector(".envelope-golden")).toBeNull();
  });

  it("handles dispatchEvent throwing", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "dispatchEvent").mockImplementation(() => { throw new Error("dispatch failed"); });
    const onOpen = vi.fn();
    render(<EnvelopeOverlay {...defaultProps} onOpen={onOpen} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.click(btn);
    vi.advanceTimersByTime(3500);
    expect(onOpen).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
