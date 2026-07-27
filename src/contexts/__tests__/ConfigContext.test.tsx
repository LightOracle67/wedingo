import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockGetDoc = vi.hoisted(() => vi.fn(() => Promise.resolve({ exists: () => false })));
const mockLocation = vi.hoisted(() => ({ pathname: "/test", search: "", hash: "" }));
const mockDecodeInviteConfig = vi.hoisted(() => {
  const stable = {};
  return vi.fn(() => stable);
});
const mockSafeGetItem = vi.hoisted(() => vi.fn(() => null));
const mockSafeSetItem = vi.hoisted(() => vi.fn());
const mockTrackVisit = vi.fn();

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("react-router-dom", () => ({ useLocation: () => mockLocation, useNavigate: () => vi.fn() }));
vi.mock("firebase/firestore", () => ({ getDoc: mockGetDoc, setDoc: vi.fn(), updateDoc: vi.fn(), doc: vi.fn(() => ({ id: "test" })), collection: vi.fn(() => ({ id: "test" })), getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })), writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn() })), increment: vi.fn(() => 1), query: vi.fn(), where: vi.fn(), serverTimestamp: vi.fn(() => new Date()) }));
vi.mock("../useAppUI", () => ({ useAppUI: () => ({ setSaveMessage: vi.fn(), setSaveError: vi.fn() }) }));
vi.mock("../../hooks/useCalendar", () => ({ useCalendar: () => ({ formattedDate: "", formattedTime: "", calendarLink: null }) }));
vi.mock("../../hooks/useFieldHandlers", () => ({ useFieldHandlers: () => ({ handleDayChange: vi.fn(), handleHourChange: vi.fn(), handleMinuteChange: vi.fn(), handleMinuteBlur: vi.fn(), handleYearChange: vi.fn(), handleCoordinateChange: vi.fn() }) }));
vi.mock("../../hooks/useMapPreview", () => ({ useMapPreview: () => ({ previewBackgrounds: [], isPreviewLoading: false }) }));
vi.mock("../../hooks/useAutoSave", () => ({ useAutoSave: () => ({ autoSaveTimerRef: { current: null } }) }));
vi.mock("../../lib/constants", () => ({ defaultConfig: {}, STORY_SECTION_ORDER: ["hero", "details", "info", "story", "gifts", "accommodation", "gallery", "rsvp"], THEME_VALUES: new Set(["golden", "silver", "rose"]), MAX_YEARS_AHEAD: 10, INVITE_CACHE_TTL_MS: 60000, TOKEN_ROUTE_REGEX: /^[a-zA-Z0-9]+$/, SPECIAL_SECTIONS: [], MAX_USERNAME_LENGTH: 50, MAX_INVITE_MESSAGE_LENGTH: 500, MAX_LONG_TEXT_LENGTH: 2000, PRIVACY_POLICY_VERSION: 1 }));
vi.mock("../../lib/normalize-config", () => ({ normalizeConfig: (v: unknown) => v }));
vi.mock("../../lib/date-utils", () => ({ validateWeddingDate: vi.fn(() => null) }));
vi.mock("../../lib/invite-config-codec", () => ({ decodeInviteConfig: mockDecodeInviteConfig }));
vi.mock("../../lib/firebase", () => ({ db: {}, invitationDocRef: vi.fn(() => ({ id: "test" })), rsvpByInviteRef: vi.fn(() => ({})) }));
vi.mock("../../lib/image-store", () => ({ loadDecryptedField: vi.fn(() => Promise.resolve("")), deleteGallery: vi.fn(() => Promise.resolve()) }));
vi.mock("../../lib/music-store", () => ({ loadAudio: vi.fn(() => Promise.resolve({ url: "" })) }));
vi.mock("../../lib/sessionVars", () => ({ clearSession: vi.fn() }));
vi.mock("../../lib/storage", () => ({ safeSetItem: mockSafeSetItem, safeGetItem: mockSafeGetItem, safeRemoveItem: vi.fn() }));
vi.mock("../../lib/crypto-utils", () => ({ encrypt: vi.fn((s: string) => Promise.resolve(s)), decrypt: vi.fn((s: string) => Promise.resolve(s)) }));
vi.mock("../../lib/error-utils", () => ({ getFirestoreErrorMessage: vi.fn(() => "error") }));

import { ConfigProvider } from "../ConfigContext";
import { useConfig } from "../useConfig";

function TestConsumer() {
  const ctx = useConfig();
  return (
    <div>
      <span data-testid="hasConfig">{String(ctx.hasStoredConfig)}</span>
      <span data-testid="isLoading">{String(ctx.isConfigLoading)}</span>
      <span data-testid="configError">{ctx.configLoadError}</span>
      <span data-testid="inviteToken">{ctx.inviteToken}</span>
      <span data-testid="firstName">{ctx.config.firstName || ""}</span>
      <span data-testid="secondName">{ctx.config.secondName || ""}</span>
    </div>
  );
}

