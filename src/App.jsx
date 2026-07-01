import eucalyptusSrc from "./assets/eucalyptus.png";
import heroBackdropSrc from "./assets/rings.png";
import { useEffect, useMemo, useRef, useState } from "react";

const APP_CONFIG_KEY = "weddingAppConfig";
const APP_SETUP_TOKEN_KEY = "weddingSetupToken";
const APP_RSVP_RESPONSES_KEY = "weddingRsvpResponses";
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

const STORY_SECTION_ORDER = ["hero", "details", "rsvp"];

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

const generateSetupToken = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(16);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  const rawToken = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return rawToken.match(/.{1,4}/g)?.join("-") ?? rawToken;
};

export default function App() {
  const maxAllowedYear = new Date().getFullYear() + 4;
  const [config, setConfig] = useState(defaultConfig);
  const [formData, setFormData] = useState(defaultConfig);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [isSetupRoute, setIsSetupRoute] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [setupTokenInput, setSetupTokenInput] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [rsvpEntries, setRsvpEntries] = useState([]);
  const [activeStorySection, setActiveStorySection] = useState("hero");
  const [storyTransition, setStoryTransition] = useState({
    fromIndex: 0,
    toIndex: null,
    direction: 1,
  });
  const activeStorySectionRef = useRef("hero");
  const storyTransitionRef = useRef({
    fromIndex: 0,
    toIndex: null,
    direction: 1,
  });
  const [rsvpForm, setRsvpForm] = useState({
    guestName: "",
    attendance: "yes",
    companions: "0",
    note: "",
  });
  const [rsvpMessage, setRsvpMessage] = useState("");

  const isStoryTransitioning = storyTransition.toIndex !== null;

  const getStorySectionStyle = (sectionKey) => {
    const sectionIndex = STORY_SECTION_ORDER.indexOf(sectionKey);
    const activeIndex = STORY_SECTION_ORDER.indexOf(activeStorySection);
    const { fromIndex, toIndex, direction } = storyTransition;

    if (toIndex === null) {
      const isActive = sectionIndex === activeIndex;
      return {
        opacity: isActive ? 1 : 0,
        transform: isActive ? "translateY(0) scale(1)" : "translateY(36px) scale(0.985)",
        pointerEvents: isActive ? "auto" : "none",
        zIndex: isActive ? 2 : 1,
      };
    }

    if (sectionIndex === fromIndex) {
      return {
        opacity: 0,
        transform: `translateY(${direction > 0 ? -32 : 32}px) scale(0.985)`,
        pointerEvents: "auto",
        zIndex: 3,
      };
    }

    if (sectionIndex === toIndex) {
      return {
        opacity: 1,
        transform: "translateY(0) scale(1)",
        pointerEvents: "auto",
        zIndex: 4,
      };
    }

    return {
      opacity: 0,
      transform: "translateY(44px) scale(0.97)",
      pointerEvents: "none",
      zIndex: 1,
    };
  };

  const getStorySectionClassName = (sectionKey) => {
    const sectionIndex = STORY_SECTION_ORDER.indexOf(sectionKey);
    const activeIndex = STORY_SECTION_ORDER.indexOf(activeStorySection);
    const { fromIndex, toIndex } = storyTransition;

    const isActiveSection = sectionIndex === activeIndex;
    const isTransitionSection = toIndex !== null && (sectionIndex === fromIndex || sectionIndex === toIndex);

    return [
      "story-section",
      `story-section--${sectionKey}`,
      isActiveSection || isTransitionSection ? "story-section--is-active" : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

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
    const storedResponses = localStorage.getItem(APP_RSVP_RESPONSES_KEY);
    if (!storedResponses) {
      return;
    }

    try {
      const parsedResponses = JSON.parse(storedResponses);
      if (Array.isArray(parsedResponses)) {
        setRsvpEntries(parsedResponses);
      }
    } catch {
      setRsvpEntries([]);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem(APP_CONFIG_KEY)) {
      return;
    }

    const storedToken = localStorage.getItem(APP_SETUP_TOKEN_KEY);
    if (storedToken) {
      setSetupToken(storedToken);
      setSetupTokenInput(storedToken);
      return;
    }

    refreshSetupToken();
  }, [hasStoredConfig]);

  useEffect(() => {
    const syncSetupRoute = () => {
      setIsSetupRoute(window.location.hash.toLowerCase() === "#setup");
    };

    const syncAdminRoute = () => {
      setIsAdminRoute(window.location.hash.toLowerCase() === "#admin");
    };

    syncSetupRoute();
    syncAdminRoute();
    window.addEventListener("hashchange", syncSetupRoute);
    window.addEventListener("hashchange", syncAdminRoute);
    return () => {
      window.removeEventListener("hashchange", syncSetupRoute);
      window.removeEventListener("hashchange", syncAdminRoute);
    };
  }, []);

  useEffect(() => {
    if (hasStoredConfig && isSetupRoute) {
      window.location.hash = "#admin";
      return;
    }

    if (!hasStoredConfig && isAdminRoute) {
      window.location.hash = "#setup";
    }
  }, [hasStoredConfig, isAdminRoute, isSetupRoute]);

  const shouldShowSetup = !hasStoredConfig;
  const shouldShowAdmin = hasStoredConfig && isAdminRoute;

  const refreshSetupToken = () => {
    const nextToken = generateSetupToken();
    localStorage.setItem(APP_SETUP_TOKEN_KEY, nextToken);
    setSetupToken(nextToken);
    setSetupTokenInput(nextToken);
    return nextToken;
  };

  const isEditingInvitation = shouldShowSetup || shouldShowAdmin;

  useEffect(() => {
    const activeTheme = isEditingInvitation ? formData.theme || config.theme : config.theme;
    document.documentElement.dataset.weddingTheme = activeTheme || "golden";
  }, [config.theme, formData.theme, isEditingInvitation]);

  useEffect(() => {
    const activeBackground = isEditingInvitation ? formData.backgroundImage || config.backgroundImage : config.backgroundImage;
    const encodedBackground = activeBackground ? `url('${activeBackground.replace(/'/g, "\\'")}')` : "none";
    document.documentElement.style.setProperty(
      "--wedding-background-image",
      encodedBackground,
    );
  }, [config.backgroundImage, formData.backgroundImage, isEditingInvitation]);

  useEffect(() => {
    activeStorySectionRef.current = activeStorySection;
  }, [activeStorySection]);

  useEffect(() => {
    storyTransitionRef.current = storyTransition;
  }, [storyTransition]);

  useEffect(() => {
    if (shouldShowSetup || shouldShowAdmin) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";

    let touchStartY = null;
    let transitionTimeoutId = null;

    const setTransitionState = (nextState) => {
      storyTransitionRef.current = nextState;
      setStoryTransition(nextState);
    };

    const startTransition = (direction) => {
      if (storyTransitionRef.current.toIndex !== null) {
        return;
      }

      const currentIndex = STORY_SECTION_ORDER.indexOf(activeStorySectionRef.current);
      const targetIndex = Math.max(0, Math.min(STORY_SECTION_ORDER.length - 1, currentIndex + direction));
      if (targetIndex === currentIndex) {
        return;
      }

      setTransitionState({
        fromIndex: currentIndex,
        toIndex: targetIndex,
        direction,
      });

      if (transitionTimeoutId) {
        window.clearTimeout(transitionTimeoutId);
      }

      transitionTimeoutId = window.setTimeout(() => {
        const completedSection = STORY_SECTION_ORDER[targetIndex];
        activeStorySectionRef.current = completedSection;
        setActiveStorySection(completedSection);
        setTransitionState({
          fromIndex: targetIndex,
          toIndex: null,
          direction,
        });
      }, 650);
    };

    const handleWheel = (event) => {
      event.preventDefault();
      if (event.deltaY === 0) {
        return;
      }

      startTransition(event.deltaY > 0 ? 1 : -1);
    };

    const handleKeyDown = (event) => {
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        startTransition(1);
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        startTransition(-1);
      }
    };

    const handleTouchStart = (event) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    };

    const handleTouchEnd = (event) => {
      const touchEndY = event.changedTouches[0]?.clientY ?? null;
      if (touchStartY === null || touchEndY === null) {
        return;
      }

      const distance = touchStartY - touchEndY;
      if (Math.abs(distance) >= 28) {
        startTransition(distance > 0 ? 1 : -1);
      }

      touchStartY = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      if (transitionTimeoutId) {
        window.clearTimeout(transitionTimeoutId);
      }
      document.body.style.overflow = "";
    };
  }, [shouldShowSetup, shouldShowAdmin]);

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

    if (!hasStoredConfig) {
      if (!setupToken || setupTokenInput.trim() !== setupToken) {
        setSaveError("La contraseña de un solo uso no coincide.");
        return;
      }
    }

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
    localStorage.removeItem(APP_SETUP_TOKEN_KEY);
    setConfig(payload);
    setFormData(payload);
    setHasStoredConfig(true);
    setSetupToken("");
    setSetupTokenInput("");
    setSaveMessage("Configuración guardada correctamente.");
  };

  const handleRsvpSubmit = (event) => {
    event.preventDefault();

    const guestName = rsvpForm.guestName.trim();
    if (!guestName) {
      setRsvpMessage("Escribe tu nombre para confirmar la asistencia.");
      return;
    }

    const companions = Number.parseInt(rsvpForm.companions, 10);
    const companionsCount = Number.isNaN(companions) ? 0 : Math.max(0, companions);
    const responseRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      guestName,
      attendance: rsvpForm.attendance,
      companions: companionsCount,
      note: rsvpForm.note.trim(),
      submittedAt: new Date().toISOString(),
    };

    setRsvpEntries((currentEntries) => {
      const nextEntries = [responseRecord, ...currentEntries];
      localStorage.setItem(APP_RSVP_RESPONSES_KEY, JSON.stringify(nextEntries));
      return nextEntries;
    });

    setRsvpMessage(
      rsvpForm.attendance === "yes"
        ? `Gracias, ${guestName}. Tu asistencia quedó marcada con ${companionsCount} acompañante${companionsCount === 1 ? "" : "s"}.`
        : `Gracias, ${guestName}. Lamentamos que no puedas asistir.`,
    );
  };

  const updateRsvpField = (field, value) => {
    setRsvpForm((current) => ({ ...current, [field]: value }));
  };

  const handleResetSetupToken = () => {
    setSaveMessage("");
    setSaveError("");
    setAdminMessage("");
    const nextToken = refreshSetupToken();
    setSaveMessage(`Se generó una nueva contraseña de un solo uso: ${nextToken}`);
  };

  const handleResetTokenFromAdmin = () => {
    setSaveMessage("");
    setSaveError("");
    setAdminMessage("");
    const nextToken = refreshSetupToken();
    setAdminMessage(`Se generó una nueva contraseña de un solo uso: ${nextToken}`);
  };

  const handleClearRsvpEntries = () => {
    localStorage.removeItem(APP_RSVP_RESPONSES_KEY);
    setRsvpEntries([]);
    setAdminMessage("Se vació el registro de asistencia.");
  };

  if (shouldShowSetup) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Configuración inicial">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Configuración inicial</p>
              <h1 className="setup-title">Preparamos tu invitación</h1>
              <p className="setup-subtitle">
                Completa estos campos para ver la portada lista al instante.
              </p>
            </div>
          </header>

          <form className="setup-form" onSubmit={handleSaveSetup}>
            {!hasStoredConfig ? (
              <div className="setup-token-card">
                <p className="setup-label setup-label--tight">Código de acceso temporal</p>
                <p className="setup-help setup-help--tight">
                  Se creó automáticamente la primera vez. Úsalo para guardar los cambios.
                </p>
                <input
                  className="setup-input setup-token-input"
                  value={setupTokenInput}
                  onChange={(event) => setSetupTokenInput(event.target.value.toUpperCase())}
                  placeholder="AAAA-BBBB-CCCC-DDDD"
                  autoComplete="off"
                  spellCheck="false"
                />
                {setupToken ? <p className="setup-token-display">Token actual: {setupToken}</p> : null}
                <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleResetSetupToken}>
                  Generar nuevo código
                </button>
              </div>
            ) : null}

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
              Si defines el lugar, podrás elegir una vista de Google Maps o subir una foto propia para usarla como fondo.
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
                Guardar cambios
              </button>
              <button
                className="setup-button setup-button--ghost"
                type="button"
                onClick={() => {
                  window.location.hash = "#admin";
                }}
              >
                Ir al área privada
              </button>
              <button
                className="setup-button setup-button--ghost"
                type="button"
                onClick={() => {
                  window.location.hash = "";
                }}
              >
                Ver la portada
              </button>
            </div>
          </form>

          {saveMessage ? <p className="setup-success">{saveMessage}</p> : null}
          {saveError ? <p className="setup-error">{saveError}</p> : null}
          <p className="setup-help">
            Puedes volver cuando quieras escribiendo <strong>#setup</strong> en la URL o abrir el área privada con <strong>#admin</strong>.
          </p>
        </section>
      </div>
    );
  }

  if (shouldShowAdmin) {
    const confirmedResponses = rsvpEntries.filter((entry) => entry.attendance === "yes").length;
    const declinedResponses = rsvpEntries.filter((entry) => entry.attendance === "no").length;

    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Panel de administración">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Área privada</p>
              <h1 className="setup-title">Asistencia y cuenta</h1>
              <p className="setup-subtitle">
                Revisa las respuestas de asistencia y gestiona el acceso inicial de la invitación.
              </p>
            </div>
          </header>

          <div className="setup-form">
            <form className="setup-form" onSubmit={handleSaveSetup}>
              <section className="setup-token-card" aria-label="Invitación">
                <p className="setup-label setup-label--tight">Editar invitación</p>
                <p className="setup-help setup-help--tight">
                  Aquí puedes cambiar los mismos datos que usa la portada principal.
                </p>

                <fieldset className="setup-name-group">
                  <legend className="setup-label">Nombres</legend>
                  <div className="setup-name-grid">
                    <input
                      id="adminFirstName"
                      className="setup-input"
                      value={formData.firstName}
                      onChange={(event) => updateFormField("firstName", event.target.value.slice(0, 20))}
                      placeholder="Antonio"
                      autoComplete="off"
                    />

                    <input
                      id="adminSecondName"
                      className="setup-input"
                      value={formData.secondName}
                      onChange={(event) => updateFormField("secondName", event.target.value.slice(0, 20))}
                      placeholder="José"
                      autoComplete="off"
                    />
                  </div>
                </fieldset>

                <label className="setup-label" htmlFor="adminInviteMessage">
                  Mensaje principal
                </label>
                <textarea
                  id="adminInviteMessage"
                  className="setup-textarea"
                  value={formData.inviteMessage}
                  onChange={(event) => updateFormField("inviteMessage", event.target.value.slice(0, 220))}
                  placeholder="Nos encantaría celebrar este día contigo."
                />

                <label className="setup-label" htmlFor="adminThemeSelect">
                  Tema visual
                </label>
                <select
                  id="adminThemeSelect"
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

                <label className="setup-label" htmlFor="adminWeddingPlace">
                  Lugar de la boda
                </label>
                <input
                  id="adminWeddingPlace"
                  className="setup-input"
                  value={formData.weddingPlace}
                  onChange={(event) => updateFormField("weddingPlace", event.target.value.slice(0, 120))}
                  placeholder="Finca, hotel, parroquia o dirección"
                  autoComplete="off"
                />
                <p className="setup-help">
                  Si defines el lugar, podrás elegir una vista de Google Maps o subir una foto propia para usarla como fondo.
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

                  <label className="setup-upload" htmlFor="adminBackgroundUpload">
                    <span className="setup-upload__title">Subir foto del lugar</span>
                    <span className="setup-upload__subtitle">Acepta JPG, PNG o WebP.</span>
                  </label>
                  <input id="adminBackgroundUpload" className="setup-upload__input" type="file" accept="image/*" onChange={handleBackgroundUpload} />

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
                    <label className="setup-label" htmlFor="adminWeddingDay">
                      Día
                    </label>
                    <input
                      id="adminWeddingDay"
                      className="setup-input"
                      value={formData.weddingDay}
                      onChange={(event) => handleDayChange(event.target.value)}
                      placeholder="12"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="setup-label" htmlFor="adminWeddingMonth">
                      Mes
                    </label>
                    <select
                      id="adminWeddingMonth"
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
                    <label className="setup-label" htmlFor="adminWeddingYear">
                      Año
                    </label>
                    <input
                      id="adminWeddingYear"
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
                    Guardar cambios
                  </button>
                </div>
              </section>
            </form>

            <section className="setup-token-card" aria-label="Asistencia">
              <p className="setup-label setup-label--tight">Asistencia</p>
              <p className="setup-help setup-help--tight">
                Aquí se concentran las respuestas enviadas desde el formulario RSVP.
              </p>
              <p className="setup-token-display">
                Confirmados: {confirmedResponses} · No asistirán: {declinedResponses} · Total: {rsvpEntries.length}
              </p>
              {rsvpEntries.length ? (
                <div className="setup-background-grid">
                  {rsvpEntries.map((entry) => (
                    <article key={entry.id} className="setup-background-card">
                      <span className="setup-background-card__title">{entry.guestName}</span>
                      <span className="setup-background-card__description">
                        {entry.attendance === "yes"
                          ? `Asistirá con ${entry.companions} acompañante${entry.companions === 1 ? "" : "s"}`
                          : "No asistirá"}
                      </span>
                      {entry.note ? <span className="setup-background-card__description">Nota: {entry.note}</span> : null}
                      <span className="setup-background-card__description">
                        {new Date(entry.submittedAt).toLocaleString("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="setup-help setup-help--tight">Todavía no hay respuestas registradas.</p>
              )}
              <div className="setup-actions">
                <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClearRsvpEntries}>
                  Vaciar asistencia
                </button>
              </div>
            </section>

            {saveMessage ? <p className="setup-success">{saveMessage}</p> : null}
            {saveError ? <p className="setup-error">{saveError}</p> : null}

            <section className="setup-token-card" aria-label="Cuenta">
              <p className="setup-label setup-label--tight">Acceso</p>
              <p className="setup-help setup-help--tight">
                Usa este bloque para regenerar el código de acceso temporal que protege la primera configuración.
              </p>
              <input
                className="setup-input setup-token-input"
                value={setupToken || ""}
                readOnly
                autoComplete="off"
                spellCheck="false"
                placeholder="Sin código activo"
              />
              {setupToken ? <p className="setup-token-display">Token actual: {setupToken}</p> : null}
              <div className="setup-actions">
                <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleResetTokenFromAdmin}>
                  Generar nuevo código
                </button>
              </div>
            </section>

            <div className="setup-actions">
              <button
                className="setup-button"
                type="button"
                onClick={() => {
                  window.location.hash = "#setup";
                }}
              >
                Ir a la primera configuración
              </button>
              <button
                className="setup-button setup-button--ghost"
                type="button"
                onClick={() => {
                  window.location.hash = "";
                }}
              >
                Volver a la portada
              </button>
            </div>

            {adminMessage ? <p className="setup-success">{adminMessage}</p> : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`app-scene bg-boda-fondo ${isStoryTransitioning ? "app-scene--transitioning" : ""}`}>
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

      <section
        data-story-section="hero"
        className={`${getStorySectionClassName("hero")} relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
        style={getStorySectionStyle("hero")}
      >
        <div className="invite-shell story-panel story-panel--hero relative z-10 mx-auto w-full max-w-[min(100%,38rem)] overflow-hidden rounded-[2rem] bg-transparent px-3 py-5 text-center shadow-2xl sm:px-6 sm:py-8 lg:px-8 lg:py-10">
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
          </div>
        </div>
      </section>

      <section
        data-story-section="details"
        className={`${getStorySectionClassName("details")} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
        style={getStorySectionStyle("details")}
      >
        <div className="story-card story-panel story-card--details w-full max-w-[min(100%,40rem)] text-center">
          <p className="story-eyebrow">Fecha y lugar</p>
          <h2 className="story-title">{formattedDate || "Fecha por definir"}</h2>
          {config.weddingPlace ? (
            <p className="story-copy">{config.weddingPlace}</p>
          ) : (
            <p className="story-copy">El lugar de la celebración aparecerá aquí.</p>
          )}
          <div className="story-divider" />
          <p className="story-note">
            Aquí puedes incluir la dirección, referencias, horarios o un enlace al mapa.
          </p>
        </div>
      </section>

      <section
        data-story-section="rsvp"
        className={`${getStorySectionClassName("rsvp")} flex min-h-screen items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
        style={getStorySectionStyle("rsvp")}
      >
        <div className="story-card story-panel story-card--rsvp allow-select w-full max-w-[min(100%,42rem)]">
          <p className="story-eyebrow text-center">Confirmación de asistencia</p>
          <h2 className="story-title text-center">Confirma si vendrás y cuántos acompañantes traerás</h2>
          <p className="story-copy text-center">
            Tu respuesta nos ayuda a organizar cada detalle de la celebración.
          </p>

          <form className="rsvp-form" onSubmit={handleRsvpSubmit}>
            <label className="setup-label" htmlFor="rsvpName">
              Tu nombre
            </label>
            <input
              id="rsvpName"
              className="setup-input"
              value={rsvpForm.guestName}
              onChange={(event) => updateRsvpField("guestName", event.target.value)}
              placeholder="Tu nombre completo"
              autoComplete="off"
            />

            <div className="setup-date-grid rsvp-choice-grid">
              <div>
                <label className="setup-label" htmlFor="rsvpAttendance">
                  ¿Asistirás?
                </label>
                <select
                  id="rsvpAttendance"
                  className="setup-input"
                  value={rsvpForm.attendance}
                  onChange={(event) => updateRsvpField("attendance", event.target.value)}
                >
                  <option value="yes">Sí, asistiré</option>
                  <option value="no">No podré asistir</option>
                </select>
              </div>

              <div>
                <label className="setup-label" htmlFor="rsvpCompanions">
                  Acompañantes
                </label>
                <input
                  id="rsvpCompanions"
                  className="setup-input"
                  type="number"
                  min="0"
                  max="10"
                  value={rsvpForm.companions}
                  onChange={(event) => updateRsvpField("companions", event.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <label className="setup-label" htmlFor="rsvpNote">
              Mensaje opcional
            </label>
            <textarea
              id="rsvpNote"
              className="setup-textarea"
              value={rsvpForm.note}
              onChange={(event) => updateRsvpField("note", event.target.value.slice(0, 240))}
              placeholder="Déjanos un mensaje, alergias o cualquier detalle adicional."
            />

            <div className="setup-actions">
              <button className="setup-button" type="submit">
                Confirmar asistencia
              </button>
            </div>
          </form>

          {rsvpMessage ? <p className="rsvp-feedback">{rsvpMessage}</p> : null}
        </div>
      </section>
    </div>
  );
}
