import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({
    addToast: vi.fn(),
    startUploadToast: vi.fn(() => ({
      update: vi.fn(),
      complete: vi.fn(),
      error: vi.fn(),
    })),
  }),
}));

vi.mock("../../lib/image-store", () => ({
  loadGallery: vi.fn(() => Promise.resolve([])),
  uploadImage: vi.fn(),
  addGalleryImage: vi.fn(),
  deleteGalleryImage: vi.fn(),
  updateGalleryDescription: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

import GalleryArrayEditor from "../GalleryArrayEditor";

afterEach(cleanup);

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
});
