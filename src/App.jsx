import eucalyptusSrc from "./assets/eucalyptus.png";
import heroBackdropSrc from "./assets/rings.png";
import { useEffect, useMemo, useState } from "react";

const APP_CONFIG_KEY = "weddingAppConfig";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
const MONTH_OPTIONS = [
  { value: "enero", label: "Enero" },
  { value: "febrero", label: "Febrero" },
  { value: "marzo", label: "Marzo" },
  { value: "abril", label: "Abril" },
  { value: "mayo", label: "Mayo" },
  { value: "junio", label: "Junio" },
  { value: "julio", label: "Julio" },
  { value: "agosto", label: "Agosto" },
  { value: "septiembre", label: "Septiembre" },
  { value: "octubre", label: "Octubre" },
  { value: "noviembre", label: "Noviembre" },
  { value: "diciembre", label: "Diciembre" },
];

const THEME_OPTIONS = [
  {
    value: "golden",
    label: "Dorado clásico",
    hint: "Elegante y luminoso, con acentos dorados.",
    group: "claros",
  },
  {
    value: "forest",
    label: "Eucalipto fresco",
    hint: "Natural y sobrio con verdes suaves.",
    group: "claros",
  },
  {
    value: "rose",
    label: "Romántico rosado",
    hint: "Cálido y delicado, con matices rosados.",
    group: "claros",
  },
  {
    value: "linen-soft",
    label: "Lino suave",
    hint: "Claro y neutro, con una presencia serena y atemporal.",
    group: "claros",
  },
  {
    value: "amber-night",
    label: "Noche ámbar",
    hint: "Oscuro y elegante, con destellos ámbar y dorados.",
    group: "oscuros",
  },
  {
    value: "onyx-gold",
    label: "Ónix dorado",
    hint: "Profundo y sofisticado, con oro intenso sobre fondo oscuro.",
    group: "oscuros",
  },
  {
    value: "midnight-royal",
    label: "Medianoche real",
    hint: "Azul muy oscuro con dorado intenso y presencia solemne.",
    group: "oscuros",
  },
];

const THEME_VALUES = new Set(THEME_OPTIONS.map((theme) => theme.value));
const THEME_GROUPS = [
  { value: "claros", label: "Temas claros" },
  { value: "oscuros", label: "Temas oscuros" },
];

const BACKGROUND_PREVIEW_OPTIONS = [
  {
    id: "roadmap",
    label: "Mapa",
    description: "Vista clara del lugar con calles y referencias.",
    mapType: "roadmap",
  },
  {
    id: "satellite",
    label: "Satélite",
    description: "Vista más visual con imagen real del entorno.",
    mapType: "satellite",
  },
  {
    id: "terrain",
    label: "Terreno",
    description: "Una lectura más suave del paisaje y accesos.",
    mapType: "terrain",
  },
];

const defaultConfig = {
  firstName: "",
  secondName: "",
  inviteMessage: "",
  weddingPlace: "",
  weddingDay: "",
  weddingMonth: "",
  weddingYear: "",
  theme: "golden",
  backgroundImage: "",
  backgroundImageLabel: "",
  backgroundImageSource: "",
};

const normalizeConfig = (value) => ({
  firstName: typeof value?.firstName === "string" ? value.firstName.trim() : "",
  secondName: typeof value?.secondName === "string" ? value.secondName.trim() : "",
  inviteMessage: typeof value?.inviteMessage === "string" ? value.inviteMessage.trim() : "",
  weddingPlace: typeof value?.weddingPlace === "string" ? value.weddingPlace.trim() : "",
  weddingDay: typeof value?.weddingDay === "string" ? value.weddingDay.trim() : "",
  weddingMonth: typeof value?.weddingMonth === "string" ? value.weddingMonth.trim() : "",
  weddingYear: typeof value?.weddingYear === "string" ? value.weddingYear.trim() : "",
  theme:
    typeof value?.theme === "string" && THEME_VALUES.has(value.theme.trim())
      ? value.theme.trim()
      : "golden",
  backgroundImage: typeof value?.backgroundImage === "string" ? value.backgroundImage.trim() : "",
  backgroundImageLabel:
    typeof value?.backgroundImageLabel === "string" ? value.backgroundImageLabel.trim() : "",
  backgroundImageSource:
    typeof value?.backgroundImageSource === "string" ? value.backgroundImageSource.trim() : "",
});

