import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUpdateFormField = vi.fn();
const mockFormData = vi.hoisted(() => ({}) as Record<string, string | undefined>);

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: mockFormData,
    updateFormField: mockUpdateFormField,
  }),
}));

import GuestsSectionForm from "../GuestsSectionForm";

function getAllCheckboxes() {
  return screen.getAllByRole("checkbox");
}

describe("GuestsSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockFormData).forEach((key) => delete mockFormData[key]);
  });

  it("renders without crashing", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.kidsLabel")).toBeDefined();
  });

  it("renders kids policy options", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("kidsPolicy.options.playArea")).toBeDefined();
    expect(screen.getByText("kidsPolicy.options.supervised")).toBeDefined();
    expect(screen.getByText("kidsPolicy.options.adultOnly")).toBeDefined();
  });

  it("renders dress code section", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.dressCodeLabel")).toBeDefined();
    expect(screen.getByText("setup.dressCodeGala")).toBeDefined();
  });

  it("renders menu section", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.menuCelebrationLabel")).toBeDefined();
    expect(screen.getByText("setup.menuEnabledLabel")).toBeDefined();
  });

  it("renders accommodation URL field", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.accommodationLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.accommodationUrlPlaceholder")).toBeDefined();
  });

  it("renders accommodation URL hint", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.accommodationUrlHint")).toBeDefined();
  });

  it("calls updateFormField on kids policy checkbox click (select)", () => {
    render(<GuestsSectionForm />);
    const checkboxes = getAllCheckboxes();
    fireEvent.click(checkboxes[0]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("kidsPolicy", "playArea");
  });

  it("calls updateFormField on kids policy checkbox click (deselect)", () => {
    mockFormData.kidsPolicy = "playArea";
    render(<GuestsSectionForm />);
    const checkboxes = getAllCheckboxes();
    fireEvent.click(checkboxes[0]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("kidsPolicy", "");
  });

  it("calls updateFormField on dress code selection", () => {
    render(<GuestsSectionForm />);
    const checkboxes = getAllCheckboxes();
    fireEvent.click(checkboxes[3]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingDressCode", "Traje de gala");
  });

  it("calls updateFormField on dress code deselection", () => {
    mockFormData.weddingDressCode = "Traje de gala";
    render(<GuestsSectionForm />);
    const checkboxes = getAllCheckboxes();
    fireEvent.click(checkboxes[3]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("weddingDressCode", "");
  });

  it("calls updateFormField on menu enabled toggle", () => {
    render(<GuestsSectionForm />);
    const checkboxes = getAllCheckboxes();
    fireEvent.click(checkboxes[8]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuEnabled", "true");
  });

  it("calls updateFormField to disable menu", () => {
    mockFormData.menuEnabled = "true";
    render(<GuestsSectionForm />);
    const checkboxes = getAllCheckboxes();
    fireEvent.click(checkboxes[8]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuEnabled", "false");
  });

  it("renders menu dish editors when menu is enabled", () => {
    mockFormData.menuEnabled = "true";
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.menuHint")).toBeDefined();
    expect(screen.getByText("setup.menuCarneLabel")).toBeDefined();
    expect(screen.getByText("setup.menuPescadoLabel")).toBeDefined();
    expect(screen.getByText("setup.menuVeganoLabel")).toBeDefined();
    expect(screen.getByText("setup.menuRequiredText")).toBeDefined();
    expect(screen.getAllByRole("button", { name: /setup.menuAddDish/ }).length).toBeGreaterThanOrEqual(3);
  });

  it("adds a dish to the fixed menu editor", () => {
    render(<GuestsSectionForm />);
    fireEvent.click(screen.getByRole("button", { name: /setup.menuAddDish/ }));
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuTextoDishes", JSON.stringify([{ order: "entrante", text: "" }]));
  });

  it("edits the dish text in the fixed menu editor", () => {
    mockFormData.menuTextoDishes = JSON.stringify([{ order: "primero", text: "" }]);
    render(<GuestsSectionForm />);
    const input = screen.getByPlaceholderText("setup.menuDishPlaceholder");
    fireEvent.change(input, { target: { value: "Lubina al horno" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuTextoDishes", JSON.stringify([{ order: "primero", text: "Lubina al horno" }]));
  });

  it("removes a dish from the fixed menu editor", () => {
    mockFormData.menuTextoDishes = JSON.stringify([
      { order: "entrante", text: "Ensalada" },
      { order: "postre", text: "Tarta" },
    ]);
    render(<GuestsSectionForm />);
    const removeButtons = screen.getAllByLabelText("setup.menuRemoveDish");
    fireEvent.click(removeButtons[0]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuTextoDishes", JSON.stringify([{ order: "postre", text: "Tarta" }]));
  });

  it("changes the dish order in the fixed menu editor", () => {
    mockFormData.menuTextoDishes = JSON.stringify([{ order: "entrante", text: "Ensalada" }]);
    render(<GuestsSectionForm />);
    const select = screen.getByLabelText("setup.menuOrderLabel") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "postre" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuTextoDishes", JSON.stringify([{ order: "postre", text: "Ensalada" }]));
  });

  it("edits a dish of a selectable menu option", () => {
    mockFormData.menuEnabled = "true";
    mockFormData.menuCarneDishes = JSON.stringify([{ order: "primero", text: "" }]);
    render(<GuestsSectionForm />);
    const inputs = screen.getAllByPlaceholderText("setup.menuDishPlaceholder");
    fireEvent.change(inputs[0]!, { target: { value: "Solomillo" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuCarneDishes", JSON.stringify([{ order: "primero", text: "Solomillo" }]));
  });

  it("calls updateFormField on accommodation URL change", () => {
    render(<GuestsSectionForm />);
    const input = screen.getByPlaceholderText("setup.accommodationUrlPlaceholder");
    fireEvent.change(input, { target: { value: "https://www.google.com/maps/place/Hotel+Sol/@40.41,-3.70,17z" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("accommodationURL", "https://www.google.com/maps/place/Hotel+Sol/@40.41,-3.70,17z");
  });

  it("marks an invalid accommodation URL as error", () => {
    mockFormData.accommodationURL = "https://maps.app.goo.gl/abc";
    render(<GuestsSectionForm />);
    const input = screen.getByPlaceholderText("setup.accommodationUrlPlaceholder");
    expect(input.className).toContain("setup-input--error");
    expect(screen.getByText(/setup.mapUrlInvalid/)).toBeDefined();
  });

  it("shows the accommodation site name for a valid place URL", () => {
    mockFormData.accommodationURL = "https://www.google.com/maps/place/Hotel+Sol/@40.41,-3.70,17z";
    render(<GuestsSectionForm />);
    expect(screen.getByText(/setup.siteNameLabel/)).toBeDefined();
    expect(screen.getByText((text: string) => text.includes("Hotel Sol"))).toBeDefined();
  });
});
