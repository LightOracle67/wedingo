import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: {},
    updateFormField: vi.fn(),
  }),
}));

import GiftsSectionForm from "../GiftsSectionForm";

describe("GiftsSectionForm", () => {
  it("renders without crashing", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.giftsInfoLabel")).toBeDefined();
  });

  it("renders bank info field", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.bankInfoLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.bankInfoPlaceholder")).toBeDefined();
  });

  it("renders accommodation field", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.accommodationLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.accommodationPlaceholder")).toBeDefined();
  });

  it("renders transport field", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.transportLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.transportPlaceholder")).toBeDefined();
  });

  it("renders with prefix", () => {
    render(<GiftsSectionForm prefix="admin" />);
    expect(screen.getByText("setup.giftsInfoLabel")).toBeDefined();
  });
});
