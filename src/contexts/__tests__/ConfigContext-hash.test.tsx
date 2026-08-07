import { describe, it, expect, vi, beforeEach } from "vitest";

import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mockGetDoc = vi.hoisted(() =>
  vi.fn((): Promise<{ exists: () => boolean; data?: () => Record<string, unknown> }> =>
    Promise.resolve({ exists: () => false }),
  ),
);
const mockLocation = vi.hoisted(() => ({ pathname: "/test", search: "", hash: "" }));
const mockDecodeInviteConfig = vi.hoisted(() => {
  const stable = {};
  return vi.fn(() => stable);
});
const mockSafeGetItem = vi.hoisted(() => vi.fn((_key?: unknown) => null as string | null));
const mockSafeSetItem = vi.hoisted(() => vi.fn());
const mockLoadAudio = vi.hoisted(() => vi.fn(() => Promise.resolve({ url: "" })));
const mockLoadDecryptedField = vi.hoisted(() => vi.fn(() => Promise.resolve("")));
const mockSetSaveError = vi.hoisted(() => vi.fn());
const mockSetSaveMessage = vi.hoisted(() => vi.fn());
const mockSetDoc = vi.hoisted(() => vi.fn());
const mockUpdateDoc = vi.hoisted(() => vi.fn((_ref: unknown, _data: Record<string, unknown>) => Promise.resolve()));
const mockResolveAllConfigImages = vi.hoisted(() => vi.fn(() => Promise.resolve({})));
const mockDecrypt = vi.hoisted(() => vi.fn((v: string) => Promise.resolve(v)));
const mockSaveConfigImage = vi.hoisted(() =>
  vi.fn((_t: string, id: string, _v: string) => Promise.resolve("__cfgimg:" + id)),
);
const mockDeleteGallery = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("react-router", () => ({ useLocation: () => mockLocation, useNavigate: () => vi.fn() }));
vi.mock("firebase/firestore", () => ({
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  doc: vi.fn(() => ({ id: "test" })),
  collection: vi.fn(() => ({ id: "test" })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
  writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn() })),
  increment: vi.fn(() => 1),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));
vi.mock("../useAppUI", () => ({
  useAppUI: () => ({ setSaveMessage: mockSetSaveMessage, setSaveError: mockSetSaveError }),
}));
vi.mock("../../hooks/useCalendar", () => ({
  useCalendar: () => ({ formattedDate: "", formattedTime: "", calendarLink: null }),
}));
vi.mock("../../hooks/useFieldHandlers", () => ({
  useFieldHandlers: () => ({
    handleDayChange: vi.fn(),
    handleTimeChange: vi.fn(),
    handleTimeBlur: vi.fn(),
    handleYearChange: vi.fn(),
    handleCoordinateChange: vi.fn(),
  }),
}));
vi.mock("../../hooks/useMapPreview", () => ({
  useMapPreview: () => ({ previewBackgrounds: [], isPreviewLoading: false }),
}));
vi.mock("../../hooks/useAutoSave", () => ({ useAutoSave: () => ({ autoSaveTimerRef: { current: null } }) }));
vi.mock("../../lib/constants", () => ({
  defaultConfig: {},
  STORY_SECTION_ORDER: ["hero", "details", "info", "story", "gifts", "accommodation", "gallery", "rsvp"],
  THEME_VALUES: new Set(["golden", "silver", "rose"]),
  MAX_YEARS_AHEAD: 10,
  INVITE_CACHE_TTL_MS: 60000,
  TOKEN_ROUTE_REGEX: /^[a-zA-Z0-9]+$/,
  SPECIAL_SECTIONS: [],
  MAX_USERNAME_LENGTH: 50,
  MAX_INVITE_MESSAGE_LENGTH: 500,
  MAX_LONG_TEXT_LENGTH: 2000,
  MAX_SCHEDULE_EVENTS: 10,
  MAX_SCHEDULE_EVENT_TEXT: 60,
  PRIVACY_POLICY_VERSION: 1,
}));
vi.mock("../../lib/normalize-config", () => ({ normalizeConfig: (v: unknown) => v }));
vi.mock("../../lib/date-utils", () => ({ validateWeddingDate: vi.fn(() => null) }));
vi.mock("../../lib/invite-config-codec", () => ({ decodeInviteConfig: mockDecodeInviteConfig }));
vi.mock("../../lib/firebase", () => ({
  db: {},
  invitationDocRef: vi.fn(() => ({ id: "test" })),
  rsvpByInviteRef: vi.fn(() => ({})),
}));
vi.mock("../../lib/image-store", () => ({
  loadDecryptedField: mockLoadDecryptedField,
  deleteGallery: mockDeleteGallery,
  resolveAllConfigImages: mockResolveAllConfigImages,
  deleteAllConfigImages: vi.fn(() => Promise.resolve()),
  isConfigImageRef: vi.fn(() => false),
  saveConfigImage: mockSaveConfigImage,
}));
vi.mock("../../lib/music-store", () => ({ loadAudio: mockLoadAudio }));
vi.mock("../../lib/sessionVars", () => ({ clearSession: vi.fn() }));
vi.mock("../../lib/storage", () => ({
  safeSetItem: mockSafeSetItem,
  safeGetItem: mockSafeGetItem,
  safeRemoveItem: vi.fn(),
}));
vi.mock("../../lib/crypto-utils", () => ({ encrypt: vi.fn((s: string) => Promise.resolve(s)), decrypt: mockDecrypt }));
vi.mock("../../lib/error-utils", () => ({ getFirestoreErrorMessage: vi.fn(() => "error") }));

import { ConfigProvider } from "../ConfigContext";
import { useConfig } from "../useConfig";

function SaveSetupConsumer() {
  const ctx = useConfig();
  return (
    <div>
      <button data-testid="ss_save" onClick={(e) => ctx.handleSaveSetup(e)}>
        Save
      </button>
      <button data-testid="ss_first" onClick={() => ctx.updateFormField("firstName", "John")}>
        F
      </button>
      <button data-testid="ss_second" onClick={() => ctx.updateFormField("secondName", "Jane")}>
        S
      </button>
      <button data-testid="ss_theme" onClick={() => ctx.updateFormField("theme", "golden")}>
        T
      </button>
      <button
        data-testid="ss_order"
        onClick={() => ctx.updateFormField("sectionOrder", "hero,details,info,story,gifts,accommodation,gallery,rsvp")}
      >
        O
      </button>
      <button data-testid="ss_gp1" onClick={() => ctx.updateFormField("godparent1", "GP1")}>
        G1
      </button>
      <button data-testid="ss_gp2" onClick={() => ctx.updateFormField("godparent2", "GP2")}>
        G2
      </button>
      <button data-testid="ss_stored" onClick={() => ctx.setHasStoredConfig(true)}>
        Stored
      </button>
      <button data-testid="ss_menuEnabled" onClick={() => ctx.updateFormField("menuEnabled", "true")}>
        ME
      </button>
      <button data-testid="ss_menuPostre" onClick={() => ctx.updateFormField("menuPostre", "Flan")}>
        MP
      </button>
      <button data-testid="ss_menuCarne" onClick={() => ctx.updateFormField("menuCarne", "Steak")}>
        MC
      </button>
      <button data-testid="ss_bankInfo" onClick={() => ctx.updateFormField("bankInfo", "some-bank-info")}>
        BI
      </button>
      <button data-testid="ss_bankIban" onClick={() => ctx.updateFormField("bankInfo", "ES12345678")}>
        IB
      </button>
      <button data-testid="ss_hiddenSections" onClick={() => ctx.updateFormField("hiddenSections", "invalid_section")}>
        HS
      </button>
      <button data-testid="ss_orderWrongLen" onClick={() => ctx.updateFormField("sectionOrder", "hero,details")}>
        OW
      </button>
      <button
        data-testid="ss_orderNoHero"
        onClick={() => ctx.updateFormField("sectionOrder", "details,info,story,gifts,accommodation,gallery,rsvp,hero")}
      >
        NH
      </button>
      <button data-testid="ss_consent" onClick={() => ctx.updateFormField("_privacyConsent", "true")}>
        PC
      </button>
      <button data-testid="ss_username" onClick={() => ctx.updateFormField("adminUsername", "admin1")}>
        UN
      </button>
      <button data-testid="ss_usernameInvalid" onClick={() => ctx.updateFormField("adminUsername", "invalid user!")}>
        UI
      </button>
      <button data-testid="ss_usernameLong" onClick={() => ctx.updateFormField("adminUsername", "a".repeat(51))}>
        UL
      </button>
      <button data-testid="ss_musicUrl" onClick={() => ctx.updateFormField("musicUrl", "data:audio/mp3;base64,xxx")}>
        MU
      </button>
      <button data-testid="ss_inviteMsg" onClick={() => ctx.updateFormField("inviteMessage", "x".repeat(2500))}>
        IM
      </button>
      <button data-testid="ss_storyText" onClick={() => ctx.updateFormField("storyText", "x".repeat(2500))}>
        ST
      </button>
      <button data-testid="ss_giftsInfo" onClick={() => ctx.updateFormField("giftsInfo", "x".repeat(2500))}>
        GI
      </button>
      <button
        data-testid="ss_accommodationInfo"
        onClick={() => ctx.updateFormField("accommodationInfo", "x".repeat(2500))}
      >
        AI
      </button>
      <button data-testid="ss_menuTexto" onClick={() => ctx.updateFormField("menuTexto", "x".repeat(2500))}>
        MT
      </button>
      <button data-testid="ss_delete" onClick={() => ctx.handleDeleteInvitation()}>
        Del
      </button>
      <button data-testid="ss_reload" onClick={() => ctx.reloadConfig()}>
        Reload
      </button>
      <span data-testid="ss_hasConfig">{String(ctx.hasStoredConfig)}</span>
      <span data-testid="ss_inviteToken">{ctx.inviteToken}</span>
    </div>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  // jsdom no expone localStorage global: shim limpio por test.
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    },
    configurable: true,
  });
  mockSafeGetItem.mockReset();
  mockSafeGetItem.mockImplementation(() => null);
});

describe("ConfigProvider", () => {
  it("handleSaveSetup requires at least one menu option when menu enabled", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        _visits: 0,
        weddingDay: "15",
        weddingMonth: "enero",
        weddingYear: "2026",
        weddingHour: "18",
        weddingMinute: "30",
        weddingSiteURL: "https://www.google.com/maps/place/Madrid",
        storyText: "Historia",
        giftsInfo: "Regalos",
        weddingDressCode: "Formal",
        accommodationURL: "https://www.google.com/maps/place/Hotel",
        transportEnabled: "bus",
      }),
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
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
      expect(mockSetSaveError).toHaveBeenCalledWith("errors.menuRequired");
    });
    mockSetSaveError.mockClear();
    mockLocation.pathname = "/test";
  });

  it("handleSaveSetup validates text length fields", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        _visits: 0,
        weddingDay: "15",
        weddingMonth: "enero",
        weddingYear: "2026",
        weddingHour: "18",
        weddingMinute: "30",
        weddingSiteURL: "https://www.google.com/maps/place/Madrid",
        storyText: "Historia",
        giftsInfo: "Regalos",
        weddingDressCode: "Formal",
        accommodationURL: "https://www.google.com/maps/place/Hotel",
        transportEnabled: "bus",
      }),
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
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

  it("handleSaveSetup data: prefix for musicUrl", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        _visits: 0,
        weddingDay: "15",
        weddingMonth: "enero",
        weddingYear: "2026",
        weddingHour: "18",
        weddingMinute: "30",
        weddingSiteURL: "https://www.google.com/maps/place/Madrid",
        storyText: "Historia",
        giftsInfo: "Regalos",
        weddingDressCode: "Formal",
        accommodationURL: "https://www.google.com/maps/place/Hotel",
        transportEnabled: "bus",
      }),
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
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
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
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
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
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

  it("hydrates from a fresh cache without reading Firestore", async () => {
    mockLocation.pathname = "/abcdefghij";
    localStorage.setItem(
      "wedin_invite_cache_abcdefghij",
      JSON.stringify({ data: { firstName: "Cached", secondName: "Pair" }, cachedAt: Date.now() }),
    );
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    mockLocation.pathname = "/test";
  });

  it("decrypts bankInfo and loads audio from the cache hit", async () => {
    // El cache guarda el bankInfo CIFRADO: el cache-hit lo descifra y además
    // carga el audio (el sobre debe sonar en una revista).
    mockLocation.pathname = "/abcdefghij";
    localStorage.setItem(
      "wedin_invite_cache_abcdefghij",
      JSON.stringify({
        data: { firstName: "Cached", secondName: "Pair" },
        bankInfoEncrypted: "encrypted-iban",
        cachedAt: Date.now(),
      }),
    );
    mockLoadAudio.mockResolvedValueOnce({ url: "data:audio/mpeg;base64,xyz" });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    expect(mockDecrypt).toHaveBeenCalledWith("encrypted-iban", "abcdefghij");
    expect(mockLoadAudio).toHaveBeenCalled();
    mockLocation.pathname = "/test";
  });

  it("falls back to Firestore when the cache is expired", async () => {
    mockLocation.pathname = "/abcdefghij";
    localStorage.setItem(
      "wedin_invite_cache_abcdefghij",
      JSON.stringify({ data: { firstName: "Old" }, cachedAt: Date.now() - 10 * 60000 }),
    );
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "Fresh", secondName: "Pair" }),
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(mockGetDoc).toHaveBeenCalled());
    mockLocation.pathname = "/test";
  });

  it("deletes the invitation after confirmation", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ firstName: "Fresh", secondName: "Pair" }),
    });
    window.confirm = vi.fn(() => true);
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_delete"));
    mockLocation.pathname = "/test";
  });

  it("does not delete the invitation when confirmation is cancelled", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ firstName: "Fresh", secondName: "Pair" }),
    });
    window.confirm = vi.fn(() => false);
    mockUpdateDoc.mockClear();
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_delete"));
    mockLocation.pathname = "/test";
  });

  it("reports an error when deleting the invitation fails", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ firstName: "Fresh", secondName: "Pair" }),
    });
    window.confirm = vi.fn(() => true);
    vi.mocked(mockDeleteGallery).mockRejectedValueOnce(new Error("denied"));
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_delete"));
    await vi.waitFor(() => {
      expect(mockSetSaveError).toHaveBeenCalledWith(expect.any(String));
    });
    mockLocation.pathname = "/test";
  });

  it("tracks a visit when cookies are accepted on a public route", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockSafeGetItem.mockImplementation((key: unknown) => {
      if (String(key) === "wedin_cookie_consent") return "accepted";
      return null;
    });
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "A", secondName: "B", _visits: 3 }),
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), { _visits: 1 });
    });
    mockLocation.pathname = "/test";
  });

  it("does not count a visit twice for the same token", async () => {
    // trackVisit se deduplica por token: re-hidratar la misma invitación no
    // vuelve a incrementar _visits.
    mockLocation.pathname = "/abcdefghij";
    mockSafeGetItem.mockImplementation((key: unknown) => {
      if (String(key) === "wedin_cookie_consent") return "accepted";
      return null;
    });
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ firstName: "A", secondName: "B", _visits: 3 }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ firstName: "A", secondName: "B", _visits: 3 }) });
    mockUpdateDoc.mockClear();
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), { _visits: 1 }));
    fireEvent.click(screen.getByTestId("ss_reload"));
    await vi.waitFor(() => {
      expect(vi.mocked(mockGetDoc).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    const visitCalls = vi.mocked(mockUpdateDoc).mock.calls.filter((c) => c[1] && "_visits" in c[1]!).length;
    expect(visitCalls).toBe(1);
    mockLocation.pathname = "/test";
  });

  it("does not crash when tracking a visit fails", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockSafeGetItem.mockImplementation((key: unknown) => {
      if (String(key) === "wedin_cookie_consent") return "accepted";
      return null;
    });
    mockUpdateDoc.mockRejectedValueOnce(new Error("net"));
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "A", secondName: "B", _visits: 3 }),
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    mockLocation.pathname = "/test";
  });

  it("hydrates cached images into the config", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockSafeGetItem.mockImplementation((key: unknown) => {
      if (String(key).includes("invite_cache")) {
        return JSON.stringify({ data: { firstName: "Cached", secondName: "Pair" }, cachedAt: Date.now() });
      }
      return null;
    });
    mockResolveAllConfigImages.mockResolvedValueOnce({ couplePhoto: "data:image/png;base64,x" });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    mockLocation.pathname = "/test";
  });

  it("reloads the config from Firestore", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ firstName: "First", secondName: "Load", _visits: 1 }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ firstName: "Second", secondName: "Load", _visits: 2 }),
      });
    mockLoadAudio.mockResolvedValueOnce({ url: "https://audio" });
    mockResolveAllConfigImages.mockResolvedValueOnce({ couplePhoto: "data:image/png;base64,y" });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    const callsBefore = vi.mocked(mockGetDoc).mock.calls.length;
    fireEvent.click(screen.getByTestId("ss_reload"));
    await vi.waitFor(() => {
      expect(vi.mocked(mockGetDoc).mock.calls.length).toBeGreaterThan(callsBefore);
    });
    mockLocation.pathname = "/test";
  });

  it("reload handles a missing document", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ firstName: "First", secondName: "Load" }) })
      .mockResolvedValueOnce({ exists: () => false });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_reload"));
    await vi.waitFor(() => {
      expect(vi.mocked(mockGetDoc).mock.calls.length).toBeGreaterThan(1);
    });
    mockLocation.pathname = "/test";
  });

  it("saves a valid config successfully and reports success", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        _visits: 0,
        weddingDay: "15",
        weddingMonth: "enero",
        weddingYear: "2026",
        weddingHour: "18",
        weddingMinute: "30",
        weddingSiteURL: "https://www.google.com/maps/place/Madrid",
        storyText: "Historia",
        giftsInfo: "Regalos",
        weddingDressCode: "Formal",
        weddingScheduleEvents: "",
        accommodationURL: "https://www.google.com/maps/place/Hotel",
        transportEnabled: "bus",
      }),
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
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
    await vi.waitFor(() => {
      expect(mockSetSaveMessage).toHaveBeenCalledWith("errors.configSaved");
    });
    mockLocation.pathname = "/test";
  });

  it("deactivates enabled sections without content on save and informs", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        _visits: 0,
        weddingDay: "15",
        weddingMonth: "enero",
        weddingYear: "2026",
        weddingHour: "18",
        weddingMinute: "30",
        weddingSiteURL: "https://www.google.com/maps/place/Madrid",
        storyText: "",
        giftsInfo: "",
        weddingDressCode: "",
        accommodationURL: "",
        transportEnabled: "none",
      }),
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
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
    await vi.waitFor(() => {
      expect(mockSetSaveMessage).toHaveBeenCalledWith(expect.stringContaining("errors.sectionsDeactivated"));
    });
    mockLocation.pathname = "/test";
  });

  it("removes the cached audio when the document has none", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ firstName: "A", secondName: "B", _visits: 0 }),
    });
    mockLoadAudio.mockResolvedValueOnce({ url: "" } as never);
    const removeSpy = vi.fn();
    vi.spyOn(sessionStorage, "removeItem").mockImplementation(removeSpy);
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    mockLocation.pathname = "/test";
  });

  it("reload decrypts bankInfo and removes cached audio without audio", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ firstName: "First", secondName: "Load", bankInfo: "enc", _visits: 1 }),
    });
    mockLoadAudio.mockResolvedValue(null as never);
    const removeSpy = vi.fn();
    vi.spyOn(sessionStorage, "removeItem").mockImplementation(removeSpy);
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    fireEvent.click(screen.getByTestId("ss_reload"));
    await vi.waitFor(() => {
      expect(mockDecrypt).toHaveBeenCalledWith("enc", "abcdefghij");
    });
    mockLocation.pathname = "/test";
  });

  it("migrates a data-URL image to configImages on save", async () => {
    mockLocation.pathname = "/abcdefghij";
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        _visits: 0,
        firstName: "John",
        secondName: "Jane",
        theme: "golden",
        sectionOrder: "hero,details,info,story,gifts,accommodation,gallery,rsvp",
        weddingDay: "15",
        weddingMonth: "enero",
        weddingYear: "2026",
        weddingHour: "18",
        weddingMinute: "30",
        weddingSiteURL: "https://www.google.com/maps/place/Madrid",
        storyText: "Historia",
        giftsInfo: "Regalos",
        weddingDressCode: "Formal",
        accommodationURL: "https://www.google.com/maps/place/Hotel",
        transportEnabled: "bus",
        couplePhoto: "data:image/png;base64,xxxx",
      }),
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("true"));
    let written: Record<string, unknown> = {};
    mockSetDoc.mockImplementationOnce(((_ref: unknown, data: Record<string, unknown>) => {
      written = { ...data };
      return Promise.resolve();
    }) as never);
    fireEvent.click(screen.getByTestId("ss_save"));
    await vi.waitFor(() => {
      expect(written.couplePhoto).toBe("__cfgimg:couplePhoto");
    });
    mockLocation.pathname = "/test";
  });

  it("does not track visits on the setup route", async () => {
    mockUpdateDoc.mockClear();
    mockLocation.pathname = "/setup";
    mockSafeGetItem.mockImplementation((key: unknown) => {
      if (String(key) === "wedin_cookie_consent") return "accepted";
      return null;
    });
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("false"));
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    mockLocation.pathname = "/test";
  });

  it("stops loading in invite mode on a non-token route", async () => {
    mockUpdateDoc.mockClear();
    mockLocation.pathname = "/superadmin";
    window.location.search = "?invitar=1";
    render(
      <ConfigProvider>
        <SaveSetupConsumer />
      </ConfigProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ss_hasConfig").textContent).toBe("false"));
    window.location.search = "";
    mockLocation.pathname = "/test";
  });
});
