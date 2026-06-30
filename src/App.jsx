import { useEffect, useState } from "react";

const APP_CONFIG_KEY = "weddingAppConfig";
const ADMIN_PASSWORD_KEY = "weddingAdminPassword";
const ADMIN_INITIAL_PASSWORD_KEY = "weddingAdminInitialPassword";
const ADMIN_SETUP_COMPLETE_KEY = "weddingAdminSetupComplete";
const MONTH_OPTIONS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const defaultConfig = {
  firstName: "Antonio",
  secondName: "Jose",
  inviteMessage: "Nos encantaría compartir este día tan especial contigo.",
  weddingDay: "12",
  weddingMonth: "septiembre",
  weddingYear: "2027",
};

const emptySetupConfig = {
  firstName: "",
  secondName: "",
  inviteMessage: "",
  weddingDay: "",
  weddingMonth: "",
  weddingYear: "",
};

const parseLegacyCoupleNames = (coupleNames) => {
  if (typeof coupleNames !== "string") {
    return { firstName: "", secondName: "" };
  }

  const [leftName = "", rightName = ""] = coupleNames.split("&").map((part) => part.trim());
  return {
    firstName: leftName.slice(0, 10),
    secondName: rightName.slice(0, 10),
  };
};

const parseLegacyWeddingDate = (weddingDate) => {
  if (typeof weddingDate !== "string") {
    return { weddingDay: "", weddingMonth: "", weddingYear: "" };
  }

  const match = weddingDate.trim().match(/^(\d{1,2})\s+de\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+)\s+de\s+(\d{4})$/i);
  if (!match) {
    return { weddingDay: "", weddingMonth: "", weddingYear: "" };
  }

  const parsedMonth = match[2].toLowerCase();
  return {
    weddingDay: match[1],
    weddingMonth: MONTH_OPTIONS.includes(parsedMonth) ? parsedMonth : "",
    weddingYear: match[3],
  };
};

const normalizeConfig = (rawConfig = {}) => {
  const legacyDate = parseLegacyWeddingDate(rawConfig.weddingDate);
  const legacyNames = parseLegacyCoupleNames(rawConfig.coupleNames);
  return {
    firstName: typeof rawConfig.firstName === "string" ? rawConfig.firstName.slice(0, 10) : legacyNames.firstName,
    secondName: typeof rawConfig.secondName === "string" ? rawConfig.secondName.slice(0, 10) : legacyNames.secondName,
    inviteMessage: typeof rawConfig.inviteMessage === "string" ? rawConfig.inviteMessage : "",
    weddingDay: typeof rawConfig.weddingDay === "string" ? rawConfig.weddingDay : legacyDate.weddingDay,
    weddingMonth: typeof rawConfig.weddingMonth === "string" ? rawConfig.weddingMonth : legacyDate.weddingMonth,
    weddingYear: typeof rawConfig.weddingYear === "string" ? rawConfig.weddingYear : legacyDate.weddingYear,
  };
};

