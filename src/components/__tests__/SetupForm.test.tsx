import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

const mockHandleSaveSetup = vi.fn();
const mockUpdateFormField = vi.fn();
const mockAddToast = vi.fn();
const mockSetLegalModal = vi.fn();

const mockUseApp = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("../../lib/image-store", () => ({}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock("../../contexts", () => ({
  useApp: () => mockUseApp(),
}));

import SetupForm from "../SetupForm";

const baseUseApp = {
  config: { theme: "golden" },
  formData: {},
  updateFormField: mockUpdateFormField,
  maxAllowedYear: 2099,
  previewBackgrounds: [],
  isPreviewLoading: false,
  formattedDate: "",
  formattedTime: "",
  calendarLink: null,
  handleSaveSetup: mockHandleSaveSetup,
  handleDayChange: vi.fn(),
  handleHourChange: vi.fn(),
  handleMinuteChange: vi.fn(),
  handleMinuteBlur: vi.fn(),
  handleYearChange: vi.fn(),
  handleCoordinateChange: vi.fn(),
  saveMessage: "",
  saveError: "",
  isTokenVerified: false,
  hasStoredConfig: false,
  setLegalModal: mockSetLegalModal,
};

describe("SetupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApp.mockReturnValue(baseUseApp);
  });

  it("renders setup form", () => {
    render(<SetupForm prefix="admin" />);
    expect(screen.getByText("setup.coverSectionTitle")).toBeDefined();
  });

  it("renders all section titles", () => {
    render(<SetupForm />);
    expect(screen.getByText("setup.coverSectionTitle")).toBeDefined();
    expect(screen.getByText("setup.dateSectionTitle")).toBeDefined();
    expect(screen.getByText("setup.guestsSectionTitle")).toBeDefined();
    expect(screen.getByText("setup.storySectionTitle")).toBeDefined();
    expect(screen.getByText("setup.giftsSectionTitle")).toBeDefined();
    expect(screen.getByText("setup.gallerySectionTitle")).toBeDefined();
  });

  it("renders access section when not verified", () => {
    render(<SetupForm />);
    expect(screen.getByText("setup.accessSectionTitle")).toBeDefined();
  });

  it("does not render access section when verified", () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, isTokenVerified: true });
    render(<SetupForm />);
    expect(screen.queryByText("setup.accessSectionTitle")).toBeNull();
  });

  it("renders privacy consent when no stored config", () => {
    render(<SetupForm />);
    expect(screen.getByText("setup.privacyConsent")).toBeDefined();
  });

  it("does not render privacy consent when config exists", () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, hasStoredConfig: true });
    render(<SetupForm />);
    expect(screen.queryByText("setup.privacyConsent")).toBeNull();
  });

  it("renders submit button", () => {
    render(<SetupForm />);
    expect(screen.getByText("common.save")).toBeDefined();
  });

  it("calls handleSaveSetup on form submit", () => {
    render(<SetupForm />);
    const form = document.querySelector(".setup-form") as HTMLFormElement;
    fireEvent.submit(form);
    expect(mockHandleSaveSetup).toHaveBeenCalled();
  });

  it("triggers success toast when saveMessage is set", () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, saveMessage: "Saved!" });
    render(<SetupForm />);
    expect(mockAddToast).toHaveBeenCalledWith("success", "Saved!");
  });

  it("triggers error toast when saveError is set", () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, saveError: "Error!" });
    render(<SetupForm />);
    expect(mockAddToast).toHaveBeenCalledWith("error", "Error!");
  });

  it("hides sections based on hiddenSections", () => {
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      formData: { hiddenSections: "details,info,gifts" },
    });
    render(<SetupForm />);
    expect(screen.queryByText("setup.dateSectionTitle")).toBeNull();
    expect(screen.queryByText("setup.guestsSectionTitle")).toBeNull();
    expect(screen.queryByText("setup.giftsSectionTitle")).toBeNull();
    expect(screen.getByText("setup.storySectionTitle")).toBeDefined();
    expect(screen.getByText("setup.gallerySectionTitle")).toBeDefined();
  });

  it("submits form on Ctrl+Enter keyboard shortcut", () => {
    const requestSubmit = vi.fn();
    HTMLFormElement.prototype.requestSubmit = requestSubmit;
    render(<SetupForm />);
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    expect(requestSubmit).toHaveBeenCalled();
  });

  it("calls updateFormField on privacy consent toggle", () => {
    render(<SetupForm />);
    const privacyLabel = screen.getByText("setup.privacyConsent").closest("label")!;
    const checkbox = within(privacyLabel).getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(mockUpdateFormField).toHaveBeenCalledWith("_privacyConsent", "true");
  });

  it("renders section order editor", () => {
    render(<SetupForm />);
    expect(screen.getByText("sectionOrder.title")).toBeDefined();
  });
});
