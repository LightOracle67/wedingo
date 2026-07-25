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
});
