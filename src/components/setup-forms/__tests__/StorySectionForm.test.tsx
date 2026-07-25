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

import StorySectionForm from "../StorySectionForm";

describe("StorySectionForm", () => {
  it("renders without crashing", () => {
    render(<StorySectionForm />);
    expect(screen.getByText("setup.storyLabel")).toBeDefined();
  });

  it("renders story textarea", () => {
    render(<StorySectionForm />);
    expect(screen.getByPlaceholderText("setup.storyPlaceholder")).toBeDefined();
  });

  it("renders help text", () => {
    render(<StorySectionForm />);
    expect(screen.getByText("setup.storyHint")).toBeDefined();
  });

  it("renders with prefix", () => {
    render(<StorySectionForm prefix="admin" />);
    expect(screen.getByText("setup.storyLabel")).toBeDefined();
  });
});