export default function App() {
  const currentYear = new Date().getFullYear();
  const maxAllowedYear = currentYear + 5;
  const [isReady, setIsReady] = useState(false);
  const [slideOffset, setSlideOffset] = useState({ x: 0, y: 0 });
  const [isAdminView, setIsAdminView] = useState(false);
  const [isSetupRoute, setIsSetupRoute] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [config, setConfig] = useState(emptySetupConfig);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [initialPasswordHint, setInitialPasswordHint] = useState("");
  const [localResetPasswordHint, setLocalResetPasswordHint] = useState("");

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
        setHasStoredConfig(true);
      } catch {
        setConfig(emptySetupConfig);
        setHasStoredConfig(false);
      }
      return;
    }

    setConfig(emptySetupConfig);
    setHasStoredConfig(false);
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
      setSaveError("");
      setAuthError("");
      setLocalResetPasswordHint("");
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

  const handleLocalPasswordReset = () => {
    const shouldReset = window.confirm(
      "Se generara una nueva contrasena local para este dispositivo. Quieres continuar?"
    );

    if (!shouldReset) {
      return;
    }

    const generated = generateRandomPassword();
    localStorage.setItem(ADMIN_PASSWORD_KEY, generated);
    localStorage.removeItem(ADMIN_INITIAL_PASSWORD_KEY);
    setInitialPasswordHint("");
    setAdminPasswordInput("");
    setAuthError("");
    setLocalResetPasswordHint(generated);
  };

  const updateField = (field, value) => {
    setConfig((current) => ({ ...current, [field]: value }));
  };

  const handleDayChange = (value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateField("weddingDay", "");
      return;
    }

    const clampedDay = Math.min(31, Math.max(1, Number.parseInt(digits, 10)));
    updateField("weddingDay", String(clampedDay));
  };

  const handleYearChange = (value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 4);
    if (!digits) {
      updateField("weddingYear", "");
      return;
    }

    const yearNumber = Number.parseInt(digits, 10);
    if (digits.length === 4 && yearNumber > maxAllowedYear) {
      updateField("weddingYear", String(maxAllowedYear));
      return;
    }

    updateField("weddingYear", digits);
  };

  const handleNameChange = (field, value) => {
    updateField(field, value.slice(0, 10));
  };

  const getFormattedWeddingDate = () => {
    const day = config.weddingDay.trim();
    const month = config.weddingMonth.trim();
    const year = config.weddingYear.trim();
    if (!day || !month || !year) return "";
    return `${day} de ${month} de ${year}`;
  };

  const handleSaveSetup = (event) => {
    event.preventDefault();
    setSaveError("");

    const dayValue = Number.parseInt(config.weddingDay.trim(), 10);
    const yearValue = Number.parseInt(config.weddingYear.trim(), 10);

    if (!config.firstName.trim() || !config.secondName.trim()) {
      setSaveError("Debes indicar ambos nombres principales.");
      return;
    }

    if (Number.isNaN(dayValue) || dayValue < 1 || dayValue > 31) {
      setSaveError("El dia debe estar entre 1 y 31.");
      return;
    }

    if (Number.isNaN(yearValue) || yearValue > maxAllowedYear) {
      setSaveError(`El ano no puede ser mayor a ${maxAllowedYear}.`);
      return;
    }

    const configToStore = {
      firstName: config.firstName.trim(),
      secondName: config.secondName.trim(),
      inviteMessage: config.inviteMessage.trim(),
      weddingDay: config.weddingDay.trim(),
      weddingMonth: config.weddingMonth.trim(),
      weddingYear: config.weddingYear.trim(),
    };
    localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(configToStore));
    setConfig(configToStore);
    setHasStoredConfig(true);
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
            <button
              type="button"
              className="setup-button setup-button--ghost"
              onClick={handleLocalPasswordReset}
            >
              Reset local de contrasena
            </button>
          </form>
          {localResetPasswordHint ? (
            <p className="setup-help">Nueva contrasena local: {localResetPasswordHint}</p>
          ) : null}
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
            <label className="setup-label" htmlFor="firstName">Nombre principal 1</label>
            <input
              id="firstName"
              className="setup-input allow-select"
              value={config.firstName}
              onChange={(event) => handleNameChange("firstName", event.target.value)}
              maxLength={10}
            />

            <label className="setup-label" htmlFor="secondName">Nombre principal 2</label>
            <input
              id="secondName"
              className="setup-input allow-select"
              value={config.secondName}
              onChange={(event) => handleNameChange("secondName", event.target.value)}
              maxLength={10}
            />

            <label className="setup-label" htmlFor="inviteMessage">Mensaje</label>
            <textarea
              id="inviteMessage"
              className="setup-textarea allow-select"
              value={config.inviteMessage}
              onChange={(event) => updateField("inviteMessage", event.target.value)}
              rows={3}
            />

            <label className="setup-label">Fecha</label>
            <div className="setup-date-grid">
              <input
                id="weddingDay"
                className="setup-input allow-select"
                value={config.weddingDay}
                onChange={(event) => handleDayChange(event.target.value)}
                placeholder="Dia"
                inputMode="numeric"
                min="1"
                max="31"
              />
              <select
                id="weddingMonth"
                className="setup-input allow-select"
                value={config.weddingMonth}
                onChange={(event) => updateField("weddingMonth", event.target.value)}
              >
                <option value="">Mes</option>
                {MONTH_OPTIONS.map((month) => (
                  <option key={month} value={month}>
                    {month.charAt(0).toUpperCase() + month.slice(1)}
                  </option>
                ))}
              </select>
              <input
                id="weddingYear"
                className="setup-input allow-select"
                value={config.weddingYear}
                onChange={(event) => handleYearChange(event.target.value)}
                placeholder="Ano"
                inputMode="numeric"
                min="1"
                max={maxAllowedYear}
              />
            </div>

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
                  setConfig(emptySetupConfig);
                  setHasStoredConfig(false);
                  setSaveMessage("Configuracion eliminada. Sin datos guardados.");
                }}
              >
                Restablecer
              </button>
            </div>
            {saveError ? <p className="setup-error">{saveError}</p> : null}
            {saveMessage ? <p className="setup-success">{saveMessage}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  if (!hasStoredConfig) {
    return (
      <main className="setup-layout allow-select">
        <section className="setup-card animate-card-reveal allow-select">
          <p className="setup-eyebrow">Estado inicial</p>
          <h1 className="setup-title">No existen datos guardados</h1>
          <p className="setup-subtitle">
            Esta invitacion aun no tiene configuracion. Pulsa Aceptar para continuar al setup.
          </p>
          <div className="setup-actions">
            <button
              type="button"
              className="setup-button"
              onClick={() => {
                window.location.hash = "#setup";
              }}
            >
              Aceptar
            </button>
          </div>
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
          {`${config.firstName} & ${config.secondName}`}
        </h1>
        <p className={`mt-3 text-[clamp(0.95rem,2.8vw,1.25rem)] leading-relaxed text-boda-texto/80 sm:mt-4 sm:text-[clamp(1rem,2.5vw,1.35rem)] ${
          isReady ? "animate-item-up delay-220" : "opacity-0"
        }`}>
          {config.inviteMessage}
        </p>
        <p className={`mt-2 text-[clamp(0.95rem,2.8vw,1.2rem)] leading-relaxed text-boda-texto/80 sm:mt-3 sm:text-[clamp(1rem,2.4vw,1.3rem)] ${
          isReady ? "animate-item-up delay-300" : "opacity-0"
        }`}>
          {getFormattedWeddingDate()}
        </p>
      </div>
    </div>
  );
}