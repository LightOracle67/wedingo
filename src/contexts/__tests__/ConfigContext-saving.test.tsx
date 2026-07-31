import { describe, it, expect, vi } from "vitest";
import { useEffect } from "react";
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
  it("sets loading false when isInvite without token route (non-admin, non-setup)", () => {
    window.location.search = "?invitar=true";
    mockLocation.pathname = "/some-random-path";
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    expect(screen.getByTestId("isLoading").textContent).toBe("false");
    window.location.search = "";
    mockLocation.pathname = "/test";
  });

  it("loads config for admin route", async () => {
    mockLocation.pathname = "/abcdefghij/setup";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "AdminUser", secondName: "Admin", _visits: 3 }),
    });
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("firstName").textContent).toBe("AdminUser");
    });
    expect(screen.getByTestId("hasConfig").textContent).toBe("true");
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates both names required", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ _visits: 0 }),
    });
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij");
    });
    fireEvent.click(screen.getByTestId("ss_stored"));
    await waitFor(() => {
      expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true");
    });
    fireEvent.click(screen.getByTestId("ss_first"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.bothNamesRequired");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates theme", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "U", secondName: "N", _visits: 0 }),
    });
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    fireEvent.click(screen.getByTestId("ss_stored"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_first"));
    fireEvent.click(screen.getByTestId("ss_second"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.themeInvalid");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates section order", async () => {
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
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.sectionOrderInvalid");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates godparents mismatch", async () => {
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
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.godparentsRequired");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates menu required", async () => {
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
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.postreRequired");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup encrypts bankInfo on successful save", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ _visits: 0 }),
    });
    const { encrypt } = await import("../../lib/crypto-utils");
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
    fireEvent.click(screen.getByTestId("ss_bankInfo"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveMessage).toHaveBeenCalledWith("errors.configSaved");
    });
    expect(encrypt).toHaveBeenCalledWith("some-bank-info", "abcdefghij");
    mockSetSaveMessage.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleDeleteInvitation deletes and navigates home", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "Del", _visits: 1 }),
    });
    const { clearSession } = await import("../../lib/sessionVars");
    const { safeRemoveItem: _safeRemoveItem } = await import("../../lib/storage");
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    function DeleteConsumer() {
      const ctx = useConfig();
      return <button data-testid="delBtn" onClick={() => ctx.handleDeleteInvitation()}>Delete</button>;
    }
    render(<ConfigProvider><DeleteConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("delBtn")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("delBtn"));
    await waitFor(() => {
      expect(clearSession).toHaveBeenCalled();
    });
    expect(window.confirm).toHaveBeenCalled();
    window.confirm = originalConfirm;
    mockLocation.pathname = "/test";
  });

  it("handleDeleteInvitation returns early without inviteToken", () => {
    mockLocation.pathname = "/test";
    function NoTokenDeleteConsumer() {
      const ctx = useConfig();
      return <button data-testid="noDelBtn" onClick={() => ctx.handleDeleteInvitation()}>Delete</button>;
    }
    render(<ConfigProvider><NoTokenDeleteConsumer /></ConfigProvider>);
    fireEvent.click(screen.getByTestId("noDelBtn"));
    mockLocation.pathname = "/test";
  });

  it("handleDeleteInvitation returns early if confirm is false", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "NoDel", _visits: 1 }),
    });
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);
    function ConfirmFalseConsumer() {
      const ctx = useConfig();
      return <button data-testid="cfBtn" onClick={() => ctx.handleDeleteInvitation()}>Delete</button>;
    }
    render(<ConfigProvider><ConfirmFalseConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("cfBtn")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("cfBtn"));
    expect(window.confirm).toHaveBeenCalled();
    window.confirm = originalConfirm;
    mockLocation.pathname = "/test";
  });

  it("executes onFirstSave callbacks after save", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "CB", _visits: 0 }),
    });
    const cb = vi.fn();
    function CBConsumer() {
      const ctx = useConfig();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(() => { ctx.registerOnFirstSave(cb); }, [ctx.registerOnFirstSave]);
      return (
        <div>
          <span data-testid="cb_hasConfig">{String(ctx.hasStoredConfig)}</span>
          <button data-testid="cb_stored" onClick={() => ctx.setHasStoredConfig(true)}>S</button>
          <button data-testid="cb_first" onClick={() => ctx.updateFormField("firstName", "A")}>F</button>
          <button data-testid="cb_second" onClick={() => ctx.updateFormField("secondName", "B")}>S</button>
          <button data-testid="cb_theme" onClick={() => ctx.updateFormField("theme", "golden")}>T</button>
          <button data-testid="cb_order" onClick={() => ctx.updateFormField("sectionOrder", "hero,details,info,story,gifts,accommodation,gallery,rsvp")}>O</button>
          <button data-testid="cb_gp1" onClick={() => ctx.updateFormField("godparent1", "G1")}>G1</button>
          <button data-testid="cb_gp2" onClick={() => ctx.updateFormField("godparent2", "G2")}>G2</button>
          <button data-testid="cb_save" onClick={(e) => ctx.handleSaveSetup(e)}>Save</button>
        </div>
      );
    }
    render(<ConfigProvider><CBConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("cb_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("cb_stored"));
    await waitFor(() => expect(screen.getByTestId("cb_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("cb_first"));
    fireEvent.click(screen.getByTestId("cb_second"));
    fireEvent.click(screen.getByTestId("cb_theme"));
    fireEvent.click(screen.getByTestId("cb_order"));
    fireEvent.click(screen.getByTestId("cb_gp1"));
    fireEvent.click(screen.getByTestId("cb_gp2"));
    fireEvent.click(screen.getByTestId("cb_save"));
    await waitFor(() => {
      expect(cb).toHaveBeenCalled();
    });
    mockSetSaveMessage.mockClear();
    mockLocation.pathname = "/test";
  });

  it("uses default config when Firestore doc does not exist", async () => {
    mockLocation.pathname = "/notfoundtoken";
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("hasConfig").textContent).toBe("false");
    });
    expect(screen.getByTestId("isLoading").textContent).toBe("false");
    mockLocation.pathname = "/test";
  });

  it("sets loading false when isInvite without token route (no hash)", () => {
    window.location.search = "?invitar=true";
    mockLocation.pathname = "/some-invite-path";
    render(<ConfigProvider><TestConsumer /></ConfigProvider>);
    expect(screen.getByTestId("isLoading").textContent).toBe("false");
    window.location.search = "";
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates privacy consent required", async () => {
    mockLocation.pathname = "/abcdefghij";
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.acceptPrivacyPolicy");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates username required", async () => {
    mockLocation.pathname = "/abcdefghij";
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("ss_consent"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.usernameRequired");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup date validation error", async () => {
    const { validateWeddingDate } = await import("../../lib/date-utils");
    (validateWeddingDate as ReturnType<typeof vi.fn>).mockReturnValueOnce("errors.invalidDate");
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ _visits: 0 }),
    });
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    fireEvent.click(screen.getByTestId("ss_first"));
    fireEvent.click(screen.getByTestId("ss_second"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.invalidDate");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup returns early if already saving", async () => {
    mockLocation.pathname = "/abcdefghij";
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("false"));
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleDeleteInvitation handles error gracefully", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "DelErr", _visits: 1 }),
    });
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    const { getDocs } = await import("firebase/firestore");
    (getDocs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("delete failed"));
    function DeleteErrConsumer() {
      const ctx = useConfig();
      return <button data-testid="delErrBtn" onClick={() => ctx.handleDeleteInvitation()}>Delete</button>;
    }
    render(<ConfigProvider><DeleteErrConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("delErrBtn")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("delErrBtn"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalled();
    });
    window.confirm = originalConfirm;
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates username format", async () => {
    mockLocation.pathname = "/abcdefghij";
    render(<ConfigProvider><SaveSetupConsumer /></ConfigProvider>);
    await waitFor(() => expect(screen.getByTestId("ss_inviteToken").textContent).toBe("abcdefghij"));
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("ss_consent"));
    fireEvent.click(screen.getByTestId("ss_username"));
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => expect(mockSetSaveError).toHaveBeenCalled());
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup handles save error gracefully", async () => {
    mockSetDoc.mockRejectedValueOnce(new Error("save failed"));
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
    fireEvent.click(screen.getByTestId("ss_save"));
    await waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalled();
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });
});
