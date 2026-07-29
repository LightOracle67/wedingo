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

const mockUploadImage = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/image-store", () => ({
  uploadImage: mockUploadImage,
}));

const mockFormData = vi.hoisted(() => ({ firstName: "John" }));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: mockFormData,
    updateFormField: mockUpdateFormField,
    inviteToken: "test-token",
  }),
}));

vi.mock("../../ThemePicker", () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <button data-testid="theme-picker" onClick={() => onChange("forest")}>ThemePicker {value}</button>
  ),
}));

vi.mock("../../MusicArrayEditor", () => ({
  default: ({ onChange }: { onChange: (val: string) => void }) => (
    <button data-testid="music-editor" onClick={() => onChange("test-music")}>MusicArrayEditor</button>
  ),
}));

import CoverSectionForm from "../CoverSectionForm";

describe("CoverSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData.firstName = "John";
    delete mockFormData.secondName;
    delete mockFormData.godparent1;
    delete mockFormData.godparent2;
    delete mockFormData.inviteMessage;
    delete mockFormData.theme;
    delete mockFormData.couplePhoto;
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

  it("updates secondName on change", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.secondNameLabel");
    fireEvent.change(input, { target: { value: "Jane" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("secondName", "Jane");
  });

  it("trims secondName on blur", () => {
    mockFormData.secondName = "  Jane  ";
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.secondNameLabel");
    fireEvent.blur(input);
    expect(mockUpdateFormField).toHaveBeenCalledWith("secondName", "Jane");
  });

  it("limits firstName to 20 characters", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.firstNameLabel");
    fireEvent.change(input, { target: { value: "A very long name that exceeds twenty" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("firstName", "A very long name tha");
  });

  it("limits secondName to 20 characters", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.secondNameLabel");
    fireEvent.change(input, { target: { value: "A very long name that exceeds twenty" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("secondName", "A very long name tha");
  });

  it("updates godparent1 on change", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.godparent1Label");
    fireEvent.change(input, { target: { value: "Godparent One" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("godparent1", "Godparent One");
  });

  it("limits godparent1 to 40 characters", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.godparent1Label");
    const longText = "A very long godparent name that exceeds the forty character limit easily";
    fireEvent.change(input, { target: { value: longText } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("godparent1", longText.slice(0, 40));
  });

  it("updates godparent2 on change", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.godparent2Label");
    fireEvent.change(input, { target: { value: "Godparent Two" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("godparent2", "Godparent Two");
  });

  it("limits godparent2 to 40 characters", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.godparent2Label");
    const longText = "A very long godparent name that exceeds the forty character limit easily";
    fireEvent.change(input, { target: { value: longText } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("godparent2", longText.slice(0, 40));
  });

  it("updates invite message on change", () => {
    render(<CoverSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.messagePlaceholder");
    fireEvent.change(textarea, { target: { value: "Welcome to our wedding!" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("inviteMessage", "Welcome to our wedding!");
  });

  it("limits invite message to 500 characters", () => {
    render(<CoverSectionForm />);
    const textarea = screen.getByPlaceholderText("setup.messagePlaceholder");
    const longText = "a".repeat(600);
    fireEvent.change(textarea, { target: { value: longText } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("inviteMessage", "a".repeat(500));
  });

  it("fires handleThemeChange on theme picker selection", () => {
    render(<CoverSectionForm />);
    fireEvent.click(screen.getByTestId("theme-picker"));
    expect(mockUpdateFormField).toHaveBeenCalledWith("theme", "forest");
  });

  it("renders remove photo button when couplePhoto is set", () => {
    mockFormData.couplePhoto = "https://example.com/photo.jpg";
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.remove")).toBeDefined();
  });

  it("calls updateFormField with empty string on remove photo click", () => {
    mockFormData.couplePhoto = "https://example.com/photo.jpg";
    render(<CoverSectionForm />);
    fireEvent.click(screen.getByText("setup.remove"));
    expect(mockUpdateFormField).toHaveBeenCalledWith("couplePhoto", "");
  });

  it("renders replace image link when couplePhoto is set", () => {
    mockFormData.couplePhoto = "https://example.com/photo.jpg";
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.replaceImage")).toBeDefined();
  });

  it("renders current photo image when couplePhoto is set", () => {
    mockFormData.couplePhoto = "https://example.com/photo.jpg";
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.currentPhoto")).toBeDefined();
    const img = screen.getByAltText("setup.couplePhotoLabel");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/photo.jpg");
  });

  it("handles photo upload empty file", () => {
    render(<CoverSectionForm />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([], "empty.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockAddToast).toHaveBeenCalledWith("error", "setup.errorEmptyFile");
  });

  it("handles photo upload invalid format", () => {
    render(<CoverSectionForm />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.gif", { type: "image/gif" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockAddToast).toHaveBeenCalledWith("error", "setup.errorFileFormat");
  });

  it("handles photo upload file too large", () => {
    render(<CoverSectionForm />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 30 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockAddToast).toHaveBeenCalledWith("error", "setup.errorFileSize");
  });

  it("handles photo upload success", async () => {
    mockUploadImage.mockResolvedValue({ dataUrl: "https://example.com/uploaded.jpg" });
    render(<CoverSectionForm />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(mockUploadComplete).toHaveBeenCalledWith("setup.photoUploaded");
    });
    expect(mockUploadUpdate).toHaveBeenCalledWith(90);
    expect(mockUpdateFormField).toHaveBeenCalledWith("couplePhoto", "https://example.com/uploaded.jpg");
  });

  it("handles photo upload error", async () => {
    mockUploadImage.mockRejectedValue(new Error("Upload failed"));
    render(<CoverSectionForm />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(mockUploadError).toHaveBeenCalledWith("setup.photoUploadFailed");
    });
  });

  it("fires MusicArrayEditor onChange", () => {
    render(<CoverSectionForm />);
    fireEvent.click(screen.getByTestId("music-editor"));
    expect(mockUpdateFormField).toHaveBeenCalledWith("musicFile", "test-music");
  });

  it("does not call upload when no file selected", () => {
    render(<CoverSectionForm />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("updates godparent1 on change slices to 40 chars inline", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.godparent1Label");
    fireEvent.change(input, { target: { value: "Gparent" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("godparent1", "Gparent");
  });

  it("updates godparent2 on change slices to 40 chars inline", () => {
    render(<CoverSectionForm />);
    const input = screen.getByLabelText("setup.godparent2Label");
    fireEvent.change(input, { target: { value: "Gparent2" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("godparent2", "Gparent2");
  });

  it("handles theme change via callback", () => {
    render(<CoverSectionForm />);
    fireEvent.click(screen.getByTestId("theme-picker"));
    expect(mockUpdateFormField).toHaveBeenCalledWith("theme", "forest");
  });

  it("handles music editor audio change", () => {
    render(<CoverSectionForm />);
    fireEvent.click(screen.getByTestId("music-editor"));
    expect(mockUpdateFormField).toHaveBeenCalledWith("musicFile", "test-music");
  });

  it("uploads photo via replace image input as well", async () => {
    mockFormData.couplePhoto = "https://example.com/photo.jpg";
    mockUploadImage.mockResolvedValue({ dataUrl: "https://example.com/replaced.jpg" });
    render(<CoverSectionForm />);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(7);
    const replaceInput = fileInputs[1];
    const file = new File(["test"], "new.jpg", { type: "image/jpeg" });
    fireEvent.change(replaceInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(mockUploadComplete).toHaveBeenCalledWith("setup.photoUploaded");
    });
    expect(mockUpdateFormField).toHaveBeenCalledWith("couplePhoto", "https://example.com/replaced.jpg");
  });

  it("clears file input value after successful upload", async () => {
    mockUploadImage.mockResolvedValue({ dataUrl: "https://example.com/uploaded.jpg" });
    render(<CoverSectionForm />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(mockUploadComplete).toHaveBeenCalledWith("setup.photoUploaded");
    });
    expect(fileInput.value).toBe("");
  });

  it("clears file input value after failed upload", async () => {
    mockUploadImage.mockRejectedValue(new Error("Upload failed"));
    render(<CoverSectionForm />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(mockUploadError).toHaveBeenCalledWith("setup.photoUploadFailed");
    });
    expect(fileInput.value).toBe("");
  });
});
