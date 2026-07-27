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

const mockLoadGallery = vi.fn(() => Promise.resolve([]));
const mockUploadImage = vi.fn();
const mockAddGalleryImage = vi.fn();
const mockDeleteGalleryImage = vi.fn();
const mockUpdateGalleryDescription = vi.fn();

vi.mock("../../lib/image-store", () => ({
  loadGallery: (...args: unknown[]) => mockLoadGallery(...args),
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
  addGalleryImage: (...args: unknown[]) => mockAddGalleryImage(...args),
  deleteGalleryImage: (...args: unknown[]) => mockDeleteGalleryImage(...args),
  updateGalleryDescription: (...args: unknown[]) => mockUpdateGalleryDescription(...args),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

import GalleryArrayEditor from "../GalleryArrayEditor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
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
    fireEvent.change(fileInputs[0], { target: { files: [file] } });

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
});
