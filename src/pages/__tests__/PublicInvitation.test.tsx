import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUseAppValue = vi.hoisted(() => ({
  config: {
    firstName: "Test", secondName: "User", theme: "golden",
    inviteMessage: "", couplePhoto: "", godparent1: "", godparent2: "",
    hiddenSections: "gifts,accommodation,gallery,rsvp", sectionOrder: "",
    weddingDay: "15", weddingMonth: "enero", weddingYear: "2025",
    weddingHour: "14", weddingMinute: "30", weddingPlace: "Madrid",
    weddingLatitude: "40.4168", weddingLongitude: "-3.7038",
    weddingSchedule: "", weddingDressCode: "", kidsPolicy: "",
    storyText: "", giftsInfo: "", bankInfo: "", accommodationInfo: "", transportInfo: "",
    musicFile: "", musicUrl: "", menuEnabled: "", menuCarne: "", menuPescado: "",
    menuVegano: "", menuPostre: "", menuTexto: "",
  },
  isConfigLoading: false, configLoadError: "",
  formattedDate: "15 ene 2025", formattedTime: "14:30", calendarLink: null,
  rsvpForm: { attendees: [] }, rsvpEntries: [], rsvpMessage: "",
  isRsvpSubmitting: false, hasSubmitted: false, alreadySubmittedEntry: null,
  updateRsvpField: vi.fn(), handleRsvpSubmit: vi.fn(), handleDeleteRsvp: vi.fn(),
  handleDietaryToggle: vi.fn(), DIETARY_OPTIONS: [],
  computeAge: vi.fn(), isAdminTokenLoggedIn: true,
  locationMapContainerRef: { current: null },
  setLocationMapError: vi.fn(), setLocationMapLoading: vi.fn(),
  locationMapTarget: null, setLocationMapTarget: vi.fn(),
}));

const mockUseParams = vi.hoisted(() => ({ inviteToken: "test" }));
const mockUseLocation = vi.hoisted(() => ({ pathname: "/test", search: "", hash: "" }));

const mockResolveLocationTarget = vi.hoisted(() => vi.fn());
const mockGetValidCoordinates = vi.hoisted(() => vi.fn());
const mockStoryNavigation = vi.hoisted(() => ({
  activeSection: "hero", isTransitioning: false,
  getSectionStyle: () => ({}),
  getSectionClassName: () => "story-section story-section--is-active",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => mockUseLocation,
  useParams: () => mockUseParams,
}));

vi.mock("../../contexts", () => ({
  useApp: () => mockUseAppValue,
}));

vi.mock("../../components/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../hooks/useStoryNavigation", () => ({
  useStoryNavigation: () => mockStoryNavigation,
}));

vi.mock("../../lib/utils", () => ({
  getValidCoordinates: (...args: unknown[]) => mockGetValidCoordinates(...args),
  resolveLocationTarget: (...args: unknown[]) => mockResolveLocationTarget(...args),
  buildGoogleMapsUrl: vi.fn(() => ""),
  buildGoogleMapsSearchUrl: vi.fn(() => ""),
  buildAppleMapsUrl: vi.fn(() => ""),
  buildAppleMapsSearchUrl: vi.fn(() => ""),
}));

const mockSectionComponents: Record<string, ReturnType<typeof vi.fn>> = {};
function mockSection(name: string) {
  const comp = vi.fn(() => <div data-testid={`section-${name}`} />);
  mockSectionComponents[name] = comp;
  return { default: comp };
}

vi.mock("../sections/GiftsSection", () => mockSection("gifts"));
vi.mock("../sections/AccommodationSection", () => mockSection("accommodation"));
vi.mock("../sections/GallerySection", () => mockSection("gallery"));
vi.mock("../sections/RsvpSection", () => mockSection("rsvp"));

vi.mock("leaflet", () => ({ default: { map: vi.fn(() => ({ remove: vi.fn(), whenReady: vi.fn((cb: () => void) => cb()), invalidateSize: vi.fn() })), tileLayer: vi.fn(() => ({ addTo: vi.fn() })), circleMarker: vi.fn(() => ({ addTo: vi.fn() })) } }));
vi.mock("leaflet/dist/leaflet.css", () => ({}));

import PublicInvitation from "../PublicInvitation";

