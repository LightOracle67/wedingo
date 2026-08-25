import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockInit = vi.hoisted(() => vi.fn());
const mockBrowserTracingIntegration = vi.hoisted(() => vi.fn(() => "tracing"));
const mockReplayIntegration = vi.hoisted(() => vi.fn(() => "replay"));
const mockClose = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));
const mockGetReplay = vi.hoisted(() => vi.fn(() => ({ stop: vi.fn() })));

vi.mock("@sentry/react", () => ({
  init: mockInit,
  browserTracingIntegration: mockBrowserTracingIntegration,
  replayIntegration: mockReplayIntegration,
  getReplay: mockGetReplay,
  close: mockClose,
}));

describe("sentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Consentimiento de analítica aceptado (Sentry se gatea por él).
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (k: string) =>
          k === "wedin_cookie_consent"
            ? "accepted"
            : k === "wedin_cookie_prefs"
              ? '{"necessary":true,"analytics":true}'
              : null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("does not init in non-production without a DSN", async () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", "");
    vi.resetModules();
    await import("../sentry");
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("does not init without analytics consent (RGPD)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    // Sin consentimiento: localStorage devuelve null.
    Object.defineProperty(globalThis, "localStorage", {
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
      configurable: true,
    });
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    await import("../sentry");
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("initializes Sentry when in production (deferred to idle)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    // requestIdleCallback disponible: se ejecuta la inicialización.
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "production",
          dsn: "https://dsn",
        }),
      );
    });
  });

  it("falls back to the load event when requestIdleCallback is unavailable", async () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    Object.defineProperty(globalThis, "requestIdleCallback", { value: undefined, configurable: true });
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    const addListener = vi.fn();
    window.addEventListener = addListener;
    vi.resetModules();
    await import("../sentry");
    expect(addListener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });
  });

  it("runs immediately when the document is complete", async () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    Object.defineProperty(globalThis, "requestIdleCallback", { value: undefined, configurable: true });
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
  });

  it("does not include replay integration outside production", async () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    expect(mockReplayIntegration).not.toHaveBeenCalled();
  });

  it("disableSentryTracking detiene el replay y cierra el cliente (GDPR art. 7.3)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    const sentry = await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    sentry.disableSentryTracking();
    await vi.waitFor(() => {
      expect(mockGetReplay).toHaveBeenCalled();
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it("enableSentryTracking solo inicializa una vez (guard)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    const idleCallback = vi.fn((cb: () => void) => {
      cb();
      return 0;
    });
    vi.stubGlobal("requestIdleCallback", idleCallback);
    vi.resetModules();
    const sentry = await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    const calls = mockInit.mock.calls.length;
    // Segundo enable: no vuelve a inicializar.
    await sentry.enableSentryTracking();
    expect(mockInit.mock.calls.length).toBe(calls);
  });

  it("beforeSend redacta URLs de request, transacción, tags y contextos", async () => {
    // Inicialización en producción para obtener las opciones reales pasadas a
    // Sentry.init (ahí viven beforeSend/beforeBreadcrumb cerradas sobre los
    // redactores). El stub de idle ejecuta el callback al instante.
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    vi.stubGlobal(
      "requestIdleCallback",
      vi.fn((cb: () => void) => {
        cb();
        return 0;
      }),
    );
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    const options = mockInit.mock.calls.at(-1)![0] as Record<string, unknown>;
    const beforeSend = options.beforeSend as (e: unknown) => unknown;

    // Evento completo con token en cada campo redactable: la ruta del
    // navegador, la transacción, un tag string y un tag numérico (coerción
    // String()), más el contexto trace con URL.
    const event = {
      request: { url: "https://wedingo-6c26a.web.app/TtCgt9n8VT" },
      transaction: "https://x.app/invitaciones/TtCgt9n8VT",
      tags: { page: "https://x.app/?invitar=TtCgt9n8VT", attempt: 5 },
      contexts: { trace: { url: "https://x.app/?t=TtCgt9n8VT" } },
    };
    const out = beforeSend(event) as typeof event;
    expect(out.request.url).toBe("https://wedingo-6c26a.web.app/[redacted]");
    expect(out.transaction).toBe("https://x.app/[redacted]/TtCgt9n8VT");
    expect(out.tags.page).toBe("https://x.app/?invitar=[redacted]");
    expect(out.tags.attempt).toBe("5"); // coerción a string sin redacción
    expect(out.contexts.trace.url).toBe("https://x.app/?t=[redacted]");

    // Evento malformado: tipos inesperados no deben romper el pipeline.
    const malformed = { transaction: 42, tags: "no-objeto", contexts: null };
    expect(beforeSend(malformed)).toBe(malformed);

    // Getter que lanza: el catch devuelte el evento tal cual (sin filtrar).
    const hostile: Record<string, unknown> = {};
    Object.defineProperty(hostile, "request", {
      get() {
        throw new Error("boom");
      },
    });
    expect(beforeSend(hostile)).toBe(hostile);
  });

  it("beforeBreadcrumb redacta data/mensaje y devuelve null si el getter lanza", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    vi.stubGlobal(
      "requestIdleCallback",
      vi.fn((cb: () => void) => {
        cb();
        return 0;
      }),
    );
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    const options = mockInit.mock.calls.at(-1)![0] as Record<string, unknown>;
    const beforeBreadcrumb = options.beforeBreadcrumb as (b: unknown) => unknown;

    // Breadcrumb con tokens en data.url, data.message y message superior.
    const crumb = {
      data: { url: "https://x.app/TtCgt9n8VT", message: "?invitar=TtCgt9n8VT" },
      message: "https://x.app/invitaciones/TtCgt9n8VT",
    };
    const out = beforeBreadcrumb(crumb) as typeof crumb;
    expect(out.data.url).toBe("https://x.app/[redacted]");
    expect(out.data.message).toBe("?invitar=[redacted]");
    expect(out.message).toBe("https://x.app/[redacted]/TtCgt9n8VT");

    // Sin data: se devuelve intacto (rama breadcrumb.data ?? {}).
    const bare = { message: "limpio" };
    expect(beforeBreadcrumb(bare)).toEqual(bare);

    // Getter hostil en data: el catch devuelve null (descarta el crumb).
    const hostile = {};
    Object.defineProperty(hostile, "data", {
      get() {
        throw new Error("boom");
      },
    });
    expect(beforeBreadcrumb(hostile)).toBeNull();
  });

  it("init en desarrollo usa rates 0 y environment development", async () => {
    // En dev Sentry solo sirve para depurar localmente: sin muestreo y con
    // etiqueta explícita de entorno para no contaminar métricas de prod.
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    vi.stubEnv("VITE_APP_VERSION", "2.125.0-test");
    vi.stubGlobal(
      "requestIdleCallback",
      vi.fn((cb: () => void) => {
        cb();
        return 0;
      }),
    );
    vi.resetModules();
    await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    const options = mockInit.mock.calls.at(-1)![0] as Record<string, number | string | boolean>;
    expect(options.tracesSampleRate).toBe(0);
    expect(options.replaysSessionSampleRate).toBe(0);
    expect(options.environment).toBe("development");
    expect(options.release).toBe("wedingo@2.125.0-test");
  });

  it("disableSentryTracking traga errores del replay y del cierre", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn");
    vi.stubGlobal(
      "requestIdleCallback",
      vi.fn((cb: () => void) => {
        cb();
        return 0;
      }),
    );
    vi.resetModules();
    const sentry = await import("../sentry");
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });

    // getReplay lanza: la retirada de consentimiento no debe propagar el error
    // (el usuario ya ha retirado el consentimiento; fallar aquí sería peor).
    mockGetReplay.mockImplementationOnce(() => {
      throw new Error("replay roto");
    });
    sentry.disableSentryTracking();
    await new Promise((r) => setTimeout(r, 0));

    // Re-inicialización en un módulo fresco para ejercitar close() rechazado.
    vi.resetModules();
    const sentry2 = await import("../sentry");
    await sentry2.enableSentryTracking();
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
    });
    mockClose.mockReturnValueOnce(Promise.reject(new Error("close roto")));
    sentry2.disableSentryTracking();
    await new Promise((r) => setTimeout(r, 0));

    // Segundo disable consecutivo: guard initialized=false → early return.
    sentry2.disableSentryTracking();
    await new Promise((r) => setTimeout(r, 0));
  });

  describe("redactSecretsFromUrl", () => {
    it("redacta el token de la ruta de invitación", async () => {
      const { redactSecretsFromUrl } = await import("../sentry");
      expect(redactSecretsFromUrl("https://wedingo-6c26a.web.app/TtCgt9n8VT")).toBe(
        "https://wedingo-6c26a.web.app/[redacted]",
      );
      expect(redactSecretsFromUrl("https://wedingo-6c26a.web.app/TtCgt9n8VT/admin")).toBe(
        "https://wedingo-6c26a.web.app/[redacted]/admin",
      );
      expect(redactSecretsFromUrl("https://wedingo-6c26a.web.app/TtCgt9n8VT/setup")).toBe(
        "https://wedingo-6c26a.web.app/[redacted]/setup",
      );
    });

    it("redacta el token en query params", async () => {
      const { redactSecretsFromUrl } = await import("../sentry");
      expect(redactSecretsFromUrl("https://x.app/?t=ABC123&lang=es")).toBe(
        "https://x.app/?t=[redacted]&lang=es",
      );
      expect(redactSecretsFromUrl("https://x.app/?invitar=TtCgt9n8VT")).toBe(
        "https://x.app/?invitar=[redacted]",
      );
    });

    it("redacta el hash y deja intactas las URLs sin datos sensibles", async () => {
      const { redactSecretsFromUrl } = await import("../sentry");
      expect(redactSecretsFromUrl("https://x.app/#someConfig"),).toBe("https://x.app/#[redacted]");
      expect(redactSecretsFromUrl("https://x.app/foo/bar")).toBe("https://x.app/foo/bar");
      expect(redactSecretsFromUrl("")).toBe("");
    });
  });
});
