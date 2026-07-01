import eucalyptusSrc from "./assets/eucalyptus.png";
import heroBackdropSrc from "./assets/rings.png";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// Claves de persistencia local para configuracion y respuestas RSVP.
const APP_CONFIG_KEY = "weddingAppConfig";
const APP_SETUP_TOKEN_KEY = "weddingSetupToken";
const APP_RSVP_RESPONSES_KEY = "weddingRsvpResponses";
// Estilos de OpenFreeMap usados para generar vistas previas del fondo.
const OPENFREEMAP_STYLES = [
  {
    id: "liberty",
    label: "Liberty",
    description: "Equilibrado y legible, con un aspecto limpio.",
    styleUrl: "https://tiles.openfreemap.org/styles/liberty",
  },
  {
    id: "bright",
    label: "Bright",
    description: "Más luminoso y claro, ideal para fondos suaves.",
    styleUrl: "https://tiles.openfreemap.org/styles/bright",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Un tono más sobrio para ubicaciones con contraste.",
    styleUrl: "https://tiles.openfreemap.org/styles/dark",
  },
];
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

const MONTH_VALUE_TO_NUMBER = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

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

const STORY_SECTION_ORDER = ["hero", "details", "rsvp"];

// Estado minimo de la invitacion cuando no existe configuracion guardada.
const defaultConfig = {
  firstName: "",
  secondName: "",
  inviteMessage: "",
  weddingPlace: "",
  weddingLatitude: "",
  weddingLongitude: "",
  weddingDay: "",
  weddingMonth: "",
  weddingYear: "",
  weddingHour: "",
  weddingMinute: "",
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
  weddingLatitude: typeof value?.weddingLatitude === "string" ? value.weddingLatitude.trim() : "",
  weddingLongitude: typeof value?.weddingLongitude === "string" ? value.weddingLongitude.trim() : "",
  weddingDay: typeof value?.weddingDay === "string" ? value.weddingDay.trim() : "",
  weddingMonth: typeof value?.weddingMonth === "string" ? value.weddingMonth.trim() : "",
  weddingYear: typeof value?.weddingYear === "string" ? value.weddingYear.trim() : "",
  weddingHour: typeof value?.weddingHour === "string" ? value.weddingHour.trim() : "",
  weddingMinute: typeof value?.weddingMinute === "string" ? value.weddingMinute.trim() : "",
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

// Convierte una direccion en coordenadas usando Nominatim (OpenStreetMap).
const geocodeLocation = async (place) => {
  if (!place) {
    return null;
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(place)}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const results = await response.json();
  const firstResult = Array.isArray(results) ? results[0] : null;
  if (!firstResult) {
    return null;
  }

  const latitude = Number.parseFloat(firstResult.lat);
  const longitude = Number.parseFloat(firstResult.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    label: firstResult.display_name || place,
  };
};

// Parseo tolerante de coordenadas para admitir coma o punto decimal.
const parseCoordinate = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().replace(",", ".");
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number.parseFloat(normalizedValue);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
};

// Valida coordenadas geograficas en rangos reales de latitud y longitud.
const getValidCoordinates = (latitudeValue, longitudeValue) => {
  const latitude = parseCoordinate(latitudeValue);
  const longitude = parseCoordinate(longitudeValue);

  if (latitude === null || longitude === null) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
};

// Prioriza coordenadas exactas del admin; si no existen, geocodifica direccion.
const resolveLocationTarget = async ({ place, latitudeValue, longitudeValue }) => {
  const exactCoordinates = getValidCoordinates(latitudeValue, longitudeValue);
  if (exactCoordinates) {
    return {
      ...exactCoordinates,
      label: place || "Ubicacion configurada",
    };
  }

  return geocodeLocation(place);
};

// Enlaces externos para abrir navegacion en apps de mapas.
const buildGoogleMapsUrl = (location) =>
  `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

const buildAppleMapsUrl = (location, placeLabel) => {
  const label = encodeURIComponent(placeLabel || location.label || "Boda");
  return `https://maps.apple.com/?ll=${location.latitude},${location.longitude}&q=${label}`;
};

const padDatePart = (value) => String(value).padStart(2, "0");

const formatCalendarDateTime = (date) =>
  `${date.getFullYear()}${padDatePart(date.getMonth() + 1)}${padDatePart(date.getDate())}T${padDatePart(date.getHours())}${padDatePart(date.getMinutes())}00`;

// Crea una URL prellenada de Google Calendar para evitar generar ficheros ICS.
const buildGoogleCalendarUrl = ({ title, description, place, startDate, endDate }) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    location: place,
    dates: `${formatCalendarDateTime(startDate)}/${formatCalendarDateTime(endDate)}`,
    ctz: timezone,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Renderiza una imagen del mapa en memoria para usarla como preview de fondo.
const buildOpenFreeMapPreviewUrl = async (location, style) => {
  if (!location || !style) {
    return "";
  }

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "-10000px";
  container.style.width = "1200px";
  container.style.height = "800px";
  document.body.appendChild(container);

  try {
    const map = new maplibregl.Map({
      container,
      style: style.styleUrl,
      center: [location.longitude, location.latitude],
      zoom: 15,
      bearing: -12,
      pitch: 40,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });

    const markerElement = document.createElement("div");
    markerElement.style.width = "18px";
    markerElement.style.height = "18px";
    markerElement.style.borderRadius = "999px";
    markerElement.style.background = "#d8b24a";
    markerElement.style.border = "3px solid rgba(255, 255, 255, 0.95)";
    markerElement.style.boxShadow = "0 0 0 8px rgba(216, 178, 74, 0.18)";

    new maplibregl.Marker({ element: markerElement, anchor: "center" })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);

    await new Promise((resolve, reject) => {
      map.once("error", reject);
      map.once("idle", resolve);
    });

    const previewUrl = map.getCanvas().toDataURL("image/png");
    map.remove();
    return previewUrl;
  } finally {
    container.remove();
  }
};

