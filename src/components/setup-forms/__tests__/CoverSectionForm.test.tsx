import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUpdateFormField = vi.fn();

const mockAddToast = vi.fn();
const mockUploadUpdate = vi.fn();
const mockUploadComplete = vi.fn();
const mockUploadError = vi.fn();

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({
    addToast: mockAddToast,
    startUploadToast: () => ({
      update: mockUploadUpdate,
      complete: mockUploadComplete,
      error: mockUploadError,
    }),
  }),
}));

vi.mock("../../../lib/image-store", () => ({
  uploadImage: vi.fn(),
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: { firstName: "John" },
    updateFormField: mockUpdateFormField,
    inviteToken: "test-token",
  }),
}));

vi.mock("../../ThemePicker", () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="theme-picker">ThemePicker {value}</div>
  ),
}));

vi.mock("../../MusicArrayEditor", () => ({
  default: () => <div data-testid="music-editor">MusicArrayEditor</div>,
}));

import CoverSectionForm from "../CoverSectionForm";

describe("CoverSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.namesLegend")).toBeDefined();
  });

  it("renders name fields", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.firstNameLabel")).toBeDefined();
    expect(screen.getByText("setup.secondNameLabel")).toBeDefined();
  });

  it("renders godparent fields", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.godparent1Label")).toBeDefined();
    expect(screen.getByText("setup.godparent2Label")).toBeDefined();
  });

  it("renders godparents help text", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.godparentsHint")).toBeDefined();
  });

  it("renders invite message textarea", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.messageLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.messagePlaceholder")).toBeDefined();
  });

  it("renders theme picker", () => {
    render(<CoverSectionForm />);
    expect(screen.getByTestId("theme-picker")).toBeDefined();
  });

  it("renders music editor", () => {
    render(<CoverSectionForm />);
    expect(screen.getByTestId("music-editor")).toBeDefined();
  });

  it("renders photo upload section", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.couplePhotoLabel")).toBeDefined();
  });

  it("renders photo hint text", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.couplePhotoHint")).toBeDefined();
  });

  it("renders upload hint text", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.couplePhotoUploadHint")).toBeDefined();
  });

  it("updates firstName on change", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.firstNameLabel") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Jane" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("firstName", "Jane");
  });

  it("trims firstName on blur", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.firstNameLabel");
    fireEvent.blur(input);
    expect(mockUpdateFormField).toHaveBeenCalledWith("firstName", "John");
  });

  it("renders with prefix", () => {
    render(<CoverSectionForm prefix="admin" />);
    expect(screen.getByText("setup.namesLegend")).toBeDefined();
  });
});
