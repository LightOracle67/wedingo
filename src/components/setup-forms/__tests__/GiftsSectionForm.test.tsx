import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUpdateFormField = vi.fn();
const mockFormData = vi.hoisted(
  () => ({ giftsInfo: "", bankInfo: "", giftsInfoEnabled: "true", bankInfoEnabled: "true" }) as Record<string, string>,
);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../contexts", () => ({
  useConfig: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: mockFormData,
    updateFormField: mockUpdateFormField,
  }),
}));

import GiftsSectionForm from "../GiftsSectionForm";

describe("GiftsSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData.bankInfo = "";
  });

  it("renders without crashing", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.giftsInfoLabel")).toBeDefined();
  });

  it("renders gifts info hint", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.giftsInfoHint")).toBeDefined();
  });

  it("renders bank info field", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.bankInfoLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.bankInfoPlaceholder")).toBeDefined();
  });

  it("renders bank info hint", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.bankInfoHint")).toBeDefined();
  });

  it("calls updateFormField on gifts info change", () => {
    render(<GiftsSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.giftsInfoPlaceholder");
    fireEvent.change(textarea, { target: { value: "Gift info here" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("giftsInfo", "Gift info here");
  });

  it("calls updateFormField on bank info change", () => {
    render(<GiftsSectionForm />);
    const input = screen.getByPlaceholderText("setup.bankInfoPlaceholder");
    fireEvent.change(input, { target: { value: "ES1234" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("bankInfo", "ES1234");
  });

  it("renders with prefix", () => {
    render(<GiftsSectionForm prefix="admin" />);
    expect(screen.getByText("setup.giftsInfoLabel")).toBeDefined();
  });

  it("marks a malformed IBAN as an error", () => {
    mockFormData.bankInfo = "ES00 1234 INVALID";
    render(<GiftsSectionForm />);
    const input = screen.getByPlaceholderText("setup.bankInfoPlaceholder");
    expect(input.className).toContain("setup-input--error");
  });

  it("does not flag non-IBAN bank info", () => {
    mockFormData.bankInfo = "Transferencia al contado";
    render(<GiftsSectionForm />);
    const input = screen.getByPlaceholderText("setup.bankInfoPlaceholder");
    expect(input.className).not.toContain("setup-input--error");
  });
});
