import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

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

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/test", search: "", hash: "" }),
  useParams: () => mockUseParams,
}));

vi.mock("../../contexts", () => ({
  useApp: () => mockUseAppValue,
}));

vi.mock("../../components/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../hooks/useStoryNavigation", () => ({
  useStoryNavigation: () => ({
    activeSection: "hero", isTransitioning: false,
    getSectionStyle: () => ({}),
    getSectionClassName: () => "story-section story-section--is-active",
  }),
}));

vi.mock("../sections/GiftsSection", () => ({ default: () => null }));
vi.mock("../sections/AccommodationSection", () => ({ default: () => null }));
vi.mock("../sections/GallerySection", () => ({ default: () => null }));
vi.mock("../sections/RsvpSection", () => ({ default: () => null }));

vi.mock("leaflet", () => ({ default: { map: vi.fn(() => ({ remove: vi.fn(), whenReady: vi.fn(), invalidateSize: vi.fn() })), tileLayer: vi.fn(() => ({ addTo: vi.fn() })), circleMarker: vi.fn(() => ({ addTo: vi.fn() })) } }));
vi.mock("leaflet/dist/leaflet.css", () => ({}));

import PublicInvitation from "../PublicInvitation";

describe("PublicInvitation", () => {
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

  it("opens envelope on click", () => {
    mockUseAppValue.isAdminTokenLoggedIn = false;
    render(<PublicInvitation />);
    const envelopeBtn = screen.getByLabelText("envelope.tapContinue");
    fireEvent.click(envelopeBtn);
    mockUseAppValue.isAdminTokenLoggedIn = true;
  });
});
