import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUpdateFormField = vi.hoisted(() => vi.fn());
const mockAppState = vi.hoisted(() => ({
  config: { theme: "golden", menuEnabled: "true" },
  formData: {},
  updateFormField: mockUpdateFormField,
  setupToken: "",
  hasStoredConfig: false,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../contexts", () => ({
  useApp: () => mockAppState,
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
    const input = screen.getByLabelText("setup.usernameLabel");
    fireEvent.change(input, { target: { value: "UsEr!@#" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("adminUsername", "user");
  });

  it("shows the setup token and toggles visibility", () => {
    mockAppState.setupToken = "SECRET-TOKEN";
    render(<AccessSectionForm />);
    const input = screen.getByLabelText("setup.tokenFieldLabel") as HTMLInputElement;
    expect(input.value).toBe("SECRET-TOKEN");
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "setup.showToken" }));
    expect(input.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "setup.hideToken" }));
    expect(input.type).toBe("password");
    mockAppState.setupToken = "";
  });
});
