import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const mockAddToast = vi.fn();
const mockUploadToastUpdate = vi.fn();
const mockUploadToastComplete = vi.fn();
const mockUploadToastError = vi.fn();

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({
    addToast: mockAddToast,
    startUploadToast: vi.fn(() => ({
      update: mockUploadToastUpdate,
      complete: mockUploadToastComplete,
      error: mockUploadToastError,
    })),
  }),
}));

const mockLoadGallery = vi.fn(() => Promise.resolve([] as Partial<GalleryImage>[]));
const mockUploadImage = vi.fn();
const mockAddGalleryImage = vi.fn();
const mockDeleteGalleryImage = vi.fn();
const mockUpdateGalleryDescription = vi.fn();
const mockUpdateGalleryOrder = vi.fn();

vi.mock("../../lib/image-store", () => ({
  loadGallery: (...args: Parameters<typeof mockLoadGallery>) => mockLoadGallery(...args),
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
  addGalleryImage: (...args: unknown[]) => mockAddGalleryImage(...args),
  deleteGalleryImage: (...args: unknown[]) => mockDeleteGalleryImage(...args),
  updateGalleryDescription: (...args: unknown[]) => mockUpdateGalleryDescription(...args),
  updateGalleryOrder: (...args: unknown[]) => mockUpdateGalleryOrder(...args),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

import GalleryArrayEditor from "../GalleryArrayEditor";
import type { GalleryImage } from "../../types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadGallery.mockResolvedValue([]);
  mockUploadImage.mockResolvedValue({ encrypted: "enc", dataUrl: "data:image/png,test" });
  mockAddGalleryImage.mockResolvedValue({ id: "new-id", dataUrl: "data:image/png,test" });
  mockDeleteGalleryImage.mockResolvedValue(undefined);
  mockUpdateGalleryDescription.mockResolvedValue(undefined);
});

describe("GalleryArrayEditor", () => {
  const t = (key: string) => key;

  it("renders loading state initially", () => {
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    expect(document.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("renders 10 slots after loading completes", async () => {
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    const firstSlot = await screen.findByText("#1");
    expect(firstSlot).toBeInTheDocument();
    const slots = screen.getAllByText(/#\d+/);
    expect(slots).toHaveLength(10);
  });

  it("moves an image to the right and persists the order", async () => {
    mockLoadGallery.mockResolvedValueOnce([
      { id: "img1", url: "data:image/jpeg;base64,a", description: "", position: 0, originalName: "a.jpg", originalSize: 1 },
      { id: "img2", url: "data:image/jpeg;base64,b", description: "", position: 1, originalName: "b.jpg", originalSize: 1 },
    ] as Partial<GalleryImage>[]);
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");
    // El slot #1 tiene una imagen: se pulsa "mover a la derecha".
    const moveRight = screen.getAllByLabelText("setup.galleryMoveRight")[0]!;
    fireEvent.click(moveRight);
    await waitFor(() => {
      expect(mockUpdateGalleryOrder).toHaveBeenCalled();
    });
  });

  it("reverts the order when persistence of the reorder fails", async () => {
    mockLoadGallery.mockResolvedValueOnce([
      { id: "img1", url: "data:image/jpeg;base64,a", description: "", position: 0 },
      { id: "img2", url: "data:image/jpeg;base64,b", description: "", position: 1 },
    ] as Partial<GalleryImage>[]);
    mockUpdateGalleryOrder.mockRejectedValueOnce(new Error("net"));
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");
    const moveRight = screen.getAllByLabelText("setup.galleryMoveRight")[0]!;
    fireEvent.click(moveRight);
    await waitFor(() => {
      expect(mockUpdateGalleryOrder).toHaveBeenCalled();
    });
  });

  it("loads images without position, description or name using fallbacks", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img1", url: "https://example.com/1.jpg" },
      { id: "img2", url: "https://example.com/2.jpg", position: 5 },
    ] as Partial<GalleryImage>[]);
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    const firstSlot = await screen.findByText("#1");
    expect(firstSlot).toBeInTheDocument();
    expect(mockLoadGallery).toHaveBeenCalled();
  });

  it("stays in loading state when uploading without an invite token", async () => {
    render(<GalleryArrayEditor inviteToken="" t={t} />);
    expect(document.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("clears a description via blur", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img1", url: "https://example.com/1.jpg", description: "Desc", originalName: "a.jpg", originalSize: 10, position: 0 },
    ] as Partial<GalleryImage>[]);
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    const input = await screen.findByDisplayValue("Desc");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(mockUpdateGalleryDescription).toHaveBeenCalledWith("test-token", "img1", "");
    });
  });

  it("shows upload label for each empty slot", async () => {
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    const labels = await screen.findAllByText("setup.galleryUploadLabel");
    expect(labels).toHaveLength(10);
  });

  it("renders without inviteToken (loading state only)", () => {
    render(<GalleryArrayEditor t={t} />);
    expect(document.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("accepts a custom t function", async () => {
    const tFn = vi.fn((key: string) => key);
    render(<GalleryArrayEditor inviteToken="test-token" t={tFn} />);
    const labels = await screen.findAllByText("setup.galleryUploadLabel");
    expect(labels).toHaveLength(10);
    expect(tFn).toHaveBeenCalledWith("setup.galleryUploadLabel");
  });

  it("handles file upload flow", async () => {
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");

    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThanOrEqual(1);

    const file = new File(["fake-image"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInputs[0]!, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalled();
    });
    expect(mockAddGalleryImage).toHaveBeenCalled();
  });

  it("rejects empty file", async () => {
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });
    Object.defineProperty(emptyFile, "size", { value: 0 });
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.errorEmptyFile");
    });
  });

  it("deletes an image after confirmation", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "desc", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");

    const deleteBtn = document.querySelector<HTMLButtonElement>('button[aria-label="common.delete"]');
    expect(deleteBtn).toBeInTheDocument();

    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    fireEvent.click(deleteBtn!);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith("setup.deleteImageConfirm");
      expect(mockDeleteGalleryImage).toHaveBeenCalledWith("test-token", "img-1");
    });
  });

  it("shows confirm dialog on delete", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "desc", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");

    const deleteBtn = document.querySelector<HTMLButtonElement>('button[aria-label="common.delete"]')!;
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith("setup.deleteImageConfirm");
    });
  });

  it("edits description on blur", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "hello", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("hello");

    const input = screen.getByDisplayValue("hello");
    fireEvent.change(input, { target: { value: "new description" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateGalleryDescription).toHaveBeenCalledWith("test-token", "img-1", "new description");
    });
  });

  it("handles upload error", async () => {
    mockUploadImage.mockRejectedValue(new Error("Upload failed"));

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["fake-image"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadToastError).toHaveBeenCalledWith("setup.galleryUploadFailed");
    });
  });

  it("handles description save failure", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "hello", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    const testError = new Error("Network error");
    mockUpdateGalleryDescription.mockRejectedValue(testError);

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("hello");

    const input = screen.getByDisplayValue("hello");
    fireEvent.change(input, { target: { value: "new desc" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.galleryDescriptionSaveFailed: Network error");
    });
  });

  it("replaces existing image via filled slot upload", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,existing", description: "desc", originalName: "old.png", originalSize: 500, position: 0 },
    ]);

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("desc");

    const replaceLabel = screen.getByText("setup.replaceImage");
    expect(replaceLabel).toBeInTheDocument();

    const filledInput = replaceLabel.parentElement!.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["new-image"], "new.jpg", { type: "image/jpeg" });
    fireEvent.change(filledInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalled();
    });
    expect(mockDeleteGalleryImage).toHaveBeenCalledWith("test-token", "img-1");
    expect(mockAddGalleryImage).toHaveBeenCalled();
  });

  it("handles load gallery error", async () => {
    mockLoadGallery.mockRejectedValue(new Error("Load failed"));

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "errors.galleryLoadFailed");
    });
  });

  it("shows error on description blur when item has no id", async () => {
    mockLoadGallery.mockResolvedValue([
      { url: "data:image/png,test", description: "no-id", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("no-id");

    const input = screen.getByDisplayValue("no-id");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "errors.imageIdNotFound");
    });
  });

  it("rejects invalid file type", async () => {
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const badFile = new File(["text"], "file.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.errorFileFormat");
    });
  });

  it("detects duplicate file upload", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "desc", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");

    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    const file = new File(["fake-image"], "test.png", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 1000 });
    fireEvent.change(fileInputs[0]!, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("warning", "setup.duplicateFileWarning");
    });
  });

  it("stays in loading state when no inviteToken", () => {
    render(<GalleryArrayEditor t={t} />);
    expect(document.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("handles description save failure with non-Error", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "hello", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    mockUpdateGalleryDescription.mockRejectedValue("String error");

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("hello");

    const input = screen.getByDisplayValue("hello");
    fireEvent.change(input, { target: { value: "new desc" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "setup.galleryDescriptionSaveFailed: String error");
    });
  });

  it("handles delete error", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "desc", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    mockDeleteGalleryImage.mockRejectedValue(new Error("Delete failed"));

    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");

    const deleteBtn = document.querySelector<HTMLButtonElement>('button[aria-label="common.delete"]')!;
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", "errors.galleryDeleteFailed");
    });
  });

  it("skips delete when slot has no id", async () => {
    mockDeleteGalleryImage.mockClear();
    mockLoadGallery.mockResolvedValue([
      { url: "data:image/png,test", description: "no-id", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("no-id");
    const deleteBtn = document.querySelector<HTMLButtonElement>('button[aria-label="common.delete"]')!;
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    fireEvent.click(deleteBtn);
    await vi.waitFor(() => {
      expect(mockDeleteGalleryImage).not.toHaveBeenCalled();
    });
  });

  it("does not crash on delete when inviteToken is unset", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "desc", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    render(<GalleryArrayEditor inviteToken="" t={t} />);
    expect(document.querySelector(".page-loading")).toBeInTheDocument();
  });

  it("trims description on save and handles null currentValue", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "long text", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("long text");
    const input = screen.getByDisplayValue("long text");
    fireEvent.change(input, { target: { value: "a".repeat(250) } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(mockUpdateGalleryDescription).toHaveBeenCalledWith("test-token", "img-1", "a".repeat(200));
    });
  });

  it("changes description on existing slot triggers handleDescriptionChange", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByPlaceholderText("setup.galleryDescriptionPlaceholder");
    const input = screen.getByPlaceholderText("setup.galleryDescriptionPlaceholder");
    fireEvent.change(input, { target: { value: "updated" } });
    expect(input).toHaveValue("updated");
  });

  it("returns early from handleDelete when inviteToken is empty", async () => {
    mockLoadGallery.mockResolvedValue([]);
    const tFn = vi.fn((key: string) => key);
    render(<GalleryArrayEditor inviteToken="" t={tFn} />);
    await vi.waitFor(() => {
      expect(document.querySelector(".page-loading")).toBeInTheDocument();
    });
  });

  it("returns early from handleDelete when inviteToken is missing after load", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "desc", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    const tFn = vi.fn((key: string) => key);
    const { rerender } = render(<GalleryArrayEditor inviteToken="test-token" t={tFn} />);
    await screen.findByDisplayValue("desc");
    rerender(<GalleryArrayEditor inviteToken="" t={tFn} />);
    await vi.waitFor(() => {
      expect(tFn).toHaveBeenCalled();
    });
  });

  it("handles descriptionChange for null slot gracefully", async () => {
    mockLoadGallery.mockResolvedValue([]);
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");
    const nullSlotInput = document.querySelector<HTMLInputElement>('input[type="text"]');
    expect(nullSlotInput).toBeNull();
  });

  it("skips delete when no id via guard clause", async () => {
    mockLoadGallery.mockResolvedValue([
      { url: "data:image/png,test", description: "desc", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    mockDeleteGalleryImage.mockClear();
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("desc");
    const deleteBtn = document.querySelector<HTMLButtonElement>('button[aria-label="common.delete"]')!;
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    fireEvent.click(deleteBtn);
    await vi.waitFor(() => {
      expect(mockDeleteGalleryImage).not.toHaveBeenCalled();
    });
  });

  it("calls handleDescriptionBlur with nullish currentValue safely", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "desc", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("desc");
    const input = screen.getByDisplayValue("desc");
    fireEvent.change(input, { target: { value: "  padded  " } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(mockUpdateGalleryDescription).toHaveBeenCalledWith("test-token", "img-1", "padded");
    });
  });

  it("skips upload when file input has no files", async () => {
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByText("#1");
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [] } });
    await vi.waitFor(() => {
      expect(mockUploadImage).not.toHaveBeenCalled();
    });
  });

  it("calls handleDescriptionBlur and skips save when inviteToken changes", async () => {
    mockLoadGallery.mockResolvedValue([
      { id: "img-1", url: "data:image/png,test", description: "desc", originalName: "test.png", originalSize: 1000, position: 0 },
    ]);
    render(<GalleryArrayEditor inviteToken="test-token" t={t} />);
    await screen.findByDisplayValue("desc");
    const input = screen.getByDisplayValue("desc");
    fireEvent.blur(input);
    await waitFor(() => {
      expect(mockUpdateGalleryDescription).toHaveBeenCalledWith("test-token", "img-1", "desc");
    });
  });
});