const buildGoogleMapsPreviewUrl = (place, mapType) => {
  if (!GOOGLE_MAPS_API_KEY || !place) {
    return "";
  }

  const encodedPlace = encodeURIComponent(place);
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedPlace}&zoom=16&size=1200x800&scale=2&maptype=${mapType}&markers=color:0xd8b24a%7C${encodedPlace}&key=${GOOGLE_MAPS_API_KEY}`;
};

export default function App() {
  const maxAllowedYear = new Date().getFullYear() + 4;
  const [config, setConfig] = useState(defaultConfig);
  const [formData, setFormData] = useState(defaultConfig);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [isSetupRoute, setIsSetupRoute] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const storedConfig = localStorage.getItem(APP_CONFIG_KEY);
    if (!storedConfig) {
      return;
    }

    try {
      const parsed = normalizeConfig(JSON.parse(storedConfig));
      const hydrated = {
        ...defaultConfig,
        ...parsed,
      };
      setConfig(hydrated);
      setFormData(hydrated);
      setHasStoredConfig(true);
    } catch {
      setHasStoredConfig(false);
    }
  }, []);

  useEffect(() => {
    const syncSetupRoute = () => {
      setIsSetupRoute(window.location.hash.toLowerCase() === "#setup");
    };

    syncSetupRoute();
    window.addEventListener("hashchange", syncSetupRoute);
    return () => window.removeEventListener("hashchange", syncSetupRoute);
  }, []);

  const shouldShowSetup = isSetupRoute || !hasStoredConfig;

  useEffect(() => {
    const activeTheme = shouldShowSetup ? formData.theme || config.theme : config.theme;
    document.documentElement.dataset.weddingTheme = activeTheme || "golden";
  }, [config.theme, formData.theme, shouldShowSetup]);

  useEffect(() => {
    const activeBackground = shouldShowSetup ? formData.backgroundImage || config.backgroundImage : config.backgroundImage;
    const encodedBackground = activeBackground ? `url('${activeBackground.replace(/'/g, "\\'")}')` : "none";
    document.documentElement.style.setProperty(
      "--wedding-background-image",
      encodedBackground,
    );
  }, [config.backgroundImage, formData.backgroundImage, shouldShowSetup]);

  const formattedDate = useMemo(() => {
    const day = config.weddingDay.trim();
    const month = config.weddingMonth.trim();
    const year = config.weddingYear.trim();
    if (!day || !month || !year) {
      return "";
    }
    const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} de ${monthLabel} de ${year}`;
  }, [config]);

  const previewBackgrounds = useMemo(() => {
    const place = formData.weddingPlace.trim();
    if (!place || !GOOGLE_MAPS_API_KEY) {
      return [];
    }

    return BACKGROUND_PREVIEW_OPTIONS.map((option) => ({
      ...option,
      src: buildGoogleMapsPreviewUrl(place, option.mapType),
    })).filter((option) => option.src);
  }, [formData.weddingPlace]);

  const updateFormField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const applyBackgroundImage = (backgroundImage, backgroundImageLabel, backgroundImageSource) => {
    setFormData((current) => ({
      ...current,
      backgroundImage,
      backgroundImageLabel,
      backgroundImageSource,
    }));
  };

  const handleBackgroundUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        return;
      }

      applyBackgroundImage(reader.result, file.name, "upload");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSelectPreviewBackground = (backgroundImage, backgroundImageLabel) => {
    applyBackgroundImage(backgroundImage, backgroundImageLabel, "google-maps");
  };

  const handleClearBackground = () => {
    applyBackgroundImage("", "", "");
  };

  const handleDayChange = (value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingDay", "");
      return;
    }

    const numericDay = Number.parseInt(digits, 10);
    const clamped = Math.min(31, Math.max(1, numericDay));
    updateFormField("weddingDay", String(clamped));
  };

  const handleYearChange = (value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 4);
    if (!digits) {
      updateFormField("weddingYear", "");
      return;
    }

    const parsedYear = Number.parseInt(digits, 10);
    if (digits.length === 4 && parsedYear > maxAllowedYear) {
      updateFormField("weddingYear", String(maxAllowedYear));
      return;
    }

    updateFormField("weddingYear", digits);
  };

  const handleSaveSetup = (event) => {
    event.preventDefault();
    setSaveError("");
    setSaveMessage("");

    const sanitized = normalizeConfig(formData);
    if (!sanitized.firstName || !sanitized.secondName) {
      setSaveError("Indica ambos nombres para continuar.");
      return;
    }

    if (!sanitized.weddingDay || !sanitized.weddingMonth || !sanitized.weddingYear) {
      setSaveError("Completa la fecha de la boda.");
      return;
    }

    const parsedDay = Number.parseInt(sanitized.weddingDay, 10);
    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setSaveError("El dia debe estar entre 1 y 31.");
      return;
    }

    if (!MONTH_OPTIONS.some((monthOption) => monthOption.value === sanitized.weddingMonth)) {
      setSaveError("Selecciona un mes valido.");
      return;
    }

    if (!THEME_VALUES.has(sanitized.theme)) {
      setSaveError("Selecciona un tema valido.");
      return;
    }

    const parsedYear = Number.parseInt(sanitized.weddingYear, 10);
    if (Number.isNaN(parsedYear) || parsedYear > maxAllowedYear) {
      setSaveError(`El año no puede ser mayor a ${maxAllowedYear}.`);
      return;
    }

    const payload = {
      ...defaultConfig,
      ...sanitized,
    };

    localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(payload));
    setConfig(payload);
    setFormData(payload);
    setHasStoredConfig(true);
    setSaveMessage("Configuración guardada correctamente.");
  };

  if (shouldShowSetup) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Configuración inicial">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Configuración inicial</p>
              <h1 className="setup-title">Hagamos que tu invitación sea única</h1>
              <p className="setup-subtitle">
                Completa estos campos y verás la portada lista al instante.
              </p>
            </div>
          </header>

          <form className="setup-form" onSubmit={handleSaveSetup}>
            <fieldset className="setup-name-group">
              <legend className="setup-label">Nombres</legend>
              <div className="setup-name-grid">
                <input
                  id="firstName"
                  className="setup-input"
                  value={formData.firstName}
                  onChange={(event) => updateFormField("firstName", event.target.value.slice(0, 20))}
                  placeholder="Antonio"
                  autoComplete="off"
                />

                <input
                  id="secondName"
                  className="setup-input"
                  value={formData.secondName}
                  onChange={(event) => updateFormField("secondName", event.target.value.slice(0, 20))}
                  placeholder="José"
                  autoComplete="off"
                />
              </div>
            </fieldset>

            <label className="setup-label" htmlFor="inviteMessage">
              Mensaje principal
            </label>
            <textarea
              id="inviteMessage"
              className="setup-textarea"
              value={formData.inviteMessage}
              onChange={(event) => updateFormField("inviteMessage", event.target.value.slice(0, 220))}
              placeholder="Nos encantaría celebrar este día contigo."
            />

            <label className="setup-label" htmlFor="themeSelect">
              Tema visual
            </label>
            <select
              id="themeSelect"
              className="setup-input"
              value={formData.theme}
              onChange={(event) => updateFormField("theme", event.target.value)}
            >
              {THEME_GROUPS.map((group) => (
                <optgroup key={group.value} label={group.label}>
                  {THEME_OPTIONS.filter((theme) => theme.group === group.value).map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="setup-help">{THEME_OPTIONS.find((theme) => theme.value === formData.theme)?.hint}</p>

            <label className="setup-label" htmlFor="weddingPlace">
              Lugar de la boda
            </label>
            <input
              id="weddingPlace"
              className="setup-input"
              value={formData.weddingPlace}
              onChange={(event) => updateFormField("weddingPlace", event.target.value.slice(0, 120))}
              placeholder="Finca, hotel, parroquia o dirección"
              autoComplete="off"
            />
            <p className="setup-help">
              Si defines el lugar, puedes elegir una vista de Google Maps o subir una foto propia para usarla como fondo.
            </p>

            <div className="setup-background-panel">
              <div className="setup-background-panel__header">
                <div>
                  <p className="setup-label setup-label--tight">Fondo de la portada</p>
                  <p className="setup-help setup-help--tight">
                    {GOOGLE_MAPS_API_KEY
                      ? "Elige una de las vistas sugeridas o sube tu propia imagen."
                      : "Para ver las vistas de Google Maps necesitas VITE_GOOGLE_MAPS_API_KEY; mientras tanto, sube tu propia foto."}
                  </p>
                </div>
                {formData.backgroundImage ? (
                  <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClearBackground}>
                    Quitar el fondo
                  </button>
                ) : null}
              </div>

              <label className="setup-upload" htmlFor="backgroundUpload">
                <span className="setup-upload__title">Subir foto del lugar</span>
                <span className="setup-upload__subtitle">Acepta JPG, PNG o WebP.</span>
              </label>
              <input id="backgroundUpload" className="setup-upload__input" type="file" accept="image/*" onChange={handleBackgroundUpload} />

              {formData.backgroundImage ? (
                <div className="setup-selected-background">
                  <img src={formData.backgroundImage} alt="Fondo seleccionado" className="setup-selected-background__image" />
                  <div>
                    <p className="setup-selected-background__title">Fondo actual</p>
                    <p className="setup-help setup-help--tight">{formData.backgroundImageLabel || "Imagen seleccionada"}</p>
                  </div>
                </div>
              ) : null}

              {previewBackgrounds.length ? (
                <div className="setup-background-grid">
                  {previewBackgrounds.map((background) => (
                    <button
                      key={background.id}
                      className="setup-background-card"
                      type="button"
                      onClick={() => handleSelectPreviewBackground(background.src, `${formData.weddingPlace} · ${background.label}`)}
                    >
                      <img src={background.src} alt={background.label} className="setup-background-card__image" />
                      <span className="setup-background-card__title">{background.label}</span>
                      <span className="setup-background-card__description">{background.description}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="setup-date-grid">
              <div>
                <label className="setup-label" htmlFor="weddingDay">
                  Día
                </label>
                <input
                  id="weddingDay"
                  className="setup-input"
                  value={formData.weddingDay}
                  onChange={(event) => handleDayChange(event.target.value)}
                  placeholder="12"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="setup-label" htmlFor="weddingMonth">
                  Mes
                </label>
                <select
                  id="weddingMonth"
                  className="setup-input"
                  value={formData.weddingMonth}
                  onChange={(event) => updateFormField("weddingMonth", event.target.value)}
                >
                  <option value="" disabled>
                    Selecciona un mes
                  </option>
                  {MONTH_OPTIONS.map((monthOption) => (
                    <option key={monthOption.value} value={monthOption.value}>
                      {monthOption.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="setup-label" htmlFor="weddingYear">
                  Año
                </label>
                <input
                  id="weddingYear"
                  className="setup-input"
                  value={formData.weddingYear}
                  onChange={(event) => handleYearChange(event.target.value)}
                  placeholder="2027"
                  autoComplete="off"
                />
                <p className="setup-help">Máximo permitido: {maxAllowedYear}</p>
              </div>
            </div>

            <div className="setup-actions">
              <button className="setup-button" type="submit">
                Guardar y continuar
              </button>
              <button
                className="setup-button setup-button--ghost"
                type="button"
                onClick={() => {
                  window.location.hash = "";
                }}
              >
                Ir a la invitación
              </button>
            </div>
          </form>

          {saveMessage ? <p className="setup-success">{saveMessage}</p> : null}
          {saveError ? <p className="setup-error">{saveError}</p> : null}
          <p className="setup-help">
            Puedes volver cuando quieras escribiendo <strong>#setup</strong> en la URL.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="app-scene relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-boda-fondo px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="pointer-events-none absolute left-[-0.5rem] top-0 z-0 wedding-decoration wedding-decoration--left">
        <img
          src={eucalyptusSrc}
          alt="Decoración de rama de eucalipto"
          className="wedding-decoration__image"
        />
      </div>
      <div className="pointer-events-none absolute right-[-0.5rem] bottom-[-0.5rem] z-0 wedding-decoration wedding-decoration--right">
        <img
          src={eucalyptusSrc}
          alt="Decoración de rama de eucalipto"
          className="wedding-decoration__image"
        />
      </div>

      <div className="invite-shell relative z-10 mx-auto w-full max-w-[min(100%,38rem)] overflow-hidden rounded-[2rem] bg-transparent px-3 py-5 text-center shadow-2xl sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="relative z-20">
          <div className="relative mx-auto w-fit">
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[42%]">
              <img
                src={heroBackdropSrc}
                alt=""
                aria-hidden="true"
                className="invite-rings block h-auto w-[clamp(11rem,44vw,18rem)] object-contain object-center sm:w-[clamp(13rem,34vw,20rem)]"
              />
            </div>
            <h1 className="invite-title relative z-10 text-[clamp(2rem,7vw,4.5rem)] leading-tight font-serif text-boda-texto sm:text-[clamp(2.5rem,6vw,4.75rem)] lg:text-[clamp(3rem,5vw,5.5rem)]">
              {config.firstName} & {config.secondName}
            </h1>
          </div>
          <p className="invite-copy mt-3 text-[clamp(0.95rem,2.8vw,1.25rem)] leading-relaxed font-serif text-boda-texto sm:mt-4 sm:text-[clamp(1rem,2.5vw,1.35rem)]">
            {config.inviteMessage}
          </p>
          <p className="invite-copy mt-2 text-[clamp(0.95rem,2.8vw,1.2rem)] leading-relaxed font-serif text-boda-texto sm:mt-3 sm:text-[clamp(1rem,2.4vw,1.3rem)]">
            {formattedDate}
          </p>
          {config.weddingPlace ? (
            <p className="invite-place mt-3 text-[0.88rem] uppercase tracking-[0.22em] text-boda-texto sm:mt-4">
              {config.weddingPlace}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
