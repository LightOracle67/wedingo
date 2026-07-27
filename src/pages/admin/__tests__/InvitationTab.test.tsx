import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn(), startUploadToast: vi.fn() }),
}));

vi.mock("../../../components/SetupForm", () => ({
  default: ({ prefix }: { prefix: string }) => <div data-testid="setup-form">{prefix}</div>,
}));

import InvitationTab from "../InvitationTab";

describe("InvitationTab", () => {
  it("renders SetupForm inside the invitation editor", () => {
    render(<InvitationTab />);
    const form = screen.getByTestId("setup-form");
    expect(form).toBeDefined();
    expect(form.textContent).toBe("admin");
  });
});