describe("ConfigProvider", () => {
  it("renders children", () => {
    render(<ConfigProvider><div>child</div></ConfigProvider>);
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("provides default config values", () => {
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    expect(screen.getByTestId("hasConfig").textContent).toBe("false");
  });

  it("loads from hash", () => {
    mockLocation.hash = "#fn=Hash";
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    expect(screen.getByTestId("hasConfig").textContent).toBe("false");
    mockLocation.hash = "";
  });

  it("detects token route and loads config", async () => {
    mockLocation.pathname = "/abcdefghij";
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("inviteToken").textContent).toBe("abcdefghij");
    });
    mockLocation.pathname = "/test";
  });

  it("loads from cache hit", async () => {
    mockLocation.pathname = "/abcdefghij";
    const cachedData = { data: { firstName: "Cached" }, cachedAt: Date.now() };
    mockSafeGetItem.mockImplementation((key: string) => {
      if (key.startsWith("wedin_invite_cache_")) return JSON.stringify(cachedData);
      return null;
    });
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("hasConfig").textContent).toBe("true");
    });
    expect(screen.getByTestId("firstName").textContent).toBe("Cached");
    mockLocation.pathname = "/test";
    mockSafeGetItem.mockReset();
    mockSafeGetItem.mockReturnValue(null);
  });

  it("loads from Firestore when doc exists", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "Firestore", secondName: "User", _visits: 5 }),
    });
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("firstName").textContent).toBe("Firestore");
    });
    expect(screen.getByTestId("hasConfig").textContent).toBe("true");
    mockLocation.pathname = "/test";
  });

  it("handles hydrateConfig error when no stored config", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockRejectedValueOnce(new Error("network error"));
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("configError").textContent).toBe("error");
    });
    mockLocation.pathname = "/test";
  });

  it("skips loading for non-admin non-token routes", () => {
    mockLocation.pathname = "/setup";
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    expect(screen.getByTestId("isLoading").textContent).toBe("false");
    mockLocation.pathname = "/test";
  });

  it("skips loading when inviteToken is empty in hydrateConfig", () => {
    window.location.search = "?invitar=true";
    mockLocation.pathname = "/admin";
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    expect(screen.getByTestId("isLoading").textContent).toBe("false");
    window.location.search = "";
    mockLocation.pathname = "/test";
  });

  it("stores config after Firestore save", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "Stored", secondName: "User", _visits: 3 }),
    });
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("firstName").textContent).toBe("Stored");
    });
    expect(screen.getByTestId("hasConfig").textContent).toBe("true");
    mockLocation.pathname = "/test";
  });

  it("uses cached data when within TTL", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockSafeGetItem.mockImplementation((key: string) => {
      if (key.startsWith("wedin_invite_cache_")) {
        return JSON.stringify({ data: { firstName: "CachedUser" }, cachedAt: Date.now() - 1000 });
      }
      return null;
    });
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("firstName").textContent).toBe("CachedUser");
    });
    expect(screen.getByTestId("hasConfig").textContent).toBe("true");
    mockLocation.pathname = "/test";
    mockSafeGetItem.mockReset();
    mockSafeGetItem.mockReturnValue(null);
  });

  it("ignores expired cache and loads from Firestore", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockSafeGetItem.mockImplementation((key: string) => {
      if (key.startsWith("wedin_invite_cache_")) {
        return JSON.stringify({ data: { firstName: "Stale" }, cachedAt: Date.now() - 120000 });
      }
      return null;
    });
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "Fresh", _visits: 0 }),
    });
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("firstName").textContent).toBe("Fresh");
    });
    mockLocation.pathname = "/test";
    mockSafeGetItem.mockReset();
    mockSafeGetItem.mockReturnValue(null);
  });

  it("handles malformed cache gracefully", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockSafeGetItem.mockImplementation((key: string) => {
      if (key.startsWith("wedin_invite_cache_")) return "not-json";
      return null;
    });
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "Fresh", _visits: 0 }),
    });
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("firstName").textContent).toBe("Fresh");
    });
    mockLocation.pathname = "/test";
    mockSafeGetItem.mockReset();
    mockSafeGetItem.mockReturnValue(null);
  });

  it("handles isInvite flag without token route", () => {
    window.location.search = "?invitar=true";
    mockLocation.pathname = "/setup";
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    expect(screen.getByTestId("isLoading").textContent).toBe("false");
    window.location.search = "";
    mockLocation.pathname = "/test";
  });

});
