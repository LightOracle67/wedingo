import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../contexts/AppContext", () => ({
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
});
