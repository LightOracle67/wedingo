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

import GuestsSectionForm from "../GuestsSectionForm";

describe("GuestsSectionForm", () => {
  it("renders without crashing", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.kidsLabel")).toBeDefined();
  });

  it("renders kids policy options", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("kidsPolicy.options.playArea")).toBeDefined();
    expect(screen.getByText("kidsPolicy.options.supervised")).toBeDefined();
    expect(screen.getByText("kidsPolicy.options.adultOnly")).toBeDefined();
  });

  it("renders dress code section", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.dressCodeLabel")).toBeDefined();
    expect(screen.getByText("setup.dressCodeGala")).toBeDefined();
  });

  it("renders menu section", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.menuCelebrationLabel")).toBeDefined();
    expect(screen.getByText("setup.menuEnabledLabel")).toBeDefined();
  });

  it("renders accommodation field", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.accommodationLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.accommodationPlaceholder")).toBeDefined();
  });

  it("renders accommodation hint", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.accommodationHint")).toBeDefined();
  });

  it("renders transport field", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.transportLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.transportPlaceholder")).toBeDefined();
  });

  it("renders transport hint", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.transportHint")).toBeDefined();
  });
});
