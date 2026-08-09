import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockReducedMotion = vi.hoisted(() => vi.fn(() => false));
vi.mock("../../../hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

const mockLoadGalleryMeta = vi.hoisted(() => vi.fn());
const mockGetGalleryImageUrl = vi.hoisted(() =>
  vi.fn(async (_token: string, meta: { id: string }) => `https://example.com/${meta.id}.jpg`),
);
vi.mock("../../../lib/image-store", () => ({
  loadGalleryMeta: (...args: unknown[]) => mockLoadGalleryMeta(...args),
  getGalleryImageUrl: (...args: Parameters<typeof mockGetGalleryImageUrl>) => mockGetGalleryImageUrl(...args),
  loadGallery: vi.fn(),
  clearGalleryCache: vi.fn(),
}));

import GallerySection from "../GallerySection";

const mockImages = [
  { id: "1", url: "https://example.com/1.jpg", description: "Photo 1" },
  { id: "2", url: "https://example.com/2.jpg", description: "Photo 2" },
  { id: "3", url: "https://example.com/3.jpg", description: "" },
];

/** Convierte las imágenes de la UI a metadatos para loadGalleryMeta. */
const toMeta = (images: Array<{ id: string; url: string; description: string }>) =>
  images.map((img) => ({
    id: img.id,
    encrypted: "enc",
    description: img.description,
    originalName: "",
    originalSize: 0,
  }));

describe("GallerySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReducedMotion.mockReturnValue(false);
    // IntersectionObserver disponible: el auto-avance se controla por
    // visibilidad de la sección (cubre la rama del observer).
    class FakeIO {
      static instance: { callback: IntersectionObserverCallback } | null = null;
      constructor(callback: IntersectionObserverCallback) {
        FakeIO.instance = { callback };
      }
      observe(target: Element) {
        // La sección se considera visible: el auto-avance se arranca.
        const cb = FakeIO.instance?.callback;
        if (cb)
          cb(
            [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
      }
      disconnect() {}
    }
    (FakeIO as unknown as { instance: unknown }).instance = null;
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
  });

  it("falls back to idle decryption when IntersectionObserver is unavailable", async () => {
    // Sin IO, las miniaturas se descifran con el fallback (primeras 4 + idle).
    const original = (globalThis as Record<string, unknown>).IntersectionObserver;
    Object.defineProperty(globalThis, "IntersectionObserver", { value: undefined, configurable: true });
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(mockGetGalleryImageUrl).toHaveBeenCalled();
    });
    if (original !== undefined) {
      Object.defineProperty(globalThis, "IntersectionObserver", { value: original, configurable: true });
    }
  });

  it("does not decrypt without an invite token", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} />);
    await vi.waitFor(() => {
      expect(screen.getByText("gallery.sectionLabel")).toBeDefined();
    });
    expect(mockGetGalleryImageUrl).not.toHaveBeenCalled();
  });

  it("renders loading state", () => {
    mockLoadGalleryMeta.mockImplementation(() => new Promise(() => {}));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    expect(screen.getByText("gallery.sectionLabel")).toBeDefined();
    expect(screen.getByText("gallery.title")).toBeDefined();
  });

  it("hides the section when there are no images", async () => {
    mockLoadGalleryMeta.mockResolvedValue([]);

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.queryByText("gallery.title")).toBeNull();
    });
    expect(screen.queryByText("gallery.empty")).toBeNull();
  });

  it("does not load gallery without inviteToken", async () => {
    mockLoadGalleryMeta.mockResolvedValue([]);
    render(<GallerySection className="test" style={{}} inviteToken="" />);
    expect(screen.getByText("gallery.sectionLabel")).toBeDefined();
    expect(mockLoadGalleryMeta).not.toHaveBeenCalled();
  });

  it("renders with images", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    expect(screen.getByText("Photo 1")).toBeDefined();
  });

  it("navigates to next image", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.next")).toBeDefined();
    });
    fireEvent.click(screen.getByLabelText("gallery.next"));
  });

  it("navigates to previous image", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.prev")).toBeDefined();
    });
    fireEvent.click(screen.getByLabelText("gallery.prev"));
  });

  it("opens and closes lightbox", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const mainImages = screen.getAllByAltText("Photo 1");
    fireEvent.click(mainImages[0]!);
    expect(screen.getByLabelText("gallery.lightboxLabel")).toBeDefined();
    fireEvent.click(screen.getByLabelText("common.close"));
  });

  it("downloads the current photo from the lightbox", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    fireEvent.click(screen.getAllByAltText("Photo 1")[0]!);
    // El url de la imagen se resuelve de forma asíncrona (getGalleryImageUrl):
    // el clic de descarga se reintenta hasta que la imagen esté lista.
    await vi.waitFor(() => {
      fireEvent.click(screen.getByLabelText("gallery.download"));
      expect(clickSpy).toHaveBeenCalled();
    });
    clickSpy.mockRestore();
  });

  it("navigates lightbox with arrows", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));

    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const mainImages = screen.getAllByAltText("Photo 1");
    fireEvent.click(mainImages[0]!);
    const lightboxNextBtns = screen.getAllByLabelText("gallery.next");
    fireEvent.click(lightboxNextBtns[lightboxNextBtns.length - 1]!);
    const lightboxPrevBtns = screen.getAllByLabelText("gallery.prev");
    fireEvent.click(lightboxPrevBtns[lightboxPrevBtns.length - 1]!);
  });

  it("shows image counter when multiple images", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByText(/1 \/ 3/)).toBeDefined();
    });
  });

  it("renders image description", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByText("Photo 1")).toBeDefined();
    });
    const descriptions = screen.getAllByText("Photo 1");
    expect(descriptions.length).toBeGreaterThanOrEqual(1);
  });

  it("navigates carousel with keyboard ArrowLeft on container", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const container = screen.getByLabelText("gallery.carouselLabel");
    fireEvent.keyDown(container, { key: "ArrowRight" });
    fireEvent.keyDown(container, { key: "ArrowLeft" });
  });

  it("navigates carousel with keyboard ArrowLeft/Right on outer wrapper", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const sections = screen.getAllByRole("region");
    const gallerySection = sections.find((s) => s.getAttribute("aria-label") === "gallery.title");
    fireEvent.keyDown(gallerySection!, { key: "ArrowRight" });
    fireEvent.keyDown(gallerySection!, { key: "ArrowLeft" });
  });

  it("guards carousel navigation with a single image", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta([{ id: "1", url: "x", description: "Solo" }]));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const container = screen.getByLabelText("gallery.carouselLabel");
    fireEvent.keyDown(container, { key: "ArrowRight" });
    fireEvent.keyDown(container, { key: "ArrowLeft" });
    const sections = screen.getAllByRole("region");
    const gallerySection = sections.find((s) => s.getAttribute("aria-label") === "gallery.title");
    fireEvent.keyDown(gallerySection!, { key: "ArrowRight" });
    fireEvent.keyDown(gallerySection!, { key: "ArrowLeft" });
  });

  it("closes lightbox with Escape key", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const mainImages = screen.getAllByAltText("Photo 1");
    fireEvent.click(mainImages[0]!);
    expect(screen.getByLabelText("gallery.lightboxLabel")).toBeDefined();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByLabelText("gallery.lightboxLabel")).toBeNull();
  });

  it("navigates lightbox with ArrowLeft/ArrowRight keys", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const mainImages = screen.getAllByAltText("Photo 1");
    fireEvent.click(mainImages[0]!);
    expect(screen.getByLabelText("gallery.lightboxLabel")).toBeDefined();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
  });

  it("skips auto-advance when reducedMotion is enabled", async () => {
    mockReducedMotion.mockReturnValue(true);
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
  });

  it("pauses auto-advance on hover", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const storyCard = document.querySelector(".story-card")!;
    fireEvent.mouseEnter(storyCard);
    fireEvent.mouseLeave(storyCard);
  });

  it("handles thumbnail onLoad callback", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const thumbs = document.querySelectorAll<HTMLImageElement>(".gallery-thumb__img");
    expect(thumbs.length).toBeGreaterThan(0);
    fireEvent.load(thumbs[0]!);
    fireEvent.error(thumbs[0]!);
  });

  it("handles main image onLoad and onError", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const mainImgs = document.querySelectorAll<HTMLImageElement>(".gallery-main-img");
    expect(mainImgs.length).toBeGreaterThan(0);
    fireEvent.load(mainImgs[0]!);
    fireEvent.error(mainImgs[0]!);
  });

  it("shows thumbnail loading spinner before load", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const thumbSpinners = document.querySelectorAll<HTMLElement>(".gallery-thumb .page-loading");
    expect(thumbSpinners.length).toBeGreaterThan(0);
  });

  it("does not navigate when images.length <= 1", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages.slice(0, 1)));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    expect(screen.queryByLabelText("gallery.next")).toBeNull();
    expect(screen.queryByLabelText("gallery.prev")).toBeNull();
  });

  it("handles focus and blur events on story card", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const storyCard = document.querySelector(".story-card")!;
    fireEvent.focus(storyCard);
    fireEvent.blur(storyCard);
  });

  it("stops propagation when clicking lightbox image", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const mainImages = screen.getAllByAltText("Photo 1");
    fireEvent.click(mainImages[0]!);
    const lightboxImgs = document.querySelectorAll<HTMLImageElement>(".gallery-lightbox__img");
    expect(lightboxImgs.length).toBeGreaterThan(0);
    fireEvent.click(lightboxImgs[0]!);
  });

  it("shows lightbox caption when image has description", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const mainImages = screen.getAllByAltText("Photo 1");
    fireEvent.click(mainImages[0]!);
    const captions = document.querySelectorAll(".gallery-lightbox__caption");
    expect(captions.length).toBeGreaterThan(0);
    expect(captions[0]!.textContent).toBe("Photo 1");
  });

  it("clicks thumbnail to navigate (goTo)", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const thumbBtns = document.querySelectorAll<HTMLButtonElement>(".gallery-thumb");
    expect(thumbBtns.length).toBe(3);
    fireEvent.click(thumbBtns[2]!);
  });

  it("handles thumbnail onError triggers", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const thumbs = document.querySelectorAll<HTMLImageElement>(".gallery-thumb__img");
    fireEvent.error(thumbs[1]!);
  });

  it("fires setTimeout callbacks in next after delay", async () => {
    vi.useFakeTimers();
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    act(() => {
      fireEvent.click(screen.getByLabelText("gallery.next"));
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    vi.useRealTimers();
  });

  it("fires setTimeout callbacks in prev after delay", async () => {
    vi.useFakeTimers();
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    act(() => {
      fireEvent.click(screen.getByLabelText("gallery.next"));
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      fireEvent.click(screen.getByLabelText("gallery.prev"));
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    vi.useRealTimers();
  });

  it("fires setTimeout callbacks in goTo after delay", async () => {
    vi.useFakeTimers();
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    const thumbBtns = document.querySelectorAll<HTMLButtonElement>(".gallery-thumb");
    act(() => {
      if (thumbBtns[2]) fireEvent.click(thumbBtns[2]!);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    vi.useRealTimers();
  });

  it("triggers handleNextImage setTimeout via auto-advance interval", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    // Transcurren 5s: el intervalo dispara el auto-avance.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    vi.useRealTimers();
  });

  it("renders images without url or id using fallbacks", async () => {
    mockLoadGalleryMeta.mockResolvedValue([
      { id: "1", encrypted: "e", description: "" },
      { id: "2", encrypted: "e", description: "" },
    ]);
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    fireEvent.click(document.querySelectorAll("img")[0]!);
    expect(screen.getByLabelText("gallery.lightboxLabel")).toBeDefined();
  });

  it("guards carousel controls with a single image", async () => {
    mockLoadGalleryMeta.mockResolvedValue(toMeta([{ id: "1", url: "x", description: "Solo" }]));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    fireEvent.click(document.querySelectorAll("img")[0]!);
    fireEvent.keyDown(screen.getByLabelText("gallery.lightboxLabel"), { key: "ArrowRight" });
    expect(screen.getAllByAltText("Solo").length).toBeGreaterThan(0);
  });

  it("does not pause when reducedMotion is enabled", async () => {
    mockReducedMotion.mockReturnValue(true);
    mockLoadGalleryMeta.mockResolvedValue(toMeta(mockImages));
    render(<GallerySection className="test" style={{}} inviteToken="test-token" />);
    await vi.waitFor(() => {
      expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
    });
    fireEvent.mouseEnter(screen.getByLabelText("gallery.carouselLabel"));
    expect(screen.getByLabelText("gallery.carouselLabel")).toBeDefined();
  });
});
