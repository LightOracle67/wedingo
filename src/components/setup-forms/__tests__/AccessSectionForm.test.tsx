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

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn(), startUploadToast: vi.fn() }),
}));

vi.mock("../../../contexts", () => ({
  useConfigActions: () => ({
    updateFormField: typeof mockUpdateFormField !== "undefined" ? mockUpdateFormField : vi.fn(),
    handleDayChange: vi.fn(),
    handleTimeChange: vi.fn(),
    handleTimeBlur: vi.fn(),
    handleYearChange: vi.fn(),
    maxAllowedYear: 2099,
    inviteToken: "",
    hasStoredConfig: false,
  }),
  useFormField: (field: string) => (mockAppState.formData as Record<string, string | undefined>)?.[field] ?? "",
  useFormStore: () => ({
    getField: (field: string) => (mockAppState.formData as Record<string, string | undefined>)?.[field] ?? "",
  }),
  useConfig: () => mockAppState,
  useAuth: () => mockAppState,
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

  it("copies the setup token and shows a toast", async () => {
    mockAppState.setupToken = "SECRET-TOKEN";
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<AccessSectionForm />);
    fireEvent.click(screen.getByRole("button", { name: "setup.copyToken" }));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("SECRET-TOKEN");
    });
    mockAppState.setupToken = "";
  });
});
