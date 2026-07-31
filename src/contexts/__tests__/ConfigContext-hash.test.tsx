import { describe, it, expect, vi } from "vitest";

import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mockGetDoc = vi.hoisted(() => vi.fn((): Promise<{ exists: () => boolean; data?: () => Record<string, unknown> }> => Promise.resolve({ exists: () => false })));
const mockLocation = vi.hoisted(() => ({ pathname: "/test", search: "", hash: "" }));
const mockDecodeInviteConfig = vi.hoisted(() => {
  const stable = {};
  return vi.fn(() => stable);
});
const mockSafeGetItem = vi.hoisted(() => vi.fn(() => null));
const mockSafeSetItem = vi.hoisted(() => vi.fn());
const mockLoadAudio = vi.hoisted(() => vi.fn(() => Promise.resolve({ url: "" })));
const mockLoadDecryptedField = vi.hoisted(() => vi.fn(() => Promise.resolve("")));
const mockSetSaveError = vi.hoisted(() => vi.fn());
const mockSetSaveMessage = vi.hoisted(() => vi.fn());
const mockSetDoc = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("react-router", () => ({ useLocation: () => mockLocation, useNavigate: () => vi.fn() }));
vi.mock("firebase/firestore", () => ({ getDoc: mockGetDoc, setDoc: mockSetDoc, updateDoc: vi.fn(), doc: vi.fn(() => ({ id: "test" })), collection: vi.fn(() => ({ id: "test" })), getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })), writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn() })), increment: vi.fn(() => 1), query: vi.fn(), where: vi.fn(), serverTimestamp: vi.fn(() => new Date()) }));
vi.mock("../useAppUI", () => ({ useAppUI: () => ({ setSaveMessage: mockSetSaveMessage, setSaveError: mockSetSaveError }) }));
vi.mock("../../hooks/useCalendar", () => ({ useCalendar: () => ({ formattedDate: "", formattedTime: "", calendarLink: null }) }));
vi.mock("../../hooks/useFieldHandlers", () => ({ useFieldHandlers: () => ({ handleDayChange: vi.fn(), handleHourChange: vi.fn(), handleMinuteChange: vi.fn(), handleMinuteBlur: vi.fn(), handleYearChange: vi.fn(), handleCoordinateChange: vi.fn() }) }));
vi.mock("../../hooks/useMapPreview", () => ({ useMapPreview: () => ({ previewBackgrounds: [], isPreviewLoading: false }) }));
vi.mock("../../hooks/useAutoSave", () => ({ useAutoSave: () => ({ autoSaveTimerRef: { current: null } }) }));
vi.mock("../../lib/constants", () => ({ defaultConfig: {}, STORY_SECTION_ORDER: ["hero", "details", "info", "story", "gifts", "accommodation", "gallery", "rsvp"], THEME_VALUES: new Set(["golden", "silver", "rose"]), MAX_YEARS_AHEAD: 10, INVITE_CACHE_TTL_MS: 60000, TOKEN_ROUTE_REGEX: /^[a-zA-Z0-9]+$/, SPECIAL_SECTIONS: [], MAX_USERNAME_LENGTH: 50, MAX_INVITE_MESSAGE_LENGTH: 500, MAX_LONG_TEXT_LENGTH: 2000, PRIVACY_POLICY_VERSION: 1 }));
vi.mock("../../lib/normalize-config", () => ({ normalizeConfig: (v: unknown) => v }));
vi.mock("../../lib/date-utils", () => ({ validateWeddingDate: vi.fn(() => null) }));
vi.mock("../../lib/invite-config-codec", () => ({ decodeInviteConfig: mockDecodeInviteConfig }));
vi.mock("../../lib/firebase", () => ({ db: {}, invitationDocRef: vi.fn(() => ({ id: "test" })), rsvpByInviteRef: vi.fn(() => ({})) }));
vi.mock("../../lib/image-store", () => ({
  loadDecryptedField: mockLoadDecryptedField,
  deleteGallery: vi.fn(() => Promise.resolve()),
  resolveAllConfigImages: vi.fn(() => Promise.resolve({})),
  deleteAllConfigImages: vi.fn(() => Promise.resolve()),
  isConfigImageRef: vi.fn(() => false),
  saveConfigImage: vi.fn((_t, id, _v) => Promise.resolve("__cfgimg:" + id)),
}));
vi.mock("../../lib/music-store", () => ({ loadAudio: mockLoadAudio }));
vi.mock("../../lib/sessionVars", () => ({ clearSession: vi.fn() }));
vi.mock("../../lib/storage", () => ({ safeSetItem: mockSafeSetItem, safeGetItem: mockSafeGetItem, safeRemoveItem: vi.fn() }));
vi.mock("../../lib/crypto-utils", () => ({ encrypt: vi.fn((s: string) => Promise.resolve(s)), decrypt: vi.fn((s: string) => Promise.resolve(s)) }));
vi.mock("../../lib/error-utils", () => ({ getFirestoreErrorMessage: vi.fn(() => "error") }));

