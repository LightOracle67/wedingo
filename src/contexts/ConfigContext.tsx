import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { getDoc, setDoc, increment, updateDoc, getDocs, writeBatch } from "firebase/firestore";
import { db, invitationDocRef, rsvpByInviteRef } from "../lib/firebase";
import {
  ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES, defaultConfig, STORY_SECTION_ORDER,
  THEME_VALUES, MAX_YEARS_AHEAD, INVITE_CACHE_TTL_MS, TOKEN_ROUTE_REGEX,
  SPECIAL_SECTIONS, MAX_USERNAME_LENGTH, MAX_INVITE_MESSAGE_LENGTH,
  MAX_LONG_TEXT_LENGTH, PRIVACY_POLICY_VERSION,
} from "../lib/constants";
import { normalizeConfig } from "../lib/normalize-config";
import { decodeInviteConfig } from "../lib/invite-config-codec";
import { uploadImage, loadDecryptedField, deleteGallery } from "../lib/image-store";
import { clearSession } from "../lib/sessionVars";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { useCalendar } from "../hooks/useCalendar";
import { useFieldHandlers } from "../hooks/useFieldHandlers";
import { useMapPreview } from "../hooks/useMapPreview";
import { useAutoSave } from "../hooks/useAutoSave";
import { validateWeddingDate } from "../lib/date-utils";
import { useAppUI } from "./UIContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ConfigContext = createContext<any>(null);

export function ConfigProvider({ children }: any) {
  const { t } = useTranslation();
  const { setSaveMessage, setSaveError } = useAppUI();
  const location = useLocation();
  const navigate = useNavigate();

  const maxAllowedYear = new Date().getFullYear() + MAX_YEARS_AHEAD;

  const [config, setConfig] = useState<any>(defaultConfig);
  const [formData, setFormData] = useState<any>(defaultConfig);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configLoadError, setConfigLoadError] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [visitCount, setVisitCount] = useState(0);

  const isSavingRef = useRef(false);
  const loadedTokenRef = useRef("");
  const trackedRef = useRef(false);

  const { formattedDate, formattedTime, calendarLink } = useCalendar(config);

  const updateFormField = useCallback((field: any, value: any) => {
    setFormData((current: any) => ({ ...current, [field]: value }));
  }, []);

  const applyBackgroundImage = useCallback((backgroundImage: any, backgroundImageLabel: any, backgroundImageSource: any) => {
    setFormData((current: any) => ({
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

  const onFirstSaveCallbacksRef = useRef<any[]>([]);

  const registerOnFirstSave = useCallback((cb: any) => {
    (onFirstSaveCallbacksRef.current as any[]).push(cb);
  }, []);

  const trackVisit = useCallback(async (token: any) => {
    if (!token || trackedRef.current) return;
    trackedRef.current = true;
    try {
      const ref = invitationDocRef(token);
      await updateDoc(ref, { _visits: increment(1) });
    } catch {}
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const isInvite = new URLSearchParams(window.location.search).has("invitar");
    const pathParts = location.pathname.split("/").filter(Boolean);
    const firstSegment = pathParts[0] || "";
    const isTokenRoute = TOKEN_ROUTE_REGEX.test(firstSegment) && !["setup", "admin", "superadmin-login", "superadmin"].includes(firstSegment);
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
            if (parsed.data && parsed.cachedAt && Date.now() - parsed.cachedAt < INVITE_CACHE_TTL_MS) {
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
        {
          const cached = sessionStorage.getItem(`wedin_audio_${inviteToken}`);
          if (cached) { parsed.musicFile = cached; }
          else {
            const { loadAudio } = await import("../lib/music-store");
            const audio = await loadAudio(inviteToken);
            if (audio?.url) {
              parsed.musicFile = audio.url;
            } else if (parsed.musicFile) {
              parsed.musicFile = await loadDecryptedField(inviteToken, parsed.musicFile);
            }
            if (parsed.musicFile) sessionStorage.setItem(`wedin_audio_${inviteToken}`, parsed.musicFile);
          }
        }
        const hydrated = { ...defaultConfig, ...parsed };
        setConfig(hydrated);
        setFormData(hydrated);
        safeSetItem(`wedin_invite_cache_${inviteToken}`, JSON.stringify({ data: hydrated, cachedAt: Date.now() }));
        setVisitCount(typeof snapshot.data()._visits === "number" ? snapshot.data()._visits : 0);
        setHasStoredConfig(true);
        loadedTokenRef.current = inviteToken;
        const firstSegment = location.pathname.split("/").filter(Boolean)[0] || "";
        if (TOKEN_ROUTE_REGEX.test(firstSegment) && !["setup", "admin"].includes(firstSegment) && safeGetItem("wedin_cookie_consent") === "accepted") {
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
  }, [location.pathname, location.hash, inviteToken, hasStoredConfig, trackVisit, t]);

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
      if (parsed.musicFile) parsed.musicFile = await loadDecryptedField(inviteToken, parsed.musicFile);
      const hydrated = { ...defaultConfig, ...parsed };
      setConfig(hydrated);
      setFormData(hydrated);
      setHasStoredConfig(true);
    } catch {}
  }, [inviteToken]);

  const handleClearBackground = useCallback(() => {
    applyBackgroundImage("", "", "");
    setFormData((prev: any) => ({ ...prev, backgroundImage: "", backgroundImageStorage: "" }));
  }, [applyBackgroundImage]);

  const handleSelectPreviewBackground = useCallback(async (imageDataUrl: any, label: any, source = "openfreemap") => {
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], "preview.jpg", { type: "image/jpeg" });
      const { dataUrl } = await uploadImage(inviteToken, file);
      setFormData((prev: any) => ({ ...prev, backgroundImage: dataUrl }));
      applyBackgroundImage(dataUrl, label, source);
    } catch {
      applyBackgroundImage(imageDataUrl, label, source);
    }
  }, [inviteToken, applyBackgroundImage]);

  const handleBackgroundUpload = useCallback(async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) { event.target.value = ""; return; }
    if (file.size === 0) { setSaveError(t("errors.fileEmpty")); event.target.value = ""; return; }
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
      setFormData((prev: any) => ({ ...prev, backgroundImage: dataUrl }));
      applyBackgroundImage(dataUrl, file.name, "upload");
      setSaveMessage("");
    } catch {
      setSaveError(t("errors.imageProcessingFailed"));
    }
    event.target.value = "";
  }, [inviteToken, applyBackgroundImage, t, setSaveError, setSaveMessage]);

  const handleSaveSetupCore = useCallback(async (event: any) => {
    event.preventDefault();
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (isSavingRef.current) {
      setSaveError(t("errors.alreadySaving"));
      return;
    }
    setSaveError("");
    setSaveMessage("");

    const sanitized = normalizeConfig(formData);
    const hiddenArray = (sanitized.hiddenSections || "").split(",").filter(Boolean).filter((s: any) => !SPECIAL_SECTIONS.includes(s));
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
      if (sanitized.adminUsername.length > MAX_USERNAME_LENGTH) {
        setSaveError(t("errors.usernameTooLong"));
        return;
      }
    }

    if (!sanitized.firstName || !sanitized.secondName) {
      setSaveError(t("errors.bothNamesRequired"));
      return;
    }

    const dateErrorKey = validateWeddingDate(sanitized, maxAllowedYear, hiddenSet, hasStoredConfig);
    if (dateErrorKey) {
      setSaveError(t(dateErrorKey, { year: maxAllowedYear }));
      return;
    }

    if (!THEME_VALUES.has(sanitized.theme)) {
      setSaveError(t("errors.themeInvalid"));
      return;
    }

    const orderArray = (sanitized.sectionOrder || "").split(",").filter(Boolean).filter((s: any) => !SPECIAL_SECTIONS.includes(s));
    const validSectionKeys = new Set(STORY_SECTION_ORDER);
    if (orderArray.length < 1 || !orderArray.every((s: any) => validSectionKeys.has(s))) {
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

    if (sanitized.bankInfo) {
      const upper = sanitized.bankInfo.toUpperCase();
      const looksLikeIban = /^[A-Z]{2}\d/.test(upper);
      if (looksLikeIban && !/^[A-Z]{2}\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{0,4}$/.test(upper)) {
        setSaveError(t("errors.ibanInvalid"));
        return;
      }
    }

    if (sanitized.musicUrl && sanitized.musicUrl.startsWith("data:")) {
      sanitized.musicFile = sanitized.musicUrl;
      sanitized.musicUrl = "";
    }

    if (sanitized.sectionOrder) {
      const expected = STORY_SECTION_ORDER.length;
      const actual = orderArray.length;
      if (actual !== expected) {
        setSaveError(t("errors.sectionOrderMismatch", { actual, expected }));
        return;
      }
    }

    if (sanitized.inviteMessage && sanitized.inviteMessage.length > MAX_INVITE_MESSAGE_LENGTH) {
      setSaveError(t("errors.messageTooLong"));
      return;
    }
    if (sanitized.weddingSchedule && sanitized.weddingSchedule.length > MAX_LONG_TEXT_LENGTH) {
      setSaveError(t("errors.scheduleTooLong"));
      return;
    }
    if (sanitized.storyText && sanitized.storyText.length > MAX_LONG_TEXT_LENGTH) {
      setSaveError(t("errors.storyTooLong"));
      return;
    }
    if (sanitized.giftsInfo && sanitized.giftsInfo.length > MAX_LONG_TEXT_LENGTH) {
      setSaveError(t("errors.giftsTooLong"));
      return;
    }
    if (sanitized.transportInfo && sanitized.transportInfo.length > MAX_LONG_TEXT_LENGTH) {
      setSaveError(t("errors.transportTooLong"));
      return;
    }
    if (sanitized.accommodationInfo && sanitized.accommodationInfo.length > MAX_LONG_TEXT_LENGTH) {
      setSaveError(t("errors.accommodationTooLong"));
      return;
    }
    if (sanitized.menuTexto && sanitized.menuTexto.length > MAX_LONG_TEXT_LENGTH) {
      setSaveError(t("errors.menuTextoTooLong"));
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
      const mfOrig = payload.musicFile?.startsWith("data:") ? payload.musicFile : null;
      if (payload.bankInfo) payload.bankInfo = await encrypt(payload.bankInfo, inviteToken);
      if (bgOrig) payload.backgroundImage = await encrypt(bgOrig, inviteToken);
      if (cpOrig) payload.couplePhoto = await encrypt(cpOrig, inviteToken);
      delete payload.musicFile;
      payload.privacyPolicyVersion = PRIVACY_POLICY_VERSION;
      await setDoc(invitationDocRef(inviteToken), payload, { merge: true });
      if (payload.bankInfo) payload.bankInfo = await decrypt(payload.bankInfo, inviteToken);
      if (bgOrig) payload.backgroundImage = bgOrig;
      if (cpOrig) payload.couplePhoto = cpOrig;
      if (mfOrig) payload.musicFile = mfOrig;
      setConfig(payload);
      setFormData(payload);
      setHasStoredConfig(true);

      for (const cb of onFirstSaveCallbacksRef.current) cb();

      setSaveMessage(t("errors.configSaved"));
    } catch {
      setSaveError(t("errors.configSaveFailed"));
    } finally {
      isSavingRef.current = false;
    }
  }, [hasStoredConfig, formData, maxAllowedYear, inviteToken, config, autoSaveTimerRef, isSavingRef, t, setSaveError, setSaveMessage]);

  const handleDeleteInvitation = useCallback(async () => {
    if (!inviteToken) return;
    if (!window.confirm(t("errors.deleteConfirm"))) return;
    try {
      const snap = await getDocs(rsvpByInviteRef(inviteToken));
      const batch = writeBatch(db);
      snap.docs.forEach((d: any) => batch.delete(d.ref));
      await deleteGallery(inviteToken);
      batch.delete(invitationDocRef(inviteToken));
      await batch.commit();
      safeRemoveItem(`wedin_invite_cache_${inviteToken}`);
      clearSession();
      navigate("/");
    } catch {
      setSaveError(t("errors.deleteFailed"));
    }
  }, [inviteToken, navigate, t, setSaveError]);

  const configValue = useMemo(() => ({
    config, formData, hasStoredConfig, isConfigLoading, configLoadError, inviteToken,
    maxAllowedYear, previewBackgrounds, isPreviewLoading,
    formattedDate, formattedTime, calendarLink, visitCount,
    updateFormField, reloadConfig, handleSaveSetup: handleSaveSetupCore,
    handleBackgroundUpload, handleClearBackground, handleSelectPreviewBackground,
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange, handleDeleteInvitation,
    setHasStoredConfig, registerOnFirstSave,
  }), [
    config, formData, hasStoredConfig, isConfigLoading, configLoadError, inviteToken,
    maxAllowedYear, previewBackgrounds, isPreviewLoading,
    formattedDate, formattedTime, calendarLink, visitCount,
    updateFormField, reloadConfig, handleSaveSetupCore,
    handleBackgroundUpload, handleClearBackground, handleSelectPreviewBackground,
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange, handleDeleteInvitation,
    setHasStoredConfig, registerOnFirstSave,
  ]);

  return (
    <ConfigContext.Provider value={configValue}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig debe usarse dentro de AppProvider");
  return ctx;
}
