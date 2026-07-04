import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getDoc, setDoc } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { ALLOWED_UPLOAD_TYPES, defaultConfig, MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER, STORY_SECTION_ORDER, THEME_VALUES } from "../lib/constants";
import { normalizeConfig } from "../lib/normalize-config";
import { decodeInviteConfig } from "../lib/invite-config-codec";
import { getValidCoordinates } from "../lib/geo-utils";
import { compressImage } from "../lib/image-utils";
import { useCalendar } from "../hooks/useCalendar";
import { useFieldHandlers } from "../hooks/useFieldHandlers";
import { useRsvp } from "../hooks/useRsvp";
import { useMapPreview } from "../hooks/useMapPreview";
import { useSetupAuth } from "../hooks/useSetupAuth";
import { useAutoSave } from "../hooks/useAutoSave";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const maxAllowedYear = new Date().getFullYear() + 4;

  const [config, setConfig] = useState(defaultConfig);
  const [formData, setFormData] = useState(defaultConfig);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configLoadError, setConfigLoadError] = useState("");

  const [inviteToken, setInviteToken] = useState("");

  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminMessageType, setAdminMessageType] = useState("success");

  const [locationMapError, setLocationMapError] = useState("");
  const [locationMapLoading, setLocationMapLoading] = useState(false);
  const [locationMapTarget, setLocationMapTarget] = useState(null);
  const locationMapContainerRef = useRef(null);

  const location = useLocation();

  const {
    setupToken, setSetupToken,
    setupTokenInput, setSetupTokenInput,
    isTokenVerifying, isTokenVerified, setIsTokenVerified,
    tokenLoginUsername, setTokenLoginUsername,
    adminLoginUsername, setAdminLoginUsername,
    generatedToken,
    authMessage, authMessageType, setAuthMessage,
    confirmTokenInput, setConfirmTokenInput,
    isAdminTokenLoggedIn,
    refreshSetupToken,
    handleTokenLogin, handleAdminTokenLogin,
    handleGenerateToken, handleAdminLogout,
    handleResetSetupToken, handleResetTokenFromAdmin,
  } = useSetupAuth(inviteToken, config, setAdminMessage, setAdminMessageType, setConfig, setHasStoredConfig);

  const {
    rsvpEntries, rsvpForm, rsvpMessage, isRsvpSubmitting,
    updateRsvpField, handleRsvpSubmit, handleClearRsvpEntries,
  } = useRsvp(inviteToken, setAdminMessage, setAdminMessageType);

  const { formattedDate, formattedTime, calendarLink } = useCalendar(config);

  const updateFormField = useCallback((field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  }, []);

  const applyBackgroundImage = useCallback((backgroundImage, backgroundImageLabel, backgroundImageSource) => {
    setFormData((current) => ({
      ...current,
      backgroundImage,
      backgroundImageLabel,
      backgroundImageSource,
    }));
  }, []);

  const { previewBackgrounds, isPreviewLoading } = useMapPreview(
    formData.weddingPlace,
    formData.weddingLatitude,
    formData.weddingLongitude,
  );

  const {
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange,
  } = useFieldHandlers(updateFormField, maxAllowedYear, formData.weddingMinute);

  const { autoSaveTimerRef } = useAutoSave(hasStoredConfig, inviteToken, formData, config, setSaveMessage);

  useEffect(() => {
    const hash = window.location.hash;
    const isInvite = new URLSearchParams(window.location.search).has("invitar");
    const pathParts = location.pathname.split("/").filter(Boolean);
    const firstSegment = pathParts[0] || "";
    const isTokenRoute = /^[a-zA-Z0-9]{8,12}$/.test(firstSegment) && !["setup", "admin", "superadmin-login", "superadmin"].includes(firstSegment);
    const isAdminRoute = pathParts[1] === "setup" || pathParts[1] === "admin";

    if (hash && hash.length > 1) {
      try {
        const parsed = decodeInviteConfig(hash.slice(1));
        const hydrated = { ...defaultConfig, ...normalizeConfig(parsed) };
        setConfig(hydrated);
        setFormData(hydrated);
        setHasStoredConfig(false);
        setIsConfigLoading(false);
        return;
      } catch {
        if (isInvite) {
          setIsConfigLoading(false);
          setConfigLoadError("El enlace de invitación no es válido.");
          return;
        }
      }
    }

    if (isInvite && !isTokenRoute) {
      setIsConfigLoading(false);
      return;
    }

    if (isTokenRoute && inviteToken !== firstSegment) {
      setInviteToken(firstSegment);
      setIsConfigLoading(true);
      return;
    }

    if (!isAdminRoute && !isTokenRoute) {
      setIsConfigLoading(false);
      return;
    }

    setIsConfigLoading(true);

    const hydrateConfig = async () => {
      setConfigLoadError("");
      try {
        if (!inviteToken) { setIsConfigLoading(false); return; }

        const cached = localStorage.getItem(`wedin_invite_cache_${inviteToken}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.data && parsed.cachedAt && Date.now() - parsed.cachedAt < 60000) {
              setConfig(parsed.data);
              setFormData(parsed.data);
              setHasStoredConfig(true);
              setIsConfigLoading(false);
              return;
            }
          } catch {}
        }

        const snapshot = await getDoc(invitationDocRef(inviteToken));
        if (!snapshot.exists()) {
          setHasStoredConfig(false);
          setConfig(defaultConfig);
          setFormData(defaultConfig);
          setIsConfigLoading(false);
          return;
        }
        const parsed = normalizeConfig(snapshot.data());
        const hydrated = { ...defaultConfig, ...parsed };
        setConfig(hydrated);
        setFormData(hydrated);
        setHasStoredConfig(true);
      } catch {
        setHasStoredConfig(false);
        setConfigLoadError("No se pudo cargar la configuración guardada. Revisa la conexión e inténtalo de nuevo.");
      } finally {
        setIsConfigLoading(false);
      }
    };
    hydrateConfig();
  }, [location.pathname, location.hash, inviteToken]);

  const reloadConfig = useCallback(async () => {
    if (!inviteToken) return;
    try {
      localStorage.removeItem(`wedin_invite_cache_${inviteToken}`);
      const snapshot = await getDoc(invitationDocRef(inviteToken));
      if (!snapshot.exists()) {
        setHasStoredConfig(false);
        setConfig(defaultConfig);
        setFormData(defaultConfig);
        return;
      }
      const parsed = normalizeConfig(snapshot.data());
      const hydrated = { ...defaultConfig, ...parsed };
      setConfig(hydrated);
      setFormData(hydrated);
      setHasStoredConfig(true);
    } catch {}
  }, [inviteToken]);

  useEffect(() => {
    setSaveMessage("");
    setSaveError("");
    setAuthMessage("");
    setAdminMessage("");
  }, [location.pathname, setAuthMessage]);

  useEffect(() => {
    if (hasStoredConfig) return;
    (async () => { await refreshSetupToken(); })();
  }, [hasStoredConfig, refreshSetupToken]);

  const handleClearBackground = useCallback(() => {
    applyBackgroundImage("", "", "");
  }, [applyBackgroundImage]);

  const handleSelectPreviewBackground = useCallback((backgroundImage, backgroundImageLabel, backgroundImageSource = "openfreemap") => {
    applyBackgroundImage(backgroundImage, backgroundImageLabel, backgroundImageSource);
  }, [applyBackgroundImage]);

  const handleBackgroundUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setSaveError("Formato no permitido. Usa JPG o PNG.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setSaveError("La imagen supera 20 MB. Usa una imagen más ligera.");
      event.target.value = "";
      return;
    }
    setSaveError("");
    setSaveMessage("Comprimiendo imagen...");
    compressImage(file).then((dataUrl) => {
      applyBackgroundImage(dataUrl, file.name, "upload");
      setSaveMessage("");
    }).catch(() => {
      setSaveError("No se pudo procesar la imagen. Intenta con otra.");
    });
    event.target.value = "";
  }, [applyBackgroundImage]);

  const handleSaveSetup = useCallback(async (event) => {
    event.preventDefault();
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveError("");
    setSaveMessage("");

    if (!hasStoredConfig && !isTokenVerified) {
      setSaveError("Verifica el código de acceso antes de guardar.");
      return;
    }

    const sanitized = normalizeConfig(formData);
    const hiddenArray = (sanitized.hiddenSections || "").split(",").filter(Boolean);
    const hiddenSet = new Set(hiddenArray);

    if (!hasStoredConfig) {
      if (!sanitized.adminUsername) {
        setSaveError("Indica un nombre de usuario para poder entrar después.");
        return;
      }
      if (!/^[a-zA-Z0-9]+$/.test(sanitized.adminUsername)) {
        setSaveError("El usuario solo puede contener letras y números.");
        return;
      }
      if (sanitized.adminUsername.length > 50) {
        setSaveError("El usuario no puede superar los 50 caracteres.");
        return;
      }
    }

    if (!sanitized.firstName || !sanitized.secondName) {
      setSaveError("Indica ambos nombres para continuar.");
      return;
    }

    if (!hiddenSet.has("details") || !hasStoredConfig) {
      if (!sanitized.weddingDay || !sanitized.weddingMonth || !sanitized.weddingYear || !sanitized.weddingHour || !sanitized.weddingMinute) {
        setSaveError("Completa la fecha de la boda.");
        return;
      }
      const parsedDay = Number.parseInt(sanitized.weddingDay, 10);
      if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        setSaveError("El día debe estar entre 1 y 31.");
        return;
      }
      if (!MONTH_OPTIONS.some((monthOption) => monthOption.value === sanitized.weddingMonth)) {
        setSaveError("Selecciona un mes válido.");
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
      const parsedYear = Number.parseInt(sanitized.weddingYear, 10);
      const monthNum = MONTH_VALUE_TO_NUMBER[sanitized.weddingMonth];
      const enteredDate = new Date(parsedYear, monthNum - 1, parsedDay,
        Number.parseInt(sanitized.weddingHour, 10), Number.parseInt(sanitized.weddingMinute, 10));
      if (enteredDate.getDate() !== parsedDay || enteredDate.getMonth() !== monthNum - 1 || enteredDate.getFullYear() !== parsedYear) {
        setSaveError("La fecha introducida no es válida (ej. 30 de febrero no existe).");
        return;
      }
      const today = new Date();
      today.setSeconds(0, 0);
      if (enteredDate < today) {
        setSaveError("La fecha de la boda no puede ser anterior a hoy.");
        return;
      }
      if (Number.isNaN(parsedYear) || parsedYear > maxAllowedYear) {
        setSaveError(`El año no puede ser mayor a ${maxAllowedYear}.`);
        return;
      }
      const hasLatitude = Boolean(sanitized.weddingLatitude);
      const hasLongitude = Boolean(sanitized.weddingLongitude);
      if (hasLatitude !== hasLongitude) {
        setSaveError("Si escribes coordenadas, rellena los dos campos.");
        return;
      }
      if (hasLatitude && hasLongitude && !getValidCoordinates(sanitized.weddingLatitude, sanitized.weddingLongitude)) {
        setSaveError("Las coordenadas no son válidas. Revisa los números e inténtalo de nuevo.");
        return;
      }
    }

    if (!THEME_VALUES.has(sanitized.theme)) {
      setSaveError("Selecciona un tema válido.");
      return;
    }

    const orderArray = (sanitized.sectionOrder || "").split(",").filter(Boolean);
    const validSectionKeys = new Set(STORY_SECTION_ORDER);
    if (orderArray.length < 1 || !orderArray.every((s) => validSectionKeys.has(s))) {
      setSaveError("El orden de las secciones no es válido.");
      return;
    }
    if (!hiddenArray.every((s) => validSectionKeys.has(s))) {
      setSaveError("Las secciones ocultas no son válidas.");
      return;
    }
    if (orderArray[0] !== "hero") {
      setSaveError("La portada debe ser la primera sección.");
      return;
    }

    const payload = { ...defaultConfig, ...sanitized };
    if (hiddenSet.has("details") && hasStoredConfig) {
      payload.weddingDay = config.weddingDay;
      payload.weddingMonth = config.weddingMonth;
      payload.weddingYear = config.weddingYear;
      payload.weddingHour = config.weddingHour;
      payload.weddingMinute = config.weddingMinute;
    }

    try {
      await setDoc(invitationDocRef(inviteToken), payload);
      setConfig(payload);
      setFormData(payload);
      setHasStoredConfig(true);
      setSetupToken("");
      setSetupTokenInput("");
      setSaveMessage("Configuración guardada correctamente.");
    } catch {
      setSaveError("No se pudo guardar la configuración. Si es la primera vez, prueba a entrar desde el panel privado.");
    }
  }, [hasStoredConfig, isTokenVerified, formData, maxAllowedYear, inviteToken, config, autoSaveTimerRef, setSetupToken, setSetupTokenInput]);

  const value = useMemo(() => ({
    config, formData, hasStoredConfig,
    isConfigLoading, configLoadError, inviteToken,
    setupToken, setupTokenInput, setSetupTokenInput,
    isTokenVerifying, isTokenVerified, setIsTokenVerified, tokenLoginUsername, setTokenLoginUsername,
    adminLoginUsername, setAdminLoginUsername, generatedToken,
    saveMessage, saveError,
    adminMessage, adminMessageType,
    authMessage, authMessageType,
    rsvpEntries,
    previewBackgrounds, isPreviewLoading,
    locationMapContainerRef, locationMapError, setLocationMapError,
    locationMapLoading, setLocationMapLoading, locationMapTarget, setLocationMapTarget,
    rsvpForm, rsvpMessage, isRsvpSubmitting,
    maxAllowedYear, isAdminTokenLoggedIn,
    formattedDate, formattedTime, calendarLink,
    updateFormField, refreshSetupToken, reloadConfig,
    handleSaveSetup, handleRsvpSubmit, updateRsvpField,
    handleTokenLogin, handleAdminTokenLogin, handleGenerateToken,
    handleAdminLogout,
    handleResetSetupToken, handleResetTokenFromAdmin,
    handleClearRsvpEntries,
    handleBackgroundUpload, handleClearBackground, handleSelectPreviewBackground,
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange,
    confirmTokenInput, setConfirmTokenInput,
  }), [
    config, formData, hasStoredConfig,
    isConfigLoading, configLoadError, inviteToken,
    setupToken, setupTokenInput, setSetupTokenInput,
    isTokenVerifying, isTokenVerified, setIsTokenVerified, tokenLoginUsername, setTokenLoginUsername,
    adminLoginUsername, setAdminLoginUsername, generatedToken,
    saveMessage, saveError,
    adminMessage, adminMessageType,
    authMessage, authMessageType,
    rsvpEntries,
    previewBackgrounds, isPreviewLoading,
    locationMapContainerRef, locationMapError,
    locationMapLoading, locationMapTarget,
    rsvpForm, rsvpMessage, isRsvpSubmitting,
    maxAllowedYear, isAdminTokenLoggedIn,
    formattedDate, formattedTime, calendarLink,
    updateFormField, refreshSetupToken, reloadConfig,
    handleSaveSetup, handleRsvpSubmit, updateRsvpField,
    handleTokenLogin, handleAdminTokenLogin, handleGenerateToken,
    handleAdminLogout,
    handleResetSetupToken, handleResetTokenFromAdmin,
    handleClearRsvpEntries,
    handleBackgroundUpload, handleClearBackground, handleSelectPreviewBackground,
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange,
    confirmTokenInput, setConfirmTokenInput,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de AppProvider");
  return context;
}
