import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { getDoc, setDoc, increment, updateDoc, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db, invitationDocRef, rsvpByInviteRef } from "../lib/firebase";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES, defaultConfig, MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER, STORY_SECTION_ORDER, THEME_VALUES } from "../lib/constants";
import { normalizeConfig } from "../lib/normalize-config";
import { decodeInviteConfig } from "../lib/invite-config-codec";
import { compressImage } from "../lib/image-utils";
import { uploadImage, loadDecryptedField, deleteGallery } from "../lib/image-store";
import { saveSession, clearSession } from "../lib/sessionVars";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { useCalendar } from "../hooks/useCalendar";
import { useFieldHandlers } from "../hooks/useFieldHandlers";
import { useRsvp } from "../hooks/useRsvp";
import { useMapPreview } from "../hooks/useMapPreview";
import { useSetupAuth } from "../hooks/useSetupAuth";
import { useAutoSave } from "../hooks/useAutoSave";
import LegalModal from "../components/LegalModal";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { t } = useTranslation();
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

  const { autoSaveTimerRef } = useAutoSave(hasStoredConfig, inviteToken, formData, config, setSaveMessage, isSavingRef);

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
          setConfigLoadError(t("errors.invalidLink"));
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

        const cached = safeGetItem(`wedin_invite_cache_${inviteToken}`);
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
        if (parsed.bankInfo) parsed.bankInfo = await decrypt(parsed.bankInfo, inviteToken);
        if (parsed.backgroundImage) parsed.backgroundImage = await loadDecryptedField(inviteToken, parsed.backgroundImage);
        if (parsed.couplePhoto) parsed.couplePhoto = await loadDecryptedField(inviteToken, parsed.couplePhoto);
        const hydrated = { ...defaultConfig, ...parsed };
        setConfig(hydrated);
        setFormData(hydrated);
        safeSetItem(`wedin_invite_cache_${inviteToken}`, JSON.stringify({ data: hydrated, cachedAt: Date.now() }));
        setVisitCount(typeof snapshot.data()._visits === "number" ? snapshot.data()._visits : 0);
        setHasStoredConfig(true);
        loadedTokenRef.current = inviteToken;
        const firstSegment = location.pathname.split("/").filter(Boolean)[0] || "";
        if (/^[a-zA-Z0-9]{8,12}$/.test(firstSegment) && !["setup", "admin"].includes(firstSegment) && safeGetItem("wedin_cookie_consent") === "accepted") {
          trackVisit(inviteToken);
        }
      } catch {
        if (!hasStoredConfig) {
          setConfigLoadError(t("errors.configLoadFailed"));
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
      safeRemoveItem(`wedin_invite_cache_${inviteToken}`);
      const snapshot = await getDoc(invitationDocRef(inviteToken));
      if (!snapshot.exists()) {
        setHasStoredConfig(false);
        setConfig(defaultConfig);
        setFormData(defaultConfig);
        return;
      }
      const parsed = normalizeConfig(snapshot.data());
      if (parsed.bankInfo) parsed.bankInfo = await decrypt(parsed.bankInfo, inviteToken);
      if (parsed.backgroundImage) parsed.backgroundImage = await loadDecryptedField(inviteToken, parsed.backgroundImage);
      if (parsed.couplePhoto) parsed.couplePhoto = await loadDecryptedField(inviteToken, parsed.couplePhoto);
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
    applyBackgroundImage("", "", "");
    setFormData(prev => ({ ...prev, backgroundImage: "" }));
  }, [applyBackgroundImage]);

  const handleSelectPreviewBackground = useCallback(async (imageDataUrl, label, source = "openfreemap") => {
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], "preview.jpg", { type: "image/jpeg" });
      const { dataUrl } = await uploadImage(inviteToken, file);
      setFormData(prev => ({ ...prev, backgroundImage: dataUrl }));
      applyBackgroundImage(dataUrl, label, source);
    } catch {
      applyBackgroundImage(imageDataUrl, label, source);
    }
  }, [inviteToken, applyBackgroundImage]);

  const handleBackgroundUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) { event.target.value = ""; return; }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setSaveError(t("errors.fileFormat"));
      event.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setSaveError(t("errors.fileSize"));
      event.target.value = "";
      return;
    }
    setSaveError("");
    setSaveMessage(t("errors.uploadingImage"));
    try {
      const { dataUrl } = await uploadImage(inviteToken, file);
      setFormData(prev => ({ ...prev, backgroundImage: dataUrl }));
      applyBackgroundImage(dataUrl, file.name, "upload");
      setSaveMessage("");
    } catch {
      setSaveError(t("errors.imageProcessingFailed"));
    }
    event.target.value = "";
  }, [inviteToken, applyBackgroundImage]);

  const handleSaveSetup = useCallback(async (event) => {
    event.preventDefault();
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (isSavingRef.current) {
      setSaveError(t("errors.alreadySaving"));
      return;
    }
    setSaveError("");
    setSaveMessage("");

    if (!hasStoredConfig && !isTokenVerified && !setupToken) {
      setSaveError(t("errors.verifyTokenFirst"));
      return;
    }

    const sanitized = normalizeConfig(formData);
    const hiddenArray = (sanitized.hiddenSections || "").split(",").filter(Boolean).filter(s => s !== "menu" && s !== "transport" && s !== "godparents");
    const hiddenSet = new Set(hiddenArray);

    if (!hasStoredConfig) {
      if (formData._privacyConsent !== "true") {
        setSaveError(t("errors.acceptPrivacyPolicy"));
        return;
      }
      if (!sanitized.adminUsername) {
        setSaveError(t("errors.usernameRequired"));
        return;
      }
      if (!/^[a-zA-Z0-9]+$/.test(sanitized.adminUsername)) {
        setSaveError(t("errors.usernameInvalid"));
        return;
      }
      if (sanitized.adminUsername.length > 50) {
        setSaveError(t("errors.usernameTooLong"));
        return;
      }
    }

    if (!sanitized.firstName || !sanitized.secondName) {
      setSaveError(t("errors.bothNamesRequired"));
      return;
    }

    if (!hiddenSet.has("details") || !hasStoredConfig) {
      if (!sanitized.weddingDay || !sanitized.weddingMonth || !sanitized.weddingYear || !sanitized.weddingHour || !sanitized.weddingMinute) {
        setSaveError(t("errors.dateIncomplete"));
        return;
      }
      const parsedDay = Number.parseInt(sanitized.weddingDay, 10);
      if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        setSaveError(t("errors.dayInvalid"));
        return;
      }
      if (!MONTH_OPTIONS.some((monthOption) => monthOption.value === sanitized.weddingMonth)) {
        setSaveError(t("errors.monthInvalid"));
        return;
      }
      const parsedHour = Number.parseInt(sanitized.weddingHour, 10);
      if (Number.isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23) {
        setSaveError(t("errors.hourInvalid"));
        return;
      }
      const parsedMinute = Number.parseInt(sanitized.weddingMinute, 10);
      if (Number.isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
        setSaveError(t("errors.minuteInvalid"));
        return;
      }
      const parsedYear = Number.parseInt(sanitized.weddingYear, 10);
      const monthNum = MONTH_VALUE_TO_NUMBER[sanitized.weddingMonth];
      const enteredDate = new Date(parsedYear, monthNum - 1, parsedDay,
        Number.parseInt(sanitized.weddingHour, 10), Number.parseInt(sanitized.weddingMinute, 10));
      if (enteredDate.getDate() !== parsedDay || enteredDate.getMonth() !== monthNum - 1 || enteredDate.getFullYear() !== parsedYear) {
        setSaveError(t("errors.dateNotValid"));
        return;
      }
      const today = new Date();
      today.setSeconds(0, 0);
      if (enteredDate < today) {
        setSaveError(t("errors.dateBeforeToday"));
        return;
      }
      if (Number.isNaN(parsedYear) || parsedYear > maxAllowedYear) {
        setSaveError(t("errors.yearTooFar", { year: maxAllowedYear }));
        return;
      }
    }

    if (!THEME_VALUES.has(sanitized.theme)) {
      setSaveError(t("errors.themeInvalid"));
      return;
    }

    const orderArray = (sanitized.sectionOrder || "").split(",").filter(Boolean).filter(s => !["menu", "transport", "godparents"].includes(s));
    const validSectionKeys = new Set(STORY_SECTION_ORDER);
    if (orderArray.length < 1 || !orderArray.every((s) => validSectionKeys.has(s))) {
      setSaveError(t("errors.sectionOrderInvalid"));
      return;
    }
    if (!hiddenArray.every((s) => validSectionKeys.has(s))) {
      setSaveError(t("errors.hiddenSectionsInvalid"));
      return;
    }
    if (Boolean(sanitized.godparent1) !== Boolean(sanitized.godparent2)) {
      setSaveError(t("errors.godparentsRequired"));
      return;
    }
    if (orderArray[0] !== "hero") {
      setSaveError(t("errors.coverFirst"));
      return;
    }

    if (sanitized.menuEnabled === "true") {
      if (!sanitized.menuPostre) {
        setSaveError(t("errors.postreRequired"));
        return;
      }
      if (!sanitized.menuCarne && !sanitized.menuPescado && !sanitized.menuVegano) {
        setSaveError(t("errors.menuRequired"));
        return;
      }
    }
    if (sanitized.menuEnabled !== "true" && !sanitized.menuTexto) {
      setSaveError(t("errors.menuTextRequired"));
      return;
    }

    if (sanitized.bankInfo && !/^[A-Z]{2}\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{0,4}$/.test(sanitized.bankInfo.toUpperCase())) {
      setSaveError(t("errors.ibanInvalid"));
      return;
    }

    if (sanitized.musicUrl && !/^https?:\/\/.+\..+/.test(sanitized.musicUrl)) {
      setSaveError(t("errors.musicUrlInvalid"));
      return;
    }

    if (sanitized.galleryImages) {
      try { JSON.parse(sanitized.galleryImages); } catch {
        setSaveError(t("errors.galleryFormatInvalid"));
        return;
      }
    }

    if (sanitized.sectionOrder) {
      const expected = STORY_SECTION_ORDER.length;
      const actual = orderArray.length;
      if (actual !== expected) {
        setSaveError(t("errors.sectionOrderMismatch", { actual, expected }));
        return;
      }
    }

    if (sanitized.inviteMessage && sanitized.inviteMessage.length > 500) {
      setSaveError(t("errors.messageTooLong"));
      return;
    }
    if (sanitized.weddingSchedule && sanitized.weddingSchedule.length > 2000) {
      setSaveError(t("errors.scheduleTooLong"));
      return;
    }
    if (sanitized.storyText && sanitized.storyText.length > 2000) {
      setSaveError(t("errors.storyTooLong"));
      return;
    }
    if (sanitized.giftsInfo && sanitized.giftsInfo.length > 2000) {
      setSaveError(t("errors.giftsTooLong"));
      return;
    }
    if (sanitized.transportInfo && sanitized.transportInfo.length > 2000) {
      setSaveError(t("errors.transportTooLong"));
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

    isSavingRef.current = true;
    try {
      const bgOrig = payload.backgroundImage?.startsWith("data:") ? payload.backgroundImage : null;
      const cpOrig = payload.couplePhoto?.startsWith("data:") ? payload.couplePhoto : null;
      if (payload.bankInfo) payload.bankInfo = await encrypt(payload.bankInfo, inviteToken);
      if (bgOrig) payload.backgroundImage = await encrypt(bgOrig, inviteToken);
      if (cpOrig) payload.couplePhoto = await encrypt(cpOrig, inviteToken);
      if (!hasStoredConfig) payload.privacyPolicyVersion = "2026-07-07";
      await setDoc(invitationDocRef(inviteToken), payload);
      if (payload.bankInfo) payload.bankInfo = await decrypt(payload.bankInfo, inviteToken);
      if (bgOrig) payload.backgroundImage = bgOrig;
      if (cpOrig) payload.couplePhoto = cpOrig;
      setConfig(payload);
      setFormData(payload);
      setHasStoredConfig(true);
      setSetupToken("");
      setSetupTokenInput("");
      if (!isTokenVerified) {
        try {
          await setDoc(doc(db, "sessions", inviteToken), { createdAt: serverTimestamp() });
          setIsTokenVerified(true);
          setTokenLoginUsername(config.adminUsername || inviteToken);
          saveSession("admin", config.adminUsername || inviteToken);
        } catch {}
      }
      setSaveMessage(t("errors.configSaved"));
    } catch {
      setSaveError(t("errors.configSaveFailed"));
    } finally {
      isSavingRef.current = false;
    }
  }, [hasStoredConfig, isTokenVerified, formData, maxAllowedYear, inviteToken, config, autoSaveTimerRef, isSavingRef, setSetupToken, setSetupTokenInput]);

  const handleDeleteInvitation = useCallback(async () => {
    if (!inviteToken) return;
    if (!window.confirm(t("errors.deleteConfirm"))) return;
    try {
      const snap = await getDocs(rsvpByInviteRef(inviteToken));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await deleteGallery(inviteToken);
      batch.delete(invitationDocRef(inviteToken));
      batch.delete(doc(db, "sessions", inviteToken));
      await batch.commit();
      safeRemoveItem(`wedin_invite_cache_${inviteToken}`);
      clearSession();
      setIsTokenVerified(false);
      setTokenLoginUsername("");
      navigate("/");
    } catch {
      setSaveError(t("errors.deleteFailed"));
    }
  }, [inviteToken, navigate]);

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
