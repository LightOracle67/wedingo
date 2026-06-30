import { useEffect, useState } from "react";

const APP_CONFIG_KEY = "weddingAppConfig";
const ADMIN_PASSWORD_KEY = "weddingAdminPassword";
const ADMIN_INITIAL_PASSWORD_KEY = "weddingAdminInitialPassword";
const ADMIN_SETUP_COMPLETE_KEY = "weddingAdminSetupComplete";

const defaultConfig = {
  coupleNames: "Antonio & Jose",
  inviteMessage: "Nos encantaría compartir este día tan especial contigo.",
  weddingDate: "12 de septiembre de 2027",
};

const normalizeConfig = (rawConfig = {}) => {
  return {
    coupleNames: rawConfig.coupleNames?.trim() || defaultConfig.coupleNames,
    inviteMessage: rawConfig.inviteMessage?.trim() || defaultConfig.inviteMessage,
    weddingDate: rawConfig.weddingDate?.trim() || defaultConfig.weddingDate,
  };
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [slideOffset, setSlideOffset] = useState({ x: 0, y: 0 });
  const [isAdminView, setIsAdminView] = useState(false);
  const [isSetupRoute, setIsSetupRoute] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [config, setConfig] = useState(defaultConfig);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [initialPasswordHint, setInitialPasswordHint] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
      const generated = generateRandomPassword();
      localStorage.setItem(ADMIN_PASSWORD_KEY, generated);
      localStorage.setItem(ADMIN_INITIAL_PASSWORD_KEY, generated);
      setInitialPasswordHint(generated);
      return;
    }

    const storedInitialPassword = localStorage.getItem(ADMIN_INITIAL_PASSWORD_KEY) || "";
    setInitialPasswordHint(storedInitialPassword);
  }, []);

  useEffect(() => {
    const storedConfig = localStorage.getItem(APP_CONFIG_KEY);
    if (storedConfig) {
      try {
        const parsed = JSON.parse(storedConfig);
        setConfig(normalizeConfig(parsed));
      } catch {
        setConfig(defaultConfig);
      }
    }
  }, []);

  useEffect(() => {
    const syncAdminMode = () => {
      const hash = window.location.hash.toLowerCase();
      const setupFinished = localStorage.getItem(ADMIN_SETUP_COMPLETE_KEY) === "true";

      if (hash === "#setup" && setupFinished) {
        window.location.hash = "#admin";
        return;
      }

      const adminRoute = hash === "#admin" || hash === "#setup";
      setIsAdminView(adminRoute);
      setIsSetupRoute(hash === "#setup");

      if (!adminRoute) {
        setIsAdminAuthenticated(false);
      }

      setSaveMessage("");
      setAuthError("");
    };

    syncAdminMode();
    window.addEventListener("hashchange", syncAdminMode);
    return () => window.removeEventListener("hashchange", syncAdminMode);
  }, []);

  const updateSlideOffset = (clientX, clientY, currentTarget) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
    setSlideOffset({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    });
  };

  const handlePointerMove = (event) => {
    updateSlideOffset(event.clientX, event.clientY, event.currentTarget);
  };

  const handleTouchMove = (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    updateSlideOffset(touch.clientX, touch.clientY, event.currentTarget);
  };

  const resetSlideOffset = () => {
    setSlideOffset({ x: 0, y: 0 });
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!%*?&";
    const bytes = new Uint32Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => chars[value % chars.length]).join("");
  };

  const getAdminPassword = () => {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || "";
  };

  const handleAdminLogin = (event) => {
    event.preventDefault();
    if (adminPasswordInput === getAdminPassword()) {
      setIsAdminAuthenticated(true);
      setAuthError("");
      setAdminPasswordInput("");
      localStorage.removeItem(ADMIN_INITIAL_PASSWORD_KEY);
      setInitialPasswordHint("");
      return;
    }
    setAuthError("Contraseña incorrecta.");
  };

  const updateField = (field, value) => {
    setConfig((current) => ({ ...current, [field]: value }));
  };

  const handleSaveSetup = (event) => {
    event.preventDefault();
    const normalized = normalizeConfig(config);
    localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(normalized));
    setConfig(normalized);
    localStorage.setItem(ADMIN_SETUP_COMPLETE_KEY, "true");

    if (newAdminPassword.trim()) {
      localStorage.setItem(ADMIN_PASSWORD_KEY, newAdminPassword.trim());
      setNewAdminPassword("");
    }

    localStorage.removeItem(ADMIN_INITIAL_PASSWORD_KEY);
    setInitialPasswordHint("");

    if (isSetupRoute) {
      window.location.hash = "#admin";
    }

    setSaveMessage("Cambios guardados correctamente.");
  };

  if (isAdminView && !isAdminAuthenticated) {
    return (
      <main className="setup-layout allow-select">
        <section className="setup-card animate-card-reveal allow-select">
          <p className="setup-eyebrow">Admin Access</p>
          <h1 className="setup-title">Pantalla de configuracion</h1>
          <p className="setup-subtitle">Usa la contrasena de administrador para continuar.</p>
          <form className="setup-form allow-select" onSubmit={handleAdminLogin}>
            <label className="setup-label" htmlFor="adminPassword">Contrasena</label>
            <input
              id="adminPassword"
              type="password"
              className="setup-input allow-select"
              value={adminPasswordInput}
              onChange={(event) => setAdminPasswordInput(event.target.value)}
              autoComplete="current-password"
            />
            {authError ? <p className="setup-error">{authError}</p> : null}
            <button type="submit" className="setup-button">Entrar</button>
          </form>
          {isSetupRoute && initialPasswordHint ? (
            <p className="setup-help">Contrasena inicial generada: {initialPasswordHint}</p>
          ) : null}
        </section>
      </main>
    );
  }

  if (isAdminView) {
    return (
      <main className="setup-layout allow-select">
        <section className="setup-card animate-card-reveal allow-select">
          <div className="setup-header">
            <p className="setup-eyebrow">Admin Setup</p>
            <a href="#" className="setup-link">Ver sitio publico</a>
          </div>
          <h1 className="setup-title">Configuracion principal</h1>
          <p className="setup-subtitle">Estos campos actualizan el contenido de la portada en este dispositivo.</p>

          <form className="setup-form allow-select" onSubmit={handleSaveSetup}>
            <label className="setup-label" htmlFor="coupleNames">Nombres principales</label>
            <input
              id="coupleNames"
              className="setup-input allow-select"
              value={config.coupleNames}
              onChange={(event) => updateField("coupleNames", event.target.value)}
            />

            <label className="setup-label" htmlFor="inviteMessage">Mensaje</label>
            <textarea
              id="inviteMessage"
              className="setup-textarea allow-select"
              value={config.inviteMessage}
              onChange={(event) => updateField("inviteMessage", event.target.value)}
              rows={3}
            />

            <label className="setup-label" htmlFor="weddingDate">Fecha</label>
            <input
              id="weddingDate"
              className="setup-input allow-select"
              value={config.weddingDate}
              onChange={(event) => updateField("weddingDate", event.target.value)}
            />

            <label className="setup-label" htmlFor="newAdminPassword">Nueva contrasena admin (opcional)</label>
            <input
              id="newAdminPassword"
              type="password"
              className="setup-input allow-select"
              value={newAdminPassword}
              onChange={(event) => setNewAdminPassword(event.target.value)}
              autoComplete="new-password"
            />

            <div className="setup-actions">
              <button type="submit" className="setup-button">Guardar cambios</button>
              <button
                type="button"
                className="setup-button setup-button--ghost"
                onClick={() => {
                  localStorage.removeItem(APP_CONFIG_KEY);
                  setConfig(defaultConfig);
                  setSaveMessage("Configuracion restaurada a valores por defecto.");
                }}
              >
                Restablecer
              </button>
            </div>
            {saveMessage ? <p className="setup-success">{saveMessage}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-boda-fondo px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetSlideOffset}
      onTouchMove={handleTouchMove}
      onTouchEnd={resetSlideOffset}
    >
      <div
        className={`pointer-events-none absolute left-[-0.5rem] top-0 z-0 wedding-decoration wedding-decoration--left ${
          isReady ? "animate-branch-in-left" : ""
        }`}
        style={{
          transform: `translate3d(${slideOffset.x * -8}px, ${slideOffset.y * -6}px, 0) rotate(180deg)`,
        }}
      >
        <img
          src="/eucalyptus.png"
          alt="Eucalyptus branch decoration"
          className="wedding-decoration__image"
          draggable={false}
        />
      </div>
      <div
        className={`pointer-events-none absolute right-[-0.5rem] bottom-[-0.5rem] z-0 wedding-decoration wedding-decoration--right ${
          isReady ? "animate-branch-in-right" : ""
        }`}
        style={{
          transform: `translate3d(${slideOffset.x * 8}px, ${slideOffset.y * 6}px, 0)`,
        }}
      >
        <img
          src="/eucalyptus.png"
          alt="Eucalyptus branch decoration"
          className="wedding-decoration__image"
          draggable={false}
        />
      </div>

      <div
        className={`relative z-10 mx-auto w-full max-w-[min(100%,38rem)] text-center rounded-[2rem] bg-white/10 px-4 py-6 shadow-2xl backdrop-blur-xl sm:px-8 sm:py-10 lg:px-10 lg:py-12 ${
          isReady ? "animate-card-reveal" : "opacity-0"
        }`}
        style={{
          transform: `translate3d(${slideOffset.x * 12}px, ${slideOffset.y * 8}px, 0)`,
        }}
      >
        <h1 className={`inline-block bg-black px-3 py-2 text-[clamp(2rem,7vw,4.5rem)] leading-tight font-serif text-boda-texto drop-shadow-[0_0_16px_rgba(216,178,74,0.45)] sm:px-4 sm:py-3 sm:text-[clamp(2.5rem,6vw,4.75rem)] lg:text-[clamp(3rem,5vw,5.5rem)] [text-shadow:0_2px_3px_rgba(0,0,0,0.75)] ${
          isReady ? "animate-item-up delay-120" : "opacity-0"
        }`}>
          {config.coupleNames}
        </h1>
        <p className={`mt-3 text-[clamp(0.95rem,2.8vw,1.25rem)] leading-relaxed text-boda-texto/80 sm:mt-4 sm:text-[clamp(1rem,2.5vw,1.35rem)] ${
          isReady ? "animate-item-up delay-220" : "opacity-0"
        }`}>
          {config.inviteMessage}
        </p>
        <p className={`mt-2 text-[clamp(0.95rem,2.8vw,1.2rem)] leading-relaxed text-boda-texto/80 sm:mt-3 sm:text-[clamp(1rem,2.4vw,1.3rem)] ${
          isReady ? "animate-item-up delay-300" : "opacity-0"
        }`}>
          {config.weddingDate}
        </p>
      </div>
    </div>
  );
}