import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUpdateFormField = vi.fn();

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

import GiftsSectionForm from "../GiftsSectionForm";

describe("GiftsSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renders accommodation field", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.accommodationLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.accommodationPlaceholder")).toBeDefined();
  });

  it("renders accommodation hint", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.accommodationHint")).toBeDefined();
  });

  it("renders transport field", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.transportLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.transportPlaceholder")).toBeDefined();
  });

  it("renders transport hint", () => {
    render(<GiftsSectionForm />);
    expect(screen.getByText("setup.transportHint")).toBeDefined();
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

  it("calls updateFormField on accommodation change", () => {
    render(<GiftsSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.accommodationPlaceholder");
    fireEvent.change(textarea, { target: { value: "Hotel info" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("accommodationInfo", "Hotel info");
  });

  it("calls updateFormField on transport change", () => {
    render(<GiftsSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.transportPlaceholder");
    fireEvent.change(textarea, { target: { value: "Train info" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("transportInfo", "Train info");
  });

  it("renders with prefix", () => {
    render(<GiftsSectionForm prefix="admin" />);
    expect(screen.getByText("setup.giftsInfoLabel")).toBeDefined();
  });
});