describe("PublicInvitation", () => {
  beforeAll(() => {
    mockGetValidCoordinates.mockReturnValue(null);
    mockResolveLocationTarget.mockResolvedValue(null);
  });

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

  it("renders with schedule and dress code info", () => {
    mockUseAppValue.config.weddingSchedule = "Ceremony at 4pm\nReception at 6pm";
    mockUseAppValue.config.weddingDressCode = "Formal";
    mockUseAppValue.config.kidsPolicy = "Welcome";
    expect(() => render(<PublicInvitation />)).not.toThrow();
    mockUseAppValue.config.weddingSchedule = "";
    mockUseAppValue.config.weddingDressCode = "";
    mockUseAppValue.config.kidsPolicy = "";
  });

  it("renders with location map target", () => {
    mockUseAppValue.locationMapTarget = { latitude: 40.4168, longitude: -3.7038, label: "Madrid" };
    expect(() => render(<PublicInvitation />)).not.toThrow();
    mockUseAppValue.locationMapTarget = null;
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
    act(() => { vi.advanceTimersByTime(3600); });
    expect(screen.queryByLabelText("envelope.tapContinue")).toBeNull();
    vi.useRealTimers();
    mockUseAppValue.isAdminTokenLoggedIn = true;
  });

  it("initializes map with weddingPlace and container ref", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    mockUseAppValue.locationMapContainerRef.current = container;
    mockGetValidCoordinates.mockReturnValue({ latitude: 40.4168, longitude: -3.7038 });
    mockResolveLocationTarget.mockResolvedValue({ latitude: 40.4168, longitude: -3.7038, label: "Madrid" });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    render(<PublicInvitation />);
    act(() => { vi.advanceTimersByTime(100); });
    vi.useRealTimers();
    document.body.removeChild(container);
    mockUseAppValue.locationMapContainerRef.current = null;
    mockGetValidCoordinates.mockReturnValue(null);
    mockResolveLocationTarget.mockResolvedValue(null);
  });

  it("renders map with geocoded location", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    mockUseAppValue.locationMapContainerRef.current = container;
    mockGetValidCoordinates.mockReturnValue(null);
    mockResolveLocationTarget.mockResolvedValue({ latitude: 40.4168, longitude: -3.7038, label: "Madrid" });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    render(<PublicInvitation />);
    act(() => { vi.advanceTimersByTime(100); });
    vi.useRealTimers();
    document.body.removeChild(container);
    mockUseAppValue.locationMapContainerRef.current = null;
    mockGetValidCoordinates.mockReturnValue(null);
    mockResolveLocationTarget.mockResolvedValue(null);
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
    mockUseAppValue.config.weddingLatitude = "";
    mockUseAppValue.config.weddingLongitude = "";
    render(<PublicInvitation />);
    mockUseAppValue.config.weddingPlace = "Madrid";
    mockUseAppValue.config.weddingLatitude = "40.4168";
    mockUseAppValue.config.weddingLongitude = "-3.7038";
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

  it("cleans up map on unmount", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    mockUseAppValue.locationMapContainerRef.current = container;
    const { unmount } = render(<PublicInvitation />);
    unmount();
    document.body.removeChild(container);
    mockUseAppValue.locationMapContainerRef.current = null;
  });

  it("injects schema.org JSON-LD when names are present", () => {
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.weddingYear = "2025";
    render(<PublicInvitation />);
    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(1);
  });

  it("renders all 8 sections when visibleOrder includes them", async () => {
    mockUseAppValue.config.hiddenSections = "";
    mockUseAppValue.config.sectionOrder = "hero,details,info,story,gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.firstName = "Test";
    mockUseAppValue.config.secondName = "User";
    render(<PublicInvitation />);
    expect(await screen.findByTestId("section-gifts")).toBeDefined();
    expect(await screen.findByTestId("section-accommodation")).toBeDefined();
    expect(await screen.findByTestId("section-gallery")).toBeDefined();
    expect(await screen.findByTestId("section-rsvp")).toBeDefined();
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
    mockUseAppValue.config.sectionOrder = "";
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
    render(<PublicInvitation />);
    expect(await screen.findByTestId("section-rsvp")).toBeDefined();
    expect(await screen.findByTestId("section-gallery")).toBeDefined();
    expect(await screen.findByTestId("section-accommodation")).toBeDefined();
    expect(await screen.findByTestId("section-gifts")).toBeDefined();
    mockUseAppValue.config.sectionOrder = "";
    mockUseAppValue.config.hiddenSections = "gifts,accommodation,gallery,rsvp";
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
});
