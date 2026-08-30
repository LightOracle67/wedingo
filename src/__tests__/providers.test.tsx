/**
 * providers.test.tsx (v2.192, rama firebase-lazy) — prueba la NUEVA
 * composición de la app:
 *  - AppProvidersTree / AppProviders: árbol Config>Auth>Rsvp>AppMerger tal
 *    como se monta por ruta en App.tsx.
 *  - InviteChrome: barra del admin, reproductor de música, título de pestaña
 *    y señales al shell (chrome-store: footer/admin) SIN Firebase real: los
 *    contextos se proveen con stubs tipados.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ConfigContext, type ConfigContextValue, useOptionalInviteToken } from "../contexts/useConfig";
import { FormStoreContext, createFormStore } from "../contexts/FormStore";
import { AuthContext, type AuthValue } from "../contexts/useAuth";
import { InviteChrome } from "../providers";
import { getFooterVisible, getAdminMode } from "../lib/chrome-store";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es" } }),
}));

function buildConfig(overrides: Record<string, unknown> = {}): ConfigContextValue {
  return {
    config: {
      firstName: "Ana",
      secondName: "Luis",
      adminUsername: "adrian",
      theme: "silver",
      ...overrides,
    } as unknown as ConfigContextValue["config"],
    hasStoredConfig: true,
    isConfigLoading: false,
    configLoadError: "",
    inviteToken: "abc123",
    maxAllowedYear: 2099,
    formattedDate: "",
    formattedTime: "",
    calendarLink: null,
    visitCount: 1,
    reloadConfig: vi.fn(async () => undefined),
    handleSaveSetup: vi.fn(async () => undefined),
    handleDayChange: vi.fn(),
    handleTimeChange: vi.fn(),
    handleTimeBlur: vi.fn(),
    handleYearChange: vi.fn(),
    handleResetForm: vi.fn(),
    handleDeleteInvitation: vi.fn(async () => undefined),
    setHasStoredConfig: vi.fn(),
    registerOnFirstSave: vi.fn(),
    isSaving: false,
  };
}

function buildAuth(overrides: Record<string, unknown> = {}): AuthValue {
  return {
    setupToken: "",
    setupTokenInput: "",
    isTokenVerifying: false,
    isTokenVerified: false,
    tokenLoginUsername: "adrian",
    adminLoginUsername: "",
    isAdminTokenLoggedIn: false,
    isRestoringSession: false,
    sessionExpired: false,
    clearSessionExpired: vi.fn(),
    confirmTokenInput: "",
    authMessage: "",
    authMessageType: "success",
    refreshSetupToken: vi.fn(async (): Promise<string> => ""),
    generateNewToken: vi.fn(async (): Promise<string> => ""),
    handleTokenLogin: vi.fn(async () => undefined),
    handleAdminTokenLogin: vi.fn(async () => undefined),
    handleAdminLogout: vi.fn(async () => undefined),
    handleResetSetupToken: vi.fn(async () => undefined),
    handleResetTokenFromAdmin: vi.fn(async () => undefined),
    setSetupTokenInput: vi.fn(),
    setIsTokenVerified: vi.fn(),
    setTokenLoginUsername: vi.fn(),
    setAdminLoginUsername: vi.fn(),
    setConfirmTokenInput: vi.fn(),
    ...overrides,
  };
}

function renderChrome({
  config = buildConfig(),
  auth = buildAuth(),
  path = "/abc123",
}: {
  config?: ConfigContextValue;
  auth?: AuthValue;
  path?: string;
} = {}) {
  const formStore = createFormStore();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ConfigContext.Provider value={config}>
        <FormStoreContext.Provider value={formStore}>
          <AuthContext.Provider value={auth}>
            <InviteChrome />
          </AuthContext.Provider>
        </FormStoreContext.Provider>
      </ConfigContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  document.documentElement.dataset.weddingTheme = "";
});

afterEach(() => {
  cleanup();
});

describe("useOptionalInviteToken", () => {
  it("devuelve la clave con provider y '' sin provider", () => {
    // Sin provider: no lanza, devuelve "".
    const { result: bare } = renderHook(() => useOptionalInviteToken());
    expect(bare.current).toBe("");
    // Con provider real: devuelve la clave de la invitación.
    const { result } = renderHook(
      () => useOptionalInviteToken(),
      {
        wrapper: ({ children }) => (
          <ConfigContext.Provider value={buildConfig()}>{children}</ConfigContext.Provider>
        ),
      },
    );
    expect(result.current).toBe("abc123");
  });
});

describe("InviteChrome", () => {
  it("muestra la barra del admin con sesión y la oculta en /setup", () => {
    renderChrome({
      path: "/abc123",
      auth: buildAuth({ isAdminTokenLoggedIn: true }),
    });
    expect(screen.getByText("admin.tabs.invitation")).toBeDefined();
    expect(screen.getByText("admin.tabs.panel")).toBeDefined();
    cleanup();

    renderChrome({
      path: "/abc123/setup",
      auth: buildAuth({ isAdminTokenLoggedIn: true }),
    });
    expect(screen.queryByText("admin.tabs.invitation")).toBeNull();
  });

  it("el título y el tema siguen a la ruta (efectos de documento)", async () => {
    renderChrome({
      path: "/abc123/admin",
      auth: buildAuth({ isAdminTokenLoggedIn: true }),
    });
    await waitFor(() => expect(document.title).toBe("app.titleAdmin"));
    expect(document.documentElement.dataset.weddingTheme).toBe("golden"); // editing
  });

  it("tema personalizado del invitado en la ruta pública", async () => {
    renderChrome({ path: "/abc123", config: buildConfig({ theme: "rose" }) });
    await waitFor(() => expect(document.documentElement.dataset.weddingTheme).toBe("rose"));
  });

  it("avisa al shell (chrome-store) para ocultar footer y activar modo admin", async () => {
    renderChrome({ auth: buildAuth({ isAdminTokenLoggedIn: true }) });
    await waitFor(() => {
      expect(getFooterVisible()).toBe(false);
      expect(getAdminMode()).toBe(true);
    });
    cleanup();
    // Al desmontar se restauran los valores por defecto.
    await waitFor(() => {
      expect(getFooterVisible()).toBe(true);
      expect(getAdminMode()).toBe(false);
    });
  });

  it("footer visible para el invitado normal", () => {
    renderChrome();
    expect(getFooterVisible()).toBe(true);
    expect(getAdminMode()).toBe(false);
  });

  it("renderiza el reproductor de música cuando hay musicFile en la ruta exacta", async () => {
    renderChrome({
      config: buildConfig({ musicFile: "song.mp3" }),
    });
    await waitFor(() => expect(document.querySelector(".music-player")).not.toBeNull());
  });

  it("sin musicFile no hay reproductor", () => {
    renderChrome();
    expect(document.querySelector(".music-player")).toBeNull();
  });
});
