import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUpdateFormField = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: {},
    updateFormField: mockUpdateFormField,
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

  it("sanitizes username input on change", () => {
    render(<AccessSectionForm />);
    const input = screen.getByPlaceholderText("setup.usernamePlaceholder");
    fireEvent.change(input, { target: { value: "Test!@#" } });
    expect(mockUpdateFormField).toHaveBeenCalled();
  });
});
