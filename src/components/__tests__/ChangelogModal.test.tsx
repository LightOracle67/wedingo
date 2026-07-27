import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../lib/changelog", () => ({
  CHANGELOG: [
    { version: "2.0.0", date: "2026-01-01", changes: ["First change"] },
    { version: "1.0.0", date: "2025-06-01", changes: ["Initial release"] },
  ],
}));

import ChangelogModal from "../ChangelogModal";

describe("ChangelogModal", () => {
  afterEach(cleanup);

  it("renders version dates", () => {
    render(<ChangelogModal onClose={vi.fn()} />);
    expect(screen.getByText("2026-01-01")).toBeDefined();
    expect(screen.getByText("2025-06-01")).toBeDefined();
  });

  it("renders change descriptions", () => {
    render(<ChangelogModal onClose={vi.fn()} />);
    expect(screen.getByText("First change")).toBeDefined();
    expect(screen.getByText("Initial release")).toBeDefined();
  });

  it("renders as dialog", () => {
    render(<ChangelogModal onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("adds closing class and calls onClose after delay", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<ChangelogModal onClose={onClose} />);

    const closeBtn = screen.getByLabelText("changelog.close");
    fireEvent.click(closeBtn);

    const overlay = screen.getByRole("dialog");
    expect(overlay.className).toContain("modal-overlay--closing");

    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
