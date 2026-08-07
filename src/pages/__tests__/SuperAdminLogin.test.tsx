import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

const mockAddToast = vi.fn();
vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const mockUseSuperAdmin = vi.fn();
vi.mock("../../contexts/SuperAdminContext", () => ({
  useSuperAdmin: (...args: unknown[]) => mockUseSuperAdmin(...args),
}));

import SuperAdminLogin from "../SuperAdminLogin";

const baseMock = {
  login: vi.fn(),
  isSuperAdmin: false,
  isLoading: false,
  error: null,
};

describe("SuperAdminLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSuperAdmin.mockReturnValue(baseMock);
  });

  it("renders login form", () => {
    render(<SuperAdminLogin />);
    expect(screen.getByText("superadmin.controlPanel")).toBeDefined();
  });

  it("renders submit button", () => {
    render(<SuperAdminLogin />);
    expect(screen.getByRole("button")).toBeDefined();
  });

  it("renders loading state", () => {
    mockUseSuperAdmin.mockReturnValue({ ...baseMock, isLoading: true });

    render(<SuperAdminLogin />);
    expect(screen.getByText("common.loading")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("redirects when already superadmin", () => {
    mockUseSuperAdmin.mockReturnValue({ ...baseMock, isSuperAdmin: true });

    const { container } = render(
      <MemoryRouter>
        <SuperAdminLogin />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows error toast when error is set", () => {
    mockUseSuperAdmin.mockReturnValue({ ...baseMock, error: "Invalid credentials" });

    render(<SuperAdminLogin />);
    expect(mockAddToast).toHaveBeenCalledWith("error", "Invalid credentials");
  });

  it("calls login on form submit", async () => {
    const mockLogin = vi.fn();
    mockUseSuperAdmin.mockReturnValue({ ...baseMock, login: mockLogin });

    render(<SuperAdminLogin />);
    const emailInput = screen.getByLabelText("superadmin.emailLabel");
    const passwordInput = screen.getByLabelText("superadmin.passwordLabel");
    const submitBtn = screen.getByRole("button");

    fireEvent.change(emailInput, { target: { value: "admin@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "secret" } });
    fireEvent.click(submitBtn);

    expect(mockLogin).toHaveBeenCalledWith("admin@test.com", "secret");
  });

  it("disables submit button during submission", async () => {
    const mockLogin = vi.fn().mockImplementation(() => new Promise(() => {}));
    mockUseSuperAdmin.mockReturnValue({ ...baseMock, login: mockLogin });

    render(<SuperAdminLogin />);
    const emailInput = screen.getByLabelText("superadmin.emailLabel");
    const passwordInput = screen.getByLabelText("superadmin.passwordLabel");
    const submitBtn = screen.getByRole("button");

    fireEvent.change(emailInput, { target: { value: "admin@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "secret" } });
    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
  });

  it("prevents double submission", async () => {
    const mockLogin = vi.fn().mockImplementation(() => new Promise(() => {}));
    mockUseSuperAdmin.mockReturnValue({ ...baseMock, login: mockLogin });

    render(<SuperAdminLogin />);
    const emailInput = screen.getByLabelText("superadmin.emailLabel");
    const passwordInput = screen.getByLabelText("superadmin.passwordLabel");
    const submitBtn = screen.getByRole("button");

    fireEvent.change(emailInput, { target: { value: "admin@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "secret" } });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it("guards against double submission via direct form submit", () => {
    const mockLogin = vi.fn().mockImplementation(() => new Promise(() => {}));
    mockUseSuperAdmin.mockReturnValue({ ...baseMock, login: mockLogin });

    render(<SuperAdminLogin />);
    const emailInput = screen.getByLabelText("superadmin.emailLabel");
    const passwordInput = screen.getByLabelText("superadmin.passwordLabel");

    fireEvent.change(emailInput, { target: { value: "admin@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "secret" } });

    const form = screen.getByRole("button").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});
