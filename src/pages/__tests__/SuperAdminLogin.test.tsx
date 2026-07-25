import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("../../contexts/SuperAdminContext", () => ({
  useSuperAdmin: () => ({
    login: vi.fn(),
    isSuperAdmin: false,
    isLoading: false,
    error: null,
  }),
}));

import SuperAdminLogin from "../SuperAdminLogin";

describe("SuperAdminLogin", () => {
  it("renders login form", () => {
    render(<SuperAdminLogin />);
    expect(screen.getByText("superadmin.controlPanel")).toBeDefined();
  });

  it("renders submit button", () => {
    render(<SuperAdminLogin />);
    expect(screen.getByRole("button")).toBeDefined();
  });
});
