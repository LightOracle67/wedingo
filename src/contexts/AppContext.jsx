import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDoc, setDoc, increment, updateDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage, invitationDocRef, rsvpByInviteRef } from "../lib/firebase";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES, defaultConfig, MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER, STORY_SECTION_ORDER, THEME_VALUES } from "../lib/constants";
import { normalizeConfig } from "../lib/normalize-config";
import { decodeInviteConfig } from "../lib/invite-config-codec";
import { getValidCoordinates } from "../lib/geo-utils";
import { compressImage } from "../lib/image-utils";
import { uploadBackgroundImage, deleteBackgroundImage } from "../lib/storage-utils";
import { clearSession } from "../lib/sessionVars";
import { useCalendar } from "../hooks/useCalendar";
import { useFieldHandlers } from "../hooks/useFieldHandlers";
import { useRsvp } from "../hooks/useRsvp";
import { useMapPreview } from "../hooks/useMapPreview";
import { useSetupAuth } from "../hooks/useSetupAuth";
import { useAutoSave } from "../hooks/useAutoSave";
import LegalModal from "../components/LegalModal";

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

  const [legalModal, setLegalModal] = useState("");
  const [locationMapError, setLocationMapError] = useState("");
  const [locationMapLoading, setLocationMapLoading] = useState(false);
  const [locationMapTarget, setLocationMapTarget] = useState(null);
  const locationMapContainerRef = useRef(null);
  const isSavingRef = useRef(false);
  const loadedTokenRef = useRef("");
  const [visitCount, setVisitCount] = useState(0);
  const trackedRef = useRef(false);

  const trackVisit = useCallback(async (token) => {
    if (!token || trackedRef.current) return;
    trackedRef.current = true;
    try {
      const ref = invitationDocRef(token);
      await updateDoc(ref, { _visits: increment(1) });
    } catch {}
  }, []);

  const location = useLocation();
  const navigate = useNavigate();

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
  } = useSetupAuth(inviteToken, config, setAdminMessage, setAdminMessageType, setHasStoredConfig);

  const {
    rsvpEntries, rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    updateRsvpField, handleRsvpSubmit, handleClearRsvpEntries,
    handleDietaryToggle, dietaryInfoStr, DIETARY_OPTIONS,
  } = useRsvp(inviteToken, setAdminMessage, setAdminMessageType, config.menuEnabled === "true");

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

  const handleAutoSaved = useCallback((payload) => {
    setConfig(payload);
    setFormData(payload);
  }, []);

  const { autoSaveTimerRef } = useAutoSave(hasStoredConfig, inviteToken, formData, config, setSaveMessage, isSavingRef, handleAutoSaved);

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

        if (inviteToken === loadedTokenRef.current && hasStoredConfig) {
          setIsConfigLoading(false);
          return;
        }

        const cached = localStorage.getItem(`wedin_invite_cache_${inviteToken}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.data && parsed.cachedAt && Date.now() - parsed.cachedAt < 120000) {
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
        localStorage.setItem(`wedin_invite_cache_${inviteToken}`, JSON.stringify({ data: hydrated, cachedAt: Date.now() }));
        setVisitCount(typeof snapshot.data()._visits === "number" ? snapshot.data()._visits : 0);
        setHasStoredConfig(true);
        loadedTokenRef.current = inviteToken;
        const firstSegment = location.pathname.split("/").filter(Boolean)[0] || "";
        if (/^[a-zA-Z0-9]{8,12}$/.test(firstSegment) && !["setup", "admin"].includes(firstSegment)) {
          trackVisit(inviteToken);
        }
      } catch {
        if (!hasStoredConfig) {
          setConfigLoadError("No se pudo cargar la configuración. Revisa la conexión e inténtalo de nuevo.");
        }
      } finally {
        setIsConfigLoading(false);
      }
    };
    hydrateConfig();
  }, [location.pathname, location.hash, inviteToken, hasStoredConfig]);

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
    if (hasStoredConfig || !inviteToken) return;
    (async () => { await refreshSetupToken(); })();
  }, [hasStoredConfig, inviteToken, refreshSetupToken]);

  const handleClearBackground = useCallback(() => {
    const storagePath = formData.backgroundImageStorage;
    if (storagePath) {
      deleteBackgroundImage(storagePath);
    }
    applyBackgroundImage("", "", "");
    setFormData(prev => ({ ...prev, backgroundImageStorage: "" }));
  }, [applyBackgroundImage, formData.backgroundImageStorage]);

  const handleSelectPreviewBackground = useCallback(async (backgroundImage, backgroundImageLabel, backgroundImageSource = "openfreemap") => {
    const prevStoragePath = formData.backgroundImageStorage;
    try {
      const { downloadUrl, storagePath } = await uploadBackgroundImage(inviteToken, backgroundImage);
      applyBackgroundImage(downloadUrl, backgroundImageLabel, backgroundImageSource);
      setFormData(prev => ({ ...prev, backgroundImageStorage: storagePath }));
      if (prevStoragePath) deleteBackgroundImage(prevStoragePath);
    } catch {
      applyBackgroundImage(backgroundImage, backgroundImageLabel, backgroundImageSource);
    }
  }, [inviteToken, applyBackgroundImage, formData.backgroundImageStorage]);

  const handleBackgroundUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) { event.target.value = ""; return; }
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
    setSaveMessage("Subiendo imagen...");
    try {
      const dataUrl = await compressImage(file);
      const { downloadUrl, storagePath } = await uploadBackgroundImage(inviteToken, dataUrl);
      applyBackgroundImage(downloadUrl, file.name, "upload");
      setFormData(prev => ({ ...prev, backgroundImageStorage: storagePath }));
      setSaveMessage("");
    } catch {
      setSaveError("No se pudo procesar la imagen. Intenta con otra.");
    }
    event.target.value = "";
  }, [inviteToken, applyBackgroundImage]);

  const handleSaveSetup = useCallback(async (event) => {
    event.preventDefault();
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (isSavingRef.current) {
      setSaveError("Ya se está guardando. Espera un momento.");
      return;
    }
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
      if (formData._privacyConsent !== "true") {
        setSaveError("Debes aceptar la Política de Privacidad para crear la invitación.");
        return;
      }
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
    if (Boolean(sanitized.godparent1) !== Boolean(sanitized.godparent2)) {
      setSaveError("Si escribes un padrino, ambos nombres son obligatorios.");
      return;
    }
    if (orderArray[0] !== "hero") {
      setSaveError("La portada debe ser la primera sección.");
      return;
    }

    let backgroundToSave = sanitized.backgroundImage;
    let storagePathToSave = sanitized.backgroundImageStorage;

    if (backgroundToSave && backgroundToSave.startsWith("data:image/") && !storagePathToSave) {
      try {
        const result = await uploadBackgroundImage(inviteToken, backgroundToSave);
        backgroundToSave = result.downloadUrl;
        storagePathToSave = result.storagePath;
      } catch {}
    }

    const payload = { ...defaultConfig, ...sanitized, backgroundImage: backgroundToSave, backgroundImageStorage: storagePathToSave };
    if (hiddenSet.has("details") && hasStoredConfig) {
      payload.weddingDay = config.weddingDay;
      payload.weddingMonth = config.weddingMonth;
      payload.weddingYear = config.weddingYear;
      payload.weddingHour = config.weddingHour;
      payload.weddingMinute = config.weddingMinute;
    }

    isSavingRef.current = true;
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
    } finally {
      isSavingRef.current = false;
    }
  }, [hasStoredConfig, isTokenVerified, formData, maxAllowedYear, inviteToken, config, autoSaveTimerRef, isSavingRef, setSetupToken, setSetupTokenInput]);

  const handleDeleteInvitation = useCallback(async () => {
    if (!inviteToken) return;
    if (!window.confirm("¿Eliminar toda tu invitación? Se borrarán todos los datos, fotos y confirmaciones. No se puede deshacer.")) return;
    try {
      const snap = await getDocs(rsvpByInviteRef(inviteToken));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(invitationDocRef(inviteToken));
      batch.delete(doc(db, "sessions", inviteToken));
      await batch.commit();
      const paths = [formData.backgroundImageStorage, formData.couplePhotoStorage].filter(Boolean);
      await Promise.allSettled(paths.map((p) => deleteObject(ref(storage, p)).catch(() => {})));
      localStorage.removeItem(`wedin_invite_cache_${inviteToken}`);
      clearSession();
      setIsTokenVerified(false);
      setTokenLoginUsername("");
      navigate("/");
    } catch {
      setSaveError("No se pudo eliminar la invitación. Inténtalo de nuevo.");
    }
  }, [inviteToken, formData.backgroundImageStorage, formData.couplePhotoStorage, navigate]);

  const value = useMemo(() => ({
    config, formData, hasStoredConfig,
    isConfigLoading, configLoadError, inviteToken,
    legalModal, setLegalModal,
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
    rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    maxAllowedYear, isAdminTokenLoggedIn,
    formattedDate, formattedTime, calendarLink, dietaryInfoStr, DIETARY_OPTIONS,
    updateFormField, refreshSetupToken, reloadConfig,
    handleSaveSetup, handleRsvpSubmit, updateRsvpField,
    handleDietaryToggle,
    handleTokenLogin, handleAdminTokenLogin, handleGenerateToken,
    handleAdminLogout,
    handleResetSetupToken, handleResetTokenFromAdmin,
    handleClearRsvpEntries,
    handleDeleteInvitation,
    handleBackgroundUpload, handleClearBackground, handleSelectPreviewBackground,
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange,
    confirmTokenInput, setConfirmTokenInput,
    visitCount,
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
    rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    maxAllowedYear, isAdminTokenLoggedIn,
    formattedDate, formattedTime, calendarLink, dietaryInfoStr, DIETARY_OPTIONS,
    updateFormField, refreshSetupToken, reloadConfig,
    handleSaveSetup, handleRsvpSubmit, updateRsvpField,
    handleDietaryToggle,
    handleTokenLogin, handleAdminTokenLogin, handleGenerateToken,
    handleAdminLogout,
    handleResetSetupToken, handleResetTokenFromAdmin,
    handleClearRsvpEntries,
    handleDeleteInvitation,
    handleBackgroundUpload, handleClearBackground, handleSelectPreviewBackground,
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange,
    confirmTokenInput, setConfirmTokenInput,
    visitCount, legalModal,
  ]);

  return (
    <AppContext.Provider value={value}>
      {legalModal && <LegalModal section={legalModal} onClose={() => setLegalModal("")} />}
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de AppProvider");
  return context;
}