// Genera un token legible de un solo uso para proteger el setup inicial.
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
  // Estado persistido y estado de edicion temporal del formulario.
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
  const [previewBackgrounds, setPreviewBackgrounds] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [locationMapError, setLocationMapError] = useState("");
  const [locationMapLoading, setLocationMapLoading] = useState(false);
  const [locationMapTarget, setLocationMapTarget] = useState(null);
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
  const previewRequestRef = useRef(0);
  const locationMapContainerRef = useRef(null);
  const [rsvpForm, setRsvpForm] = useState({
    guestName: "",
    attendance: "yes",
    companions: "0",
    note: "",
  });
  const [rsvpMessage, setRsvpMessage] = useState("");

  const isStoryTransitioning = storyTransition.toIndex !== null;

  // Calcula estilos de entrada/salida para transiciones entre secciones.
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
    // Hidrata configuracion guardada al arrancar la app.
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
    // Recupera respuestas RSVP para el panel privado.
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
    // Si no existe configuracion, prepara/recupera token temporal de setup.
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
    // Sincroniza rutas hash (#setup / #admin) con el estado React.
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
    // Redirecciona automaticamente cuando la ruta no coincide con el estado.
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
    // Rota y persiste token temporal.
    const nextToken = generateSetupToken();
    localStorage.setItem(APP_SETUP_TOKEN_KEY, nextToken);
    setSetupToken(nextToken);
    setSetupTokenInput(nextToken);
    return nextToken;
  };

  const isEditingInvitation = shouldShowSetup || shouldShowAdmin;

  useEffect(() => {
    // Aplica tema activo al root para que CSS variable-driven cambie toda la UI.
    const activeTheme = isEditingInvitation ? formData.theme || config.theme : config.theme;
    document.documentElement.dataset.weddingTheme = activeTheme || "golden";
  }, [config.theme, formData.theme, isEditingInvitation]);

  useEffect(() => {
    // Sincroniza imagen de fondo global (preview en setup/admin y real en portada).
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
    // Genera previews de mapas al editar lugar/coordenadas.
    const place = formData.weddingPlace.trim();
    const hasExactCoordinates = Boolean(getValidCoordinates(formData.weddingLatitude, formData.weddingLongitude));
    if (!place && !hasExactCoordinates) {
      setPreviewBackgrounds([]);
      setIsPreviewLoading(false);
      return undefined;
    }

    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setIsPreviewLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const resolvedLocation = await resolveLocationTarget({
          place,
          latitudeValue: formData.weddingLatitude,
          longitudeValue: formData.weddingLongitude,
        });
        if (!resolvedLocation) {
          if (previewRequestRef.current === requestId) {
            setPreviewBackgrounds([]);
          }
          return;
        }

        const previews = await Promise.all(
          OPENFREEMAP_STYLES.map(async (style) => {
            const src = await buildOpenFreeMapPreviewUrl(resolvedLocation, style);
            return src ? { ...style, src } : null;
          }),
        );

        if (previewRequestRef.current !== requestId) {
          return;
        }

        setPreviewBackgrounds(previews.filter(Boolean));
      } finally {
        if (previewRequestRef.current === requestId) {
          setIsPreviewLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formData.weddingPlace, formData.weddingLatitude, formData.weddingLongitude]);

  useEffect(() => {
    // Renderiza el mapa real de la portada solo fuera de setup/admin.
    if (shouldShowSetup || shouldShowAdmin) {
      setLocationMapError("");
      setLocationMapLoading(false);
      return undefined;
    }

    const place = config.weddingPlace.trim();
    const container = locationMapContainerRef.current;
    const hasExactCoordinates = Boolean(getValidCoordinates(config.weddingLatitude, config.weddingLongitude));
    if ((!place && !hasExactCoordinates) || !container) {
      setLocationMapError("");
      setLocationMapLoading(false);
      setLocationMapTarget(null);
      return undefined;
    }

    let isCancelled = false;
    let mapInstance = null;
    setLocationMapError("");
    setLocationMapLoading(true);
    setLocationMapTarget(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const geocodedLocation = await resolveLocationTarget({
          place,
          latitudeValue: config.weddingLatitude,
          longitudeValue: config.weddingLongitude,
        });
        if (isCancelled || !container.isConnected) {
          return;
        }

        if (!geocodedLocation) {
          setLocationMapError("No pudimos localizar este lugar.");
          setLocationMapLoading(false);
          return;
        }

        setLocationMapTarget(geocodedLocation);

        mapInstance = new maplibregl.Map({
          container,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [geocodedLocation.longitude, geocodedLocation.latitude],
          zoom: 15,
          bearing: -12,
          pitch: 35,
          interactive: false,
          attributionControl: true,
        });

        const markerElement = document.createElement("div");
        markerElement.style.width = "18px";
        markerElement.style.height = "18px";
        markerElement.style.borderRadius = "999px";
        markerElement.style.background = "#d8b24a";
        markerElement.style.border = "3px solid rgba(255, 255, 255, 0.95)";
        markerElement.style.boxShadow = "0 0 0 8px rgba(216, 178, 74, 0.18)";

        new maplibregl.Marker({ element: markerElement, anchor: "center" })
          .setLngLat([geocodedLocation.longitude, geocodedLocation.latitude])
          .addTo(mapInstance);

        mapInstance.once("load", () => {
          if (!isCancelled) {
            setLocationMapLoading(false);
          }
        });
      } catch {
        if (!isCancelled) {
          setLocationMapError("No pudimos cargar el mapa.");
          setLocationMapLoading(false);
        }
      }
    }, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
      setLocationMapTarget(null);
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [config.weddingPlace, config.weddingLatitude, config.weddingLongitude, shouldShowAdmin, shouldShowSetup]);

  useEffect(() => {
    // Habilita navegacion por scroll/teclado/touch entre secciones tipo storytelling.
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
    // Presentacion de fecha legible en castellano.
    const day = config.weddingDay.trim();
    const month = config.weddingMonth.trim();
    const year = config.weddingYear.trim();
    if (!day || !month || !year) {
      return "";
    }
    const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} de ${monthLabel} de ${year}`;
  }, [config]);

  const formattedTime = useMemo(() => {
    // Normaliza hora para visualizacion HH:MM.
    const hour = config.weddingHour.trim();
    const minute = config.weddingMinute.trim();
    if (!hour || !minute) {
      return "";
    }

    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }, [config.weddingHour, config.weddingMinute]);

  const calendarLink = useMemo(() => {
    // Construye enlace de calendario solo cuando fecha/hora son validas.
    const day = Number.parseInt(config.weddingDay.trim(), 10);
    const month = MONTH_VALUE_TO_NUMBER[config.weddingMonth.trim()];
    const year = Number.parseInt(config.weddingYear.trim(), 10);
    const hour = Number.parseInt(config.weddingHour.trim(), 10);
    const minute = Number.parseInt(config.weddingMinute.trim(), 10);

    if (
      !month
      || Number.isNaN(day)
      || Number.isNaN(year)
      || Number.isNaN(hour)
      || Number.isNaN(minute)
    ) {
      return null;
    }

    const startDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (
      startDate.getFullYear() !== year
      || startDate.getMonth() !== month - 1
      || startDate.getDate() !== day
    ) {
      return null;
    }

    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const coupleNames = [config.firstName, config.secondName].filter(Boolean).join(" & ") || "Nuestra boda";
    const title = `Boda de ${coupleNames}`;
    const place = config.weddingPlace || "Lugar por confirmar";
    const description = [
      "Te esperamos para celebrar este momento especial.",
      formattedTime ? `Hora: ${formattedTime}` : "",
      config.weddingPlace ? `Lugar: ${config.weddingPlace}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return buildGoogleCalendarUrl({
      title,
      description,
      place,
      startDate,
      endDate,
    });
  }, [
    config.firstName,
    config.secondName,
    config.weddingDay,
    config.weddingMonth,
    config.weddingYear,
    config.weddingHour,
    config.weddingMinute,
    config.weddingPlace,
    formattedTime,
  ]);

  const updateFormField = (field, value) => {
    // Actualizacion generica de campos del formulario de configuracion.
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const applyBackgroundImage = (backgroundImage, backgroundImageLabel, backgroundImageSource) => {
    // Centraliza la seleccion de fondo para mantener metadatos consistentes.
    setFormData((current) => ({
      ...current,
      backgroundImage,
      backgroundImageLabel,
      backgroundImageSource,
    }));
  };

  const handleBackgroundUpload = (event) => {
    // Convierte imagen local a base64 para guardarla en localStorage.
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

  const handleSelectPreviewBackground = (backgroundImage, backgroundImageLabel, backgroundImageSource = "openfreemap") => {
    applyBackgroundImage(backgroundImage, backgroundImageLabel, backgroundImageSource);
  };

  const handleClearBackground = () => {
    applyBackgroundImage("", "", "");
  };

  const handleDayChange = (value) => {
    // Limita dia a 1..31 durante la escritura.
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingDay", "");
      return;
    }

    const numericDay = Number.parseInt(digits, 10);
    const clamped = Math.min(31, Math.max(1, numericDay));
    updateFormField("weddingDay", String(clamped));
  };

  const handleHourChange = (value) => {
    // Limita hora a 0..23 durante la escritura.
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingHour", "");
      return;
    }

    const numericHour = Number.parseInt(digits, 10);
    const clamped = Math.min(23, Math.max(0, numericHour));
    updateFormField("weddingHour", String(clamped));
  };

  const handleMinuteChange = (value) => {
    // Permite escribir minutos de forma natural y ajusta rango 0..59.
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingMinute", "");
      return;
    }

    if (digits.length === 1) {
      updateFormField("weddingMinute", digits);
      return;
    }

    const numericMinute = Number.parseInt(digits, 10);
    const clamped = Math.min(59, Math.max(0, numericMinute));
    updateFormField("weddingMinute", String(clamped).padStart(2, "0"));
  };

  const handleMinuteBlur = () => {
    // Al perder foco, completa formato de minutos a dos digitos.
    const digits = formData.weddingMinute.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingMinute", "");
      return;
    }

    const numericMinute = Number.parseInt(digits, 10);
    const clamped = Math.min(59, Math.max(0, numericMinute));
    updateFormField("weddingMinute", String(clamped).padStart(2, "0"));
  };

  const handleYearChange = (value) => {
    // Restringe anio al maximo permitido para evitar fechas absurdas.
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

  const handleCoordinateChange = (field, value) => {
    // Sanitiza coordenadas admitiendo punto/menos y longitud controlada.
    const normalized = value.replace(/,/g, ".").replace(/[^0-9.-]/g, "");
    updateFormField(field, normalized.slice(0, 18));
  };

  const handleSaveSetup = (event) => {
    // Valida y persiste toda la configuracion desde setup/admin.
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

    if (!sanitized.weddingDay || !sanitized.weddingMonth || !sanitized.weddingYear || !sanitized.weddingHour || !sanitized.weddingMinute) {
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

    const parsedHour = Number.parseInt(sanitized.weddingHour, 10);
    if (Number.isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23) {
      setSaveError("La hora debe estar entre 0 y 23.");
      return;
    }

    const parsedMinute = Number.parseInt(sanitized.weddingMinute, 10);
    if (Number.isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
      setSaveError("Los minutos deben estar entre 00 y 59.");
      return;
    }

    if (!THEME_VALUES.has(sanitized.theme)) {
      setSaveError("Selecciona un tema valido.");
      return;
    }

    const hasLatitude = Boolean(sanitized.weddingLatitude);
    const hasLongitude = Boolean(sanitized.weddingLongitude);
    if (hasLatitude !== hasLongitude) {
      setSaveError("Si usas coordenadas exactas, completa latitud y longitud.");
      return;
    }

    if (hasLatitude && hasLongitude && !getValidCoordinates(sanitized.weddingLatitude, sanitized.weddingLongitude)) {
      setSaveError("Las coordenadas no son validas. Latitud: -90 a 90, longitud: -180 a 180.");
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
    // Registra RSVP en localStorage y actualiza feedback al invitado.
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
    // Actualizacion generica de campos del formulario RSVP.
    setRsvpForm((current) => ({ ...current, [field]: value }));
  };

  const handleResetSetupToken = () => {
    // Accion de regeneracion de token desde el setup inicial.
    setSaveMessage("");
    setSaveError("");
    setAdminMessage("");
    const nextToken = refreshSetupToken();
    setSaveMessage(`Se generó una nueva contraseña de un solo uso: ${nextToken}`);
  };

  const handleResetTokenFromAdmin = () => {
    // Accion de regeneracion de token desde el panel admin.
    setSaveMessage("");
    setSaveError("");
    setAdminMessage("");
    const nextToken = refreshSetupToken();
    setAdminMessage(`Se generó una nueva contraseña de un solo uso: ${nextToken}`);
  };

  const handleClearRsvpEntries = () => {
    // Limpia el historial RSVP para reiniciar confirmaciones.
    localStorage.removeItem(APP_RSVP_RESPONSES_KEY);
    setRsvpEntries([]);
    setAdminMessage("Se vació el registro de asistencia.");
  };

  const configuredCoordinates = getValidCoordinates(config.weddingLatitude, config.weddingLongitude);
  const hasLocationData = Boolean(config.weddingPlace || configuredCoordinates);
  const locationDescription = config.weddingPlace
    ? config.weddingPlace
    : configuredCoordinates
      ? `Coordenadas: ${configuredCoordinates.latitude}, ${configuredCoordinates.longitude}`
      : "";

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
              Puedes escribir dirección y, si quieres máxima precisión, añadir coordenadas exactas.
            </p>

            <div className="setup-date-grid">
              <div>
                <label className="setup-label" htmlFor="weddingLatitude">
                  Latitud (opcional)
                </label>
                <input
                  id="weddingLatitude"
                  className="setup-input"
                  value={formData.weddingLatitude}
                  onChange={(event) => handleCoordinateChange("weddingLatitude", event.target.value)}
                  placeholder="40.4168"
                  inputMode="decimal"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="setup-label" htmlFor="weddingLongitude">
                  Longitud (opcional)
                </label>
                <input
                  id="weddingLongitude"
                  className="setup-input"
                  value={formData.weddingLongitude}
                  onChange={(event) => handleCoordinateChange("weddingLongitude", event.target.value)}
                  placeholder="-3.7038"
                  inputMode="decimal"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="setup-background-panel">
              <div className="setup-background-panel__header">
                <div>
                  <p className="setup-label setup-label--tight">Fondo de la portada</p>
                  <p className="setup-help setup-help--tight">
                    {isPreviewLoading
                      ? "Generando vistas de OpenFreeMap..."
                      : "Elige una de las vistas sugeridas de OpenFreeMap o sube tu propia imagen."}
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
              ) : isPreviewLoading ? (
                <p className="setup-help setup-help--tight">Buscando la ubicación y preparando las vistas.</p>
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
              <div className="setup-date-grid">
                <div>
                  <label className="setup-label" htmlFor="weddingHour">
                    Hora
                  </label>
                  <input
                    id="weddingHour"
                    className="setup-input"
                    value={formData.weddingHour}
                    onChange={(event) => handleHourChange(event.target.value)}
                    placeholder="14"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  <p className="setup-help">De 0 a 23</p>
                </div>
                <div>
                  <label className="setup-label" htmlFor="weddingMinute">
                    Minutos
                  </label>
                  <input
                    id="weddingMinute"
                    className="setup-input"
                    value={formData.weddingMinute}
                    onChange={(event) => handleMinuteChange(event.target.value)}
                    onBlur={handleMinuteBlur}
                    placeholder="30"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  <p className="setup-help">De 00 a 59</p>
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
                  Puedes escribir dirección y, si quieres máxima precisión, añadir coordenadas exactas.
                </p>

                <div className="setup-date-grid">
                  <div>
                    <label className="setup-label" htmlFor="adminWeddingLatitude">
                      Latitud (opcional)
                    </label>
                    <input
                      id="adminWeddingLatitude"
                      className="setup-input"
                      value={formData.weddingLatitude}
                      onChange={(event) => handleCoordinateChange("weddingLatitude", event.target.value)}
                      placeholder="40.4168"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="setup-label" htmlFor="adminWeddingLongitude">
                      Longitud (opcional)
                    </label>
                    <input
                      id="adminWeddingLongitude"
                      className="setup-input"
                      value={formData.weddingLongitude}
                      onChange={(event) => handleCoordinateChange("weddingLongitude", event.target.value)}
                      placeholder="-3.7038"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="setup-background-panel">
                  <div className="setup-background-panel__header">
                    <div>
                      <p className="setup-label setup-label--tight">Fondo de la portada</p>
                      <p className="setup-help setup-help--tight">
                        {isPreviewLoading
                          ? "Generando vistas de OpenFreeMap..."
                          : "Elige una de las vistas sugeridas de OpenFreeMap o sube tu propia imagen."}
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
                  ) : isPreviewLoading ? (
                    <p className="setup-help setup-help--tight">Buscando la ubicación y preparando las vistas.</p>
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

                <div className="setup-date-grid">
                  <div>
                    <label className="setup-label" htmlFor="adminWeddingHour">
                      Hora
                    </label>
                    <input
                      id="adminWeddingHour"
                      className="setup-input"
                      value={formData.weddingHour}
                      onChange={(event) => handleHourChange(event.target.value)}
                      placeholder="14"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                    <p className="setup-help">De 0 a 23</p>
                  </div>
                  <div>
                    <label className="setup-label" htmlFor="adminWeddingMinute">
                      Minutos
                    </label>
                    <input
                      id="adminWeddingMinute"
                      className="setup-input"
                      value={formData.weddingMinute}
                      onChange={(event) => handleMinuteChange(event.target.value)}
                      onBlur={handleMinuteBlur}
                      placeholder="30"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                    <p className="setup-help">De 00 a 59</p>
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
          {formattedTime ? <p className="story-copy">Hora de la celebración: {formattedTime}</p> : null}
          {hasLocationData ? (
            <p className="story-copy">{locationDescription}</p>
          ) : (
            <p className="story-copy">El lugar de la celebración aparecerá aquí.</p>
          )}
          <div className="story-divider" />
          <p className="story-note">
            {formattedTime
              ? `Te esperamos para compartir este momento tan especial. Comenzamos a las ${formattedTime}. Más abajo encontrarás el mapa de ubicación.`
              : "Te esperamos para compartir este momento tan especial. Más abajo encontrarás el mapa de ubicación."}
          </p>
          {calendarLink ? (
            <div className="story-calendar-actions">
              <a
                className="setup-button setup-button--ghost setup-button--compact"
                href={calendarLink}
                target="_blank"
                rel="noreferrer"
              >
                Añadir al calendario
              </a>
            </div>
          ) : null}
          {hasLocationData ? (
            <div className="story-map">
              <div
                ref={locationMapContainerRef}
                className="story-map__canvas"
                aria-label={`Mapa de ${locationDescription || "la ubicacion"}`}
              />
              {locationMapLoading ? <p className="story-map__status">Cargando el mapa de OpenFreeMap...</p> : null}
              {locationMapError ? <p className="story-map__status story-map__status--error">{locationMapError}</p> : null}
              {locationMapTarget ? (
                <div className="story-map__actions">
                  <a
                    className="setup-button setup-button--ghost setup-button--compact"
                    href={buildGoogleMapsUrl(locationMapTarget)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir en Google Maps
                  </a>
                  <a
                    className="setup-button setup-button--ghost setup-button--compact"
                    href={buildAppleMapsUrl(locationMapTarget, config.weddingPlace)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir en Apple Maps
                  </a>
                </div>
              ) : null}
              <p className="story-map__caption">Mapa de ubicación</p>
            </div>
          ) : null}
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