import { ConfigProvider } from "../ConfigContext";
import { useConfig } from "../useConfig";


function SaveSetupConsumer() {
  const ctx = useConfig();
  return (
    <div>
      <button data-testid="ss_save" onClick={(e) => ctx.handleSaveSetup(e)}>Save</button>
      <button data-testid="ss_first" onClick={() => ctx.updateFormField("firstName", "John")}>F</button>
      <button data-testid="ss_second" onClick={() => ctx.updateFormField("secondName", "Jane")}>S</button>
      <button data-testid="ss_theme" onClick={() => ctx.updateFormField("theme", "golden")}>T</button>
      <button data-testid="ss_order" onClick={() => ctx.updateFormField("sectionOrder", "hero,details,info,story,gifts,accommodation,gallery,rsvp")}>O</button>
      <button data-testid="ss_gp1" onClick={() => ctx.updateFormField("godparent1", "GP1")}>G1</button>
      <button data-testid="ss_gp2" onClick={() => ctx.updateFormField("godparent2", "GP2")}>G2</button>
      <button data-testid="ss_stored" onClick={() => ctx.setHasStoredConfig(true)}>Stored</button>
      <button data-testid="ss_menuEnabled" onClick={() => ctx.updateFormField("menuEnabled", "true")}>ME</button>
      <button data-testid="ss_menuPostre" onClick={() => ctx.updateFormField("menuPostre", "Flan")}>MP</button>
      <button data-testid="ss_menuCarne" onClick={() => ctx.updateFormField("menuCarne", "Steak")}>MC</button>
      <button data-testid="ss_bankInfo" onClick={() => ctx.updateFormField("bankInfo", "some-bank-info")}>BI</button>
      <button data-testid="ss_bankIban" onClick={() => ctx.updateFormField("bankInfo", "ES12345678")}>IB</button>
      <button data-testid="ss_hiddenSections" onClick={() => ctx.updateFormField("hiddenSections", "invalid_section")}>HS</button>
      <button data-testid="ss_orderWrongLen" onClick={() => ctx.updateFormField("sectionOrder", "hero,details")}>OW</button>
      <button data-testid="ss_orderNoHero" onClick={() => ctx.updateFormField("sectionOrder", "details,info,story,gifts,accommodation,gallery,rsvp,hero")}>NH</button>
      <button data-testid="ss_consent" onClick={() => ctx.updateFormField("_privacyConsent", "true")}>PC</button>
      <button data-testid="ss_username" onClick={() => ctx.updateFormField("adminUsername", "admin1")}>UN</button>
      <button data-testid="ss_usernameInvalid" onClick={() => ctx.updateFormField("adminUsername", "invalid user!")}>UI</button>
      <button data-testid="ss_usernameLong" onClick={() => ctx.updateFormField("adminUsername", "a".repeat(51))}>UL</button>
      <button data-testid="ss_musicUrl" onClick={() => ctx.updateFormField("musicUrl", "data:audio/mp3;base64,xxx")}>MU</button>
      <button data-testid="ss_inviteMsg" onClick={() => ctx.updateFormField("inviteMessage", "x".repeat(2500))}>IM</button>
      <button data-testid="ss_wedSchedule" onClick={() => ctx.updateFormField("weddingSchedule", "x".repeat(2500))}>WS</button>
      <button data-testid="ss_storyText" onClick={() => ctx.updateFormField("storyText", "x".repeat(2500))}>ST</button>
      <button data-testid="ss_giftsInfo" onClick={() => ctx.updateFormField("giftsInfo", "x".repeat(2500))}>GI</button>
      <button data-testid="ss_transportInfo" onClick={() => ctx.updateFormField("transportInfo", "x".repeat(2500))}>TI</button>
      <button data-testid="ss_accommodationInfo" onClick={() => ctx.updateFormField("accommodationInfo", "x".repeat(2500))}>AI</button>
      <button data-testid="ss_menuTexto" onClick={() => ctx.updateFormField("menuTexto", "x".repeat(2500))}>MT</button>
      <span data-testid="ss_hasConfig">{String(ctx.hasStoredConfig)}</span>
      <span data-testid="ss_inviteToken">{ctx.inviteToken}</span>
    </div>
  );
}

