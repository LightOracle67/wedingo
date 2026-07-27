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
});
