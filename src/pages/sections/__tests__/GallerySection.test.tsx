import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockReducedMotion = vi.hoisted(() => vi.fn(() => false));
vi.mock("../../../hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

const mockLoadGallery = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/image-store", () => ({
  loadGallery: (...args: unknown[]) => mockLoadGallery(...args),
}));

import GallerySection from "../GallerySection";

const mockImages = [
  { id: "1", url: "https://example.com/1.jpg", description: "Photo 1" },
  { id: "2", url: "https://example.com/2.jpg", description: "Photo 2" },
  { id: "3", url: "https://example.com/3.jpg", description: "" },
];

describe("GallerySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    mockLoadGallery.mockImplementation(() => new Promise(() => {}));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    expect(screen.getByText("gallery.sectionLabel")).toBeDefined();
    expect(screen.getByText("gallery.title")).toBeDefined();
  });

  it("renders empty state when no images", async () => {
    mockLoadGallery.mockResolvedValue([]);

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByText("gallery.empty")).toBeDefined();
    });
  });

  it("does not load gallery without inviteToken", async () => {
    mockLoadGallery.mockResolvedValue([]);
    render(<GallerySection className="test" style={{}} inviteToken="" />);
    expect(screen.getByText("gallery.sectionLabel")).toBeDefined();
    expect(mockLoadGallery).not.toHaveBeenCalled();
  });

  it("renders with images", async () => {
    mockLoadGallery.mockResolvedValue(mockImages);

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    expect(screen.getByText("Photo 1")).toBeDefined();
  });

  it("navigates to next image", async () => {
    mockLoadGallery.mockResolvedValue(mockImages);

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.next")).toBeDefined();
    });
    fireEvent.click(screen.getByLabelText("gallery.next"));
  });

  it("navigates to previous image", async () => {
    mockLoadGallery.mockResolvedValue(mockImages);

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.prev")).toBeDefined();
    });
    fireEvent.click(screen.getByLabelText("gallery.prev"));
  });

  it("opens and closes lightbox", async () => {
    mockLoadGallery.mockResolvedValue(mockImages);

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const mainImages = screen.getAllByAltText("Photo 1");
    fireEvent.click(mainImages[0]);
    expect(screen.getByLabelText("gallery.lightboxLabel")).toBeDefined();
    fireEvent.click(screen.getByLabelText("common.close"));
  });

  it("navigates lightbox with arrows", async () => {
    mockLoadGallery.mockResolvedValue(mockImages);

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const mainImages = screen.getAllByAltText("Photo 1");
    fireEvent.click(mainImages[0]);
    const lightboxNextBtns = screen.getAllByLabelText("gallery.next");
    fireEvent.click(lightboxNextBtns[lightboxNextBtns.length - 1]);
    const lightboxPrevBtns = screen.getAllByLabelText("gallery.prev");
    fireEvent.click(lightboxPrevBtns[lightboxPrevBtns.length - 1]);
  });
});