describe("ConfigProvider", () => {
  it("handleSaveSetup validates menu postre required", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ _visits: 0 }),
    });
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    fireEvent.click(screen.getByTestId("ss_stored"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_first"));
    fireEvent.click(screen.getByTestId("ss_second"));
    fireEvent.click(screen.getByTestId("ss_theme"));
    fireEvent.click(screen.getByTestId("ss_order"));
    fireEvent.click(screen.getByTestId("ss_gp1"));
    fireEvent.click(screen.getByTestId("ss_gp2"));
    fireEvent.click(screen.getByTestId("ss_menuEnabled"));
    fireEvent.click(screen.getByTestId("ss_menuCarne"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.postreRequired");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates text length fields", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ _visits: 0 }),
    });
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    fireEvent.click(screen.getByTestId("ss_stored"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_first"));
    fireEvent.click(screen.getByTestId("ss_second"));
    fireEvent.click(screen.getByTestId("ss_theme"));
    fireEvent.click(screen.getByTestId("ss_order"));
    fireEvent.click(screen.getByTestId("ss_gp1"));
    fireEvent.click(screen.getByTestId("ss_gp2"));
    fireEvent.click(screen.getByTestId("ss_inviteMsg"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.messageTooLong");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates wedding schedule too long", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ _visits: 0 }),
    });
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    fireEvent.click(screen.getByTestId("ss_stored"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_first"));
    fireEvent.click(screen.getByTestId("ss_second"));
    fireEvent.click(screen.getByTestId("ss_theme"));
    fireEvent.click(screen.getByTestId("ss_order"));
    fireEvent.click(screen.getByTestId("ss_gp1"));
    fireEvent.click(screen.getByTestId("ss_gp2"));
    fireEvent.click(screen.getByTestId("ss_wedSchedule"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.scheduleTooLong");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup data: prefix for musicUrl", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ _visits: 0 }),
    });
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    fireEvent.click(screen.getByTestId("ss_stored"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_first"));
    fireEvent.click(screen.getByTestId("ss_second"));
    fireEvent.click(screen.getByTestId("ss_theme"));
    fireEvent.click(screen.getByTestId("ss_order"));
    fireEvent.click(screen.getByTestId("ss_gp1"));
    fireEvent.click(screen.getByTestId("ss_gp2"));
    fireEvent.click(screen.getByTestId("ss_musicUrl"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveMessage).toHaveBeenCalledWith("errors.configSaved");
    });
    mockSetSaveMessage.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates invalid username format", async () => {
    mockLocation.pathname = "/abcdefghij";
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("ss_consent"));
    fireEvent.click(screen.getByTestId("ss_usernameInvalid"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.usernameInvalid");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates username too long", async () => {
    mockLocation.pathname = "/abcdefghij";
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("ss_consent"));
    fireEvent.click(screen.getByTestId("ss_usernameLong"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.usernameTooLong");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });
});
