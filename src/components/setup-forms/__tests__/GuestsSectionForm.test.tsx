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

  it("renders menu items when menu is enabled", () => {
    mockFormData.menuEnabled = "true";
    render(<GuestsSectionForm />);
    expect(screen.getByText("setup.menuHint")).toBeDefined();
    expect(screen.getByText("setup.menuCarneLabel")).toBeDefined();
    expect(screen.getByText("setup.menuPescadoLabel")).toBeDefined();
    expect(screen.getByText("setup.menuVeganoLabel")).toBeDefined();
    expect(screen.getByText("setup.postreLabel")).toBeDefined();
    expect(screen.getByText("setup.menuRequiredText")).toBeDefined();
  });

  it("toggles menu item checkbox and shows textarea", () => {
    mockFormData.menuEnabled = "true";
    render(<GuestsSectionForm />);
    const menuCheckboxes = screen.getAllByRole("checkbox");
    const menuCarneCheckbox = menuCheckboxes[9];
    fireEvent.click(menuCarneCheckbox!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuCarne", " ");
  });

  it("shows menu item textarea when already checked and changes value", () => {
    mockFormData.menuEnabled = "true";
    mockFormData.menuCarne = "Existing meat option";
    render(<GuestsSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.menuCarnePlaceholder");
    fireEvent.change(textarea, { target: { value: "New meat option" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuCarne", "New meat option");
  });

  it("toggles menu item checkbox off when already checked", () => {
    mockFormData.menuEnabled = "true";
    mockFormData.menuCarne = "Existing meat option";
    render(<GuestsSectionForm />);
    const menuCheckboxes = screen.getAllByRole("checkbox");
    const menuCarneCheckbox = menuCheckboxes[9];
    fireEvent.click(menuCarneCheckbox!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuCarne", "");
  });

  it("calls updateFormField on postre textarea change", () => {
    mockFormData.menuEnabled = "true";
    render(<GuestsSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.postrePlaceholder");
    fireEvent.change(textarea, { target: { value: "Dessert option" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuPostre", "Dessert option");
  });

  it("limits postre to 2000 characters", () => {
    mockFormData.menuEnabled = "true";
    render(<GuestsSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.postrePlaceholder");
    const longText = "a".repeat(3000);
    fireEvent.change(textarea, { target: { value: longText } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuPostre", "a".repeat(2000));
  });

  it("renders free text menu mode when menu is disabled", () => {
    render(<GuestsSectionForm />);
    expect(screen.getByPlaceholderText("setup.menuTextoPlaceholder")).toBeDefined();
    expect(screen.getByText("setup.menuTextoHint")).toBeDefined();
  });

  it("calls updateFormField on menuTexto change", () => {
    render(<GuestsSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.menuTextoPlaceholder");
    fireEvent.change(textarea, { target: { value: "Free text menu" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuTexto", "Free text menu");
  });

  it("limits menuTexto to 2000 characters", () => {
    render(<GuestsSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.menuTextoPlaceholder");
    const longText = "a".repeat(3000);
    fireEvent.change(textarea, { target: { value: longText } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("menuTexto", "a".repeat(2000));
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

});
