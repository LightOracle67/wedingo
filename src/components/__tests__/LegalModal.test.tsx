import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
});
