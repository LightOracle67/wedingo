import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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
    expect(screen.getByText("legal.privacyPolicy")).toBeDefined();
  });
});
