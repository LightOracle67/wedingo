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

import AccessSectionForm from "../AccessSectionForm";

describe("AccessSectionForm", () => {
  it("renders without crashing", () => {
    render(<AccessSectionForm />);
    expect(screen.getByText("setup.usernameLabel")).toBeDefined();
  });

  it("renders the help text", () => {
    render(<AccessSectionForm prefix="admin" />);
    expect(screen.getByText("setup.usernameHint")).toBeDefined();
  });

  it("renders username input with placeholder", () => {
    render(<AccessSectionForm />);
    expect(screen.getByPlaceholderText("setup.usernamePlaceholder")).toBeDefined();
  });
});
