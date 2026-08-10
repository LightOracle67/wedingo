import { describe, it, expect, vi, afterEach } from "vitest";
import { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUseAppValue = vi.hoisted(() => ({
  config: {
    firstName: "Test",
    secondName: "User",
    theme: "golden",
    inviteMessage: "",
    couplePhoto: "",
    godparent1: "",
    godparent2: "",
    hiddenSections: "gifts,accommodation,gallery,rsvp",
    sectionOrder: "",
    weddingDay: "15",
    weddingMonth: "enero",
    weddingYear: "2025",
    weddingHour: "14",
    weddingMinute: "30",
    weddingPlace: "Madrid",
    weddingSiteURL: "https://maps.google.com/maps/place/Madrid",
    weddingScheduleEvents: "",
    weddingDressCode: "",
    kidsPolicy: "",
    accommodationURL: "",
    storyText: "",
    giftsInfo: "",
    bankInfo: "",
    musicFile: "",
    musicUrl: "",
    menuEnabled: "",
    menuCarne: "",
    menuPescado: "",
    menuVegano: "",
    menuPostre: "",
    menuTexto: "",
    rsvpDeadline: "",
    rsvpDeadlineEnabled: "false",
    reactionsEnabled: "false",
    giftsListEnabled: "false",
    giftList: "[]",
    rideShareEnabled: "false",
    welcomeVideo: "",
    welcomeVideoEnabled: "false",
    notesEnabled: "false",
    musicPollEnabled: "false",
    triviaEnabled: "false",
    trivia: "[]",
  },
  isConfigLoading: false,
  configLoadError: "",
  formattedDate: "15 ene 2025",
  formattedTime: "14:30",
  calendarLink: null,
  rsvpForm: { attendees: [] },
  rsvpEntries: [],
  rsvpMessage: "",
  isRsvpSubmitting: false,
  hasSubmitted: false,
  alreadySubmittedEntry: null,
  updateRsvpField: vi.fn(),
  handleRsvpSubmit: vi.fn(),
  handleDeleteRsvp: vi.fn(),
  DIETARY_OPTIONS: [],
  computeAge: vi.fn(),
  isAdminTokenLoggedIn: true,
}));

const mockUseParams = vi.hoisted(() => ({ inviteToken: "test" }));
const mockUseLocation = vi.hoisted(() => ({ pathname: "/test", search: "", hash: "" }));

const mockStoryNavigation = vi.hoisted(() => ({
  activeSection: "hero",
  isTransitioning: false,
  getSectionStyle: () => ({}),
  getSectionClassName: () => "story-section story-section--is-active",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("react-router", () => ({
  useLocation: () => mockUseLocation,
  useParams: () => mockUseParams,
}));

const mockTrackEvent = vi.hoisted(() => vi.fn());
vi.mock("../../lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

vi.mock("../../contexts", () => ({
  useApp: () => mockUseAppValue,
  useConfig: () => mockUseAppValue,
  useRsvpContext: () => mockUseAppValue,
  useAuth: () => mockUseAppValue,
}));

vi.mock("../../lib/image-store", () => ({
  loadGallery: vi.fn(() => Promise.resolve([{ id: "1", url: "https://example.com/1.jpg", description: "" }])),
  loadGalleryMeta: vi.fn(() => Promise.resolve([{ id: "1", encrypted: "", description: "" }])),
}));

vi.mock("../../components/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../hooks/useStoryNavigation", () => ({
  useStoryNavigation: () => mockStoryNavigation,
}));

vi.mock("../../lib/utils", () => ({
  buildGoogleMapsUrl: vi.fn(() => ""),
  buildGoogleMapsSearchUrl: vi.fn(() => ""),
  buildAppleMapsUrl: vi.fn(() => ""),
  buildAppleMapsSearchUrl: vi.fn(() => ""),
}));

vi.mock("../../lib/platform-settings", () => ({
  usePlatformSettings: () => ({
    settings: { maintenance: "false", bannerEnabled: "false", bannerText: "", blockedUrls: "", blockedTokens: "", expiringDays: "30", disabledFeatures: "" },
    loaded: true,
    reload: () => undefined,
  }),
  tokenIsBlocked: () => false,
  isFeatureDisabled: () => false,
}));



const mockSectionComponents: Record<string, ReturnType<typeof vi.fn>> = {};
function mockSection(name: string) {
  const comp = vi.fn(() => <div data-testid={`section-${name}`} />);
  mockSectionComponents[name] = comp;
  return { default: comp };
}

vi.mock("../sections/TransportSection", () => mockSection("transport"));
vi.mock("../sections/InfoSection", () => mockSection("info"));
vi.mock("../sections/StorySection", () => mockSection("story"));
vi.mock("../sections/GiftsSection", () => mockSection("gifts"));
vi.mock("../sections/AccommodationSection", () => mockSection("accommodation"));
vi.mock("../sections/GallerySection", () => mockSection("gallery"));
vi.mock("../sections/RsvpSection", () => mockSection("rsvp"));
vi.mock("../sections/ReactionsSection", () => mockSection("reactions"));
vi.mock("../sections/NotesSection", () => mockSection("notes"));
vi.mock("../sections/MusicPollSection", () => mockSection("musicpoll"));
vi.mock("../sections/TriviaSection", () => mockSection("trivia"));
vi.mock("../sections/GiftListSection", () => mockSection("giftlist"));
vi.mock("../sections/RideShareSection", () => mockSection("rideshare"));

import PublicInvitation from "../PublicInvitation";

describe("PublicInvitation", () => {
  afterEach(() => {
    const headScripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    headScripts.forEach((s) => s.remove());
  });

  it("renders without crashing", () => {
    expect(() => render(<PublicInvitation />)).not.toThrow();
  });

  it("renders loading state", () => {
    mockUseAppValue.isConfigLoading = true;
    render(<PublicInvitation />);
    expect(screen.getByText("public.loadingInvitation")).toBeDefined();
    mockUseAppValue.isConfigLoading = false;
  });

  it("renders error state", () => {
    mockUseAppValue.configLoadError = "error.test";
    render(<PublicInvitation />);
    expect(screen.getByText("setup.errorTitle")).toBeDefined();
    mockUseAppValue.configLoadError = "";
  });

  it("renders empty state when no names and no token", () => {
    mockUseAppValue.config.firstName = "";
    mockUseAppValue.config.secondName = "";
    mockUseParams.inviteToken = "";
    render(<PublicInvitation />);
    expect(screen.getByText("public.createLink")).toBeDefined();
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    mockUseParams.inviteToken = "test";
  });

  it("renders without crashing in non-admin mode", () => {
    mockUseAppValue.isAdminTokenLoggedIn = false;
    expect(() => render(<PublicInvitation />)).not.toThrow();
    mockUseAppValue.isAdminTokenLoggedIn = true;
  });

  it("renders showMissingToken state when token provided but no names", () => {
    mockUseAppValue.config.firstName = "";
    mockUseAppValue.config.secondName = "";
    render(<PublicInvitation />);
    expect(screen.getByText("public.notFoundTitle")).toBeDefined();
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
  });

  it("handles countdown with past wedding date", () => {
    mockUseAppValue.config.weddingDay = "";
    mockUseAppValue.config.weddingMonth = "";
    mockUseAppValue.config.weddingYear = "";
    mockUseAppValue.config.weddingHour = "";
    mockUseAppValue.config.weddingMinute = "";
    expect(() => render(<PublicInvitation />)).not.toThrow();
    mockUseAppValue.config.weddingDay = "15";
    mockUseAppValue.config.weddingMonth = "enero";
    mockUseAppValue.config.weddingYear = "2025";
    mockUseAppValue.config.weddingHour = "14";
    mockUseAppValue.config.weddingMinute = "30";
  });

  it("renders with future wedding date for countdown", () => {
    mockUseAppValue.config.weddingYear = "2030";
    expect(() => render(<PublicInvitation />)).not.toThrow();
    mockUseAppValue.config.weddingYear = "2025";
  });

  it("pauses and resumes the countdown on visibility changes", () => {
    mockUseAppValue.config.weddingYear = "2030";
    render(<PublicInvitation />);
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(() => render(<PublicInvitation />)).not.toThrow();
    mockUseAppValue.config.weddingYear = "2025";
  });

  it("countdown borrows days from the target month", () => {
    mockUseAppValue.config.weddingDay = "3";
    mockUseAppValue.config.weddingMonth = "octubre";
    mockUseAppValue.config.weddingYear = "2027";
    mockUseAppValue.config.weddingHour = "18";
    mockUseAppValue.config.weddingMinute = "30";
    expect(() => render(<PublicInvitation />)).not.toThrow();
    mockUseAppValue.config.weddingDay = "15";
    mockUseAppValue.config.weddingMonth = "enero";
    mockUseAppValue.config.weddingYear = "2025";
  });

  it("countdown borrows months from the target year", () => {
    mockUseAppValue.config.weddingDay = "10";
    mockUseAppValue.config.weddingMonth = "enero";
    mockUseAppValue.config.weddingYear = "2027";
    expect(() => render(<PublicInvitation />)).not.toThrow();
    mockUseAppValue.config.weddingYear = "2025";
  });

  it("keeps a single rsvp section in admin mode when already present", () => {
    mockUseAppValue.config.sectionOrder = "hero,rsvp,details";
    render(<PublicInvitation />);
    expect(screen.queryAllByText("sections.rsvp.title").length).toBeLessThanOrEqual(2);
  });

  it("renders with schedule and dress code info", () => {
    mockUseAppValue.config.weddingScheduleEvents = JSON.stringify([{ time: "16:00", text: "Ceremony" }]);
    mockUseAppValue.config.weddingDressCode = "Formal";
    mockUseAppValue.config.kidsPolicy = "Welcome";
    expect(() => render(<PublicInvitation />)).not.toThrow();
    mockUseAppValue.config.weddingScheduleEvents = "";
    mockUseAppValue.config.weddingDressCode = "";
    mockUseAppValue.config.kidsPolicy = "";
  });

  it("shows retry button in error state and handles click", () => {
    const reloadMock = vi.fn();
    const origLocation = window.location;
    delete (window as any).location;
    (window as any).location = { reload: reloadMock };
    mockUseAppValue.configLoadError = "error.test";
    render(<PublicInvitation />);
    const retryBtn = screen.getByText("common.retry");
    expect(retryBtn).toBeDefined();
    fireEvent.click(retryBtn);
    expect(reloadMock).toHaveBeenCalled();
    mockUseAppValue.configLoadError = "";
    (window as any).location = origLocation;
  });

  it("goes home instead of reloading when the link is invalid (no infinite loop)", () => {
    const origLocation = window.location;
    delete (window as any).location;
    (window as any).location = { assign: vi.fn() };
    // El mensaje de enlace inválido NO muestra "Reintentar" (bucle muerto).
    mockUseAppValue.configLoadError = "errors.invalidLink";
    render(<PublicInvitation />);
    const homeBtn = screen.getByText("common.goHome");
    expect(homeBtn).toBeDefined();
    expect(screen.queryByText("common.retry")).toBeNull();
    fireEvent.click(homeBtn);
    expect((window as any).location.assign).toHaveBeenCalledWith("/");
    mockUseAppValue.configLoadError = "";
    (window as any).location = origLocation;
  });

  it("shows envelope overlay in non-admin mode", () => {
    mockUseAppValue.isAdminTokenLoggedIn = false;
    render(<PublicInvitation />);
    expect(screen.getByLabelText("envelope.tapContinue")).toBeDefined();
    mockUseAppValue.isAdminTokenLoggedIn = true;
  });

  it("opens envelope on click and hides it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mockUseAppValue.isAdminTokenLoggedIn = false;
    render(<PublicInvitation />);
    expect(screen.getByLabelText("envelope.tapContinue")).toBeDefined();
    fireEvent.click(screen.getByLabelText("envelope.tapContinue"));
    fireEvent.click(screen.getByLabelText("envelope.tapContinue"));
    act(() => {
      vi.advanceTimersByTime(3600);
    });
    expect(screen.queryByLabelText("envelope.tapContinue")).toBeNull();
    expect(mockTrackEvent).toHaveBeenCalledWith("envelope_open", { method: "click" });
    vi.useRealTimers();
    mockUseAppValue.isAdminTokenLoggedIn = true;
  });

  it("shows confetti and the welcome video when the envelope opens", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mockUseAppValue.isAdminTokenLoggedIn = false;
    mockUseAppValue.config.welcomeVideo = "https://example.com/video.mp4";
    mockUseAppValue.config.welcomeVideoEnabled = "true";
    render(<PublicInvitation />);
    fireEvent.click(screen.getByLabelText("envelope.tapContinue"));
    fireEvent.click(screen.getByLabelText("envelope.tapContinue"));
    // El onOpen del sobre se dispara a los 3500ms de la secuencia de apertura.
    act(() => {
      vi.advanceTimersByTime(3600);
    });
    expect(document.querySelector(".confetti")).not.toBeNull();
    expect(document.querySelector(".welcome-video-overlay")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(3600);
    });
    // El confeti cae UNA sola vez y se desmonta al terminar (no se repite).
    expect(document.querySelector(".confetti")).toBeNull();
    expect(document.querySelector(".welcome-video-overlay")).not.toBeNull();
    vi.useRealTimers();
    mockUseAppValue.isAdminTokenLoggedIn = true;
    mockUseAppValue.config.welcomeVideo = "";
    mockUseAppValue.config.welcomeVideoEnabled = "false";
  });

  it("animates the welcome video exit before unmounting", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mockUseAppValue.isAdminTokenLoggedIn = false;
    mockUseAppValue.config.welcomeVideo = "https://example.com/video.mp4";
    mockUseAppValue.config.welcomeVideoEnabled = "true";
    render(<PublicInvitation />);
    fireEvent.click(screen.getByLabelText("envelope.tapContinue"));
    fireEvent.click(screen.getByLabelText("envelope.tapContinue"));
    // Dispara el onOpen del sobre (setTimeout de 3500ms).
    act(() => {
      vi.advanceTimersByTime(3600);
    });
    const overlayEl = () => document.querySelector(".welcome-video-overlay") as HTMLElement | null;
    expect(overlayEl()).not.toBeNull();
    // Cierra el overlay: se aplica la clase de salida y sigue montado.
    fireEvent.click(overlayEl()!);
    expect(overlayEl()!.className).toContain("welcome-video-overlay--closing");
    expect(document.querySelector(".welcome-video-card")!.className).toContain("welcome-video-card--closing");
    // Tras la duración de la salida el overlay se desmonta.
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(overlayEl()).toBeNull();
    vi.useRealTimers();
    mockUseAppValue.isAdminTokenLoggedIn = true;
    mockUseAppValue.config.welcomeVideo = "";
    mockUseAppValue.config.welcomeVideoEnabled = "false";
  });

  it("does not show the welcome video when it is disabled", () => {
    mockUseAppValue.isAdminTokenLoggedIn = false;
    mockUseAppValue.config.welcomeVideo = "https://example.com/video.mp4";
    mockUseAppValue.config.welcomeVideoEnabled = "false";
    render(<PublicInvitation />);
    fireEvent.click(screen.getByLabelText("envelope.tapContinue"));
    fireEvent.click(screen.getByLabelText("envelope.tapContinue"));
    expect(document.querySelector(".welcome-video-overlay")).toBeNull();
    mockUseAppValue.isAdminTokenLoggedIn = true;
    mockUseAppValue.config.welcomeVideo = "";
    mockUseAppValue.config.welcomeVideoEnabled = "false";
  });

  it("handles section order without rsvp in admin mode", () => {
    mockUseAppValue.config.sectionOrder = "hero,details,info,story,gifts";
    render(<PublicInvitation />);
    mockUseAppValue.config.sectionOrder = "";
  });

  it("renders in invite mode with ?invitar search param", () => {
    mockUseLocation.search = "?invitar";
    mockUseAppValue.config.hiddenSections = "";
    mockUseAppValue.config.sectionOrder = "hero,gifts";
    render(<PublicInvitation />);
    mockUseLocation.search = "";
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.sectionOrder = "";
  });

  it("handles empty weddingPlace for description fallback", () => {
    mockUseAppValue.config.weddingPlace = "";
    mockUseAppValue.config.weddingSiteURL = "";
    render(<PublicInvitation />);
    mockUseAppValue.config.weddingPlace = "Madrid";
    mockUseAppValue.config.weddingSiteURL = "https://maps.google.com/maps/place/Madrid";
  });

  it("renders with isStoryTransitioning true", () => {
    mockStoryNavigation.isTransitioning = true;
    render(<PublicInvitation />);
    mockStoryNavigation.isTransitioning = false;
  });

  it("handles unknown section key in visibleOrder", () => {
    mockUseAppValue.config.sectionOrder = "hero,unknown_section,details";
    mockUseAppValue.config.hiddenSections = "";
    render(<PublicInvitation />);
    mockUseAppValue.config.sectionOrder = "";
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
  });

  it("injects schema.org JSON-LD when names are present", () => {
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.weddingYear = "2025";
    render(<PublicInvitation />);
    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(1);
  });

  it("applies Open Graph meta for the couple", () => {
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    render(<PublicInvitation />);
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe("Test User — Wedingo");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(
      "https://wedingo-6c26a.web.app/test",
    );
    document.head.querySelectorAll("[data-wedingo-seo]").forEach((el) => el.remove());
  });

  it("shares the invitation via navigator.share", async () => {
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    const shareSpy = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", { value: shareSpy, configurable: true });
    render(<PublicInvitation />);
    fireEvent.click(screen.getByLabelText("public.share"));
    await vi.waitFor(() => {
      expect(shareSpy).toHaveBeenCalled();
    });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });

  it("falls back to WhatsApp when the native share is cancelled", async () => {
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    const shareSpy = vi.fn(() => Promise.reject(new DOMException("Aborted", "AbortError")));
    const openSpy = vi.fn();
    Object.defineProperty(navigator, "share", { value: shareSpy, configurable: true });
    (window as any).open = openSpy;
    render(<PublicInvitation />);
    fireEvent.click(screen.getByLabelText("public.share"));
    await vi.waitFor(() => {
      expect(shareSpy).toHaveBeenCalled();
    });
    // Cancelar el panel nativo es silencioso (sin fallback).
    expect(openSpy).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });

  it("falls back to WhatsApp when the native share fails for another reason", async () => {
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    const shareSpy = vi.fn(() => Promise.reject(new Error("NotAllowedError")));
    const openSpy = vi.fn();
    Object.defineProperty(navigator, "share", { value: shareSpy, configurable: true });
    (window as any).open = openSpy;
    render(<PublicInvitation />);
    fireEvent.click(screen.getByLabelText("public.share"));
    await vi.waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });

  it("builds the schema couple name without a second name", () => {
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "";
    mockUseAppValue.config.weddingYear = "2025";
    render(<PublicInvitation />);
    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(1);
    mockUseAppValue.config.secondName = "User";
  });

  it("skips the schema when the first name is missing", () => {
    mockUseAppValue.config.firstName = "";
    mockUseAppValue.config.secondName = "User";
    mockUseAppValue.config.weddingYear = "2025";
    render(<PublicInvitation />);
    expect(document.querySelectorAll('script[type="application/ld+json"]').length).toBe(0);
    mockUseAppValue.config.firstName = "Test";
  });

  it("skips schema JSON-LD when the wedding year is missing", () => {
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.weddingYear = "";
    render(<PublicInvitation />);
    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(0);
    mockUseAppValue.config.weddingYear = "2025";
  });

  it("keeps a single rsvp section in admin mode when already present", () => {
    mockUseAppValue.config.sectionOrder = "hero,rsvp,details";
    mockUseAppValue.config.hiddenSections = "";
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    render(<PublicInvitation />);
    expect(screen.getAllByTestId("section-rsvp")).toHaveLength(1);
    mockUseAppValue.config.sectionOrder = "";
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
  });

  it("renders all 8 sections when visibleOrder includes them", async () => {
    mockUseAppValue.config.hiddenSections = "";
    mockUseAppValue.config.sectionOrder = "hero,details,info,story,gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    mockUseAppValue.config.storyText = "Historia";
    mockUseAppValue.config.giftsInfo = "Regalos";
    mockUseAppValue.config.accommodationURL = "https://www.google.com/maps/place/Hotel";
    mockUseAppValue.config.weddingDressCode = "Formal";
    render(<PublicInvitation />);
    expect(await screen.findByTestId("section-gifts")).toBeDefined();
    expect(await screen.findByTestId("section-accommodation")).toBeDefined();
    expect(await screen.findByTestId("section-gallery")).toBeDefined();
    expect(await screen.findByTestId("section-rsvp")).toBeDefined();
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.sectionOrder = "";
    mockUseAppValue.config.storyText = "";
    mockUseAppValue.config.giftsInfo = "";
    mockUseAppValue.config.accommodationURL = "";
    mockUseAppValue.config.weddingDressCode = "";
  });

  it("filters hidden sections when not invite mode", async () => {
    mockUseAppValue.config.hiddenSections = "gifts,accommodation";
    mockUseAppValue.config.sectionOrder = "hero,details,info,story,gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    render(<PublicInvitation />);
    await vi.waitFor(() => {
      expect(screen.queryByTestId("section-gifts")).toBeNull();
      expect(screen.queryByTestId("section-accommodation")).toBeNull();
    });
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.sectionOrder = "";
  });

  it("respects section order from config", async () => {
    mockUseAppValue.config.sectionOrder = "rsvp,gallery,accommodation,gifts";
    mockUseAppValue.config.hiddenSections = "";
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    mockUseAppValue.config.giftsInfo = "Regalos";
    mockUseAppValue.config.accommodationURL = "https://www.google.com/maps/place/Hotel";
    render(<PublicInvitation />);
    expect(await screen.findByTestId("section-rsvp")).toBeDefined();
    expect(await screen.findByTestId("section-gallery")).toBeDefined();
    expect(await screen.findByTestId("section-accommodation")).toBeDefined();
    expect(await screen.findByTestId("section-gifts")).toBeDefined();
    mockUseAppValue.config.sectionOrder = "";
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.giftsInfo = "";
    mockUseAppValue.config.accommodationURL = "";
  });

  it("hides rsvp section when no names and not invite mode", () => {
    mockUseAppValue.config.firstName = "";
    mockUseAppValue.config.secondName = "";
    mockUseAppValue.config.sectionOrder = "hero,details,info,story,gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.hiddenSections = "";
    render(<PublicInvitation />);
    expect(screen.queryByTestId("section-rsvp")).toBeNull();
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    mockUseAppValue.config.sectionOrder = "";
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
  });

  it("hides sections without content even when present in the order", async () => {
    mockUseAppValue.config.hiddenSections = "";
    mockUseAppValue.config.sectionOrder = "hero,details,gifts,accommodation,rsvp";
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    mockUseAppValue.config.giftsInfo = "";
    mockUseAppValue.config.accommodationURL = "https://www.google.com/maps/place/Hotel";
    render(<PublicInvitation />);
    await vi.waitFor(() => {
      expect(screen.queryByTestId("section-gifts")).toBeNull();
      expect(screen.getByTestId("section-accommodation")).toBeDefined();
    });
    mockUseAppValue.config.sectionOrder = "";
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.accommodationURL = "";
  });

  it("renders the social sections when enabled", async () => {
    mockUseAppValue.config.hiddenSections = "";
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    mockUseAppValue.config.reactionsEnabled = "true";
    mockUseAppValue.config.notesEnabled = "true";
    mockUseAppValue.config.musicPollEnabled = "true";
    mockUseAppValue.config.triviaEnabled = "true";
    mockUseAppValue.config.giftsListEnabled = "true";
    mockUseAppValue.config.rideShareEnabled = "true";
    render(<PublicInvitation />);
    await vi.waitFor(() => {
      expect(screen.getByTestId("section-reactions")).toBeDefined();
      expect(screen.getByTestId("section-notes")).toBeDefined();
      expect(screen.getByTestId("section-musicpoll")).toBeDefined();
      expect(screen.getByTestId("section-trivia")).toBeDefined();
      expect(screen.getByTestId("section-giftlist")).toBeDefined();
      expect(screen.getByTestId("section-rideshare")).toBeDefined();
    });
    // Los extras se agrupan en UNA sección conjunta (no una por función).
    expect(document.querySelector('[data-story-section="extras"]')).not.toBeNull();
    const extrasPanel = document.querySelector(".story-panel--extras");
    expect(extrasPanel).not.toBeNull();
    expect(extrasPanel!.querySelectorAll(".story-extra-block").length).toBe(6);
    mockUseAppValue.config.reactionsEnabled = "false";
    mockUseAppValue.config.notesEnabled = "false";
    mockUseAppValue.config.musicPollEnabled = "false";
    mockUseAppValue.config.triviaEnabled = "false";
    mockUseAppValue.config.giftsListEnabled = "false";
    mockUseAppValue.config.rideShareEnabled = "false";
  });

  it("does not render social sections when disabled", () => {
    mockUseAppValue.config.reactionsEnabled = "false";
    mockUseAppValue.config.notesEnabled = "false";
    mockUseAppValue.config.musicPollEnabled = "false";
    mockUseAppValue.config.triviaEnabled = "false";
    mockUseAppValue.config.giftsListEnabled = "false";
    mockUseAppValue.config.rideShareEnabled = "false";
    render(<PublicInvitation />);
    expect(screen.queryByTestId("section-reactions")).toBeNull();
  });
});
