import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { getDoc, setDoc, increment, updateDoc, getDocs, writeBatch, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { db, invitationDocRef, rsvpByInviteRef } from "../lib/firebase";
import {
  defaultConfig, STORY_SECTION_ORDER,
  THEME_VALUES, MAX_YEARS_AHEAD, INVITE_CACHE_TTL_MS, TOKEN_ROUTE_REGEX,
  SPECIAL_SECTIONS, MAX_USERNAME_LENGTH, MAX_INVITE_MESSAGE_LENGTH,
  MAX_LONG_TEXT_LENGTH, PRIVACY_POLICY_VERSION,
} from "../lib/constants";
import { normalizeConfig } from "../lib/normalize-config";
import type { InvitationConfig } from "../types";
import { decodeInviteConfig } from "../lib/invite-config-codec";
import { deleteGallery } from "../lib/image-store";
import { clearSession } from "../lib/sessionVars";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { useCalendar } from "../hooks/useCalendar";
import { useFieldHandlers } from "../hooks/useFieldHandlers";
import { useMapPreview } from "../hooks/useMapPreview";
import { useAutoSave } from "../hooks/useAutoSave";
import { getFirestoreErrorMessage } from "../lib/error-utils";
import { validateWeddingDate } from "../lib/date-utils";
import { ConfigContext } from "./useConfig";
import { useAppUI } from "./useAppUI";

export function ConfigProvider({ children }: { children: ReactNode }) {
  console.log("[app]", "[ConfigProvider]", "mount", {});
  const { t } = useTranslation();
  const { setSaveMessage, setSaveError } = useAppUI();
  const location = useLocation();
  const navigate = useNavigate();

  const maxAllowedYear = new Date().getFullYear() + MAX_YEARS_AHEAD;

  const [config, setConfig] = useState<InvitationConfig>(defaultConfig as InvitationConfig);
  const [formData, setFormData] = useState<InvitationConfig>(defaultConfig as InvitationConfig);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configLoadError, setConfigLoadError] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [visitCount, setVisitCount] = useState(0);

  const isSavingRef = useRef(false);
  const loadedTokenRef = useRef("");
  const trackedRef = useRef(false);

  const { formattedDate, formattedTime, calendarLink } = useCalendar(config);

  const updateFormField = useCallback((field: string, value: string) => {
    console.log("[app]", "[ConfigProvider]", "updateFormField", { field, value });
    setFormData((current: InvitationConfig) => ({ ...current, [field]: value }));
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

  const onFirstSaveCallbacksRef = useRef<(() => void)[]>([]);

  const registerOnFirstSave = useCallback((cb: () => void) => {
    onFirstSaveCallbacksRef.current.push(cb);
  }, []);

  const trackVisit = useCallback(async (token: string) => {
    if (!token || trackedRef.current) { console.log("[app]", "[ConfigProvider]", "trackVisit skipped", { token, alreadyTracked: trackedRef.current }); return; }
    trackedRef.current = true;
    console.log("[app]", "[ConfigProvider]", "trackVisit start", { token });
    try {
      const ref = invitationDocRef(token);
      await updateDoc(ref, { _visits: increment(1) });
      console.log("[app]", "[ConfigProvider]", "trackVisit success", { token });
    } catch (e) {
      console.warn("[app]", "[ConfigProvider]", "trackVisit failed:", getFirestoreErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const isInvite = new URLSearchParams(window.location.search).has("invitar");
    const pathParts = location.pathname.split("/").filter(Boolean);
    const firstSegment = pathParts[0] || "";
    const isTokenRoute = TOKEN_ROUTE_REGEX.test(firstSegment) && !["setup", "admin", "superadmin-login", "superadmin"].includes(firstSegment);
    const isAdminRoute = pathParts[1] === "setup" || pathParts[1] === "admin";
    console.log("[app]", "[ConfigProvider]", "path/hash changed", { hash, isInvite, firstSegment, isTokenRoute, isAdminRoute, inviteToken, hasStoredConfig });

    if (hash && hash.length > 1) {
      console.log("[app]", "[ConfigProvider]", "hash detected, trying decodeInviteConfig", { hashLength: hash.length });
      try {
        const parsed = decodeInviteConfig(hash.slice(1));
        const hydrated = { ...defaultConfig, ...normalizeConfig(parsed) };
        console.log("[app]", "[ConfigProvider]", "hash config decoded", { firstName: hydrated.firstName });
        setConfig(hydrated);
        setFormData(hydrated);
        setHasStoredConfig(false);
        setIsConfigLoading(false);
        return;
      } catch {
        console.log("[app]", "[ConfigProvider]", "hash decode failed", {});
        if (isInvite) {
          setIsConfigLoading(false);
          setConfigLoadError(t("errors.invalidLink"));
          return;
        }
      }
    }

    if (isInvite && !isTokenRoute) {
      console.log("[app]", "[ConfigProvider]", "invite mode but no token route, skip loading", {});
      setIsConfigLoading(false);
      return;
    }

    if (isTokenRoute && inviteToken !== firstSegment) {
      console.log("[app]", "[ConfigProvider]", "new token detected, updating inviteToken", { newToken: firstSegment, oldToken: inviteToken });
      setInviteToken(firstSegment);
      setIsConfigLoading(true);
      return;
    }

    if (!isAdminRoute && !isTokenRoute) {
      console.log("[app]", "[ConfigProvider]", "not a token/admin route, skip loading", { isAdminRoute, isTokenRoute });
      setIsConfigLoading(false);
      return;
    }

    console.log("[app]", "[ConfigProvider]", "starting hydrateConfig", {});
    setIsConfigLoading(true);

    const hydrateConfig = async () => {
      setConfigLoadError("");
      try {
        if (!inviteToken) { console.log("[app]", "[ConfigProvider]", "no inviteToken, done", {}); setIsConfigLoading(false); return; }

        if (inviteToken === loadedTokenRef.current && hasStoredConfig) {
          console.log("[app]", "[ConfigProvider]", "config already loaded, skip", { loadedToken: loadedTokenRef.current });
          setIsConfigLoading(false);
          return;
        }

        const cached = safeGetItem(`wedin_invite_cache_${inviteToken}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.data && parsed.cachedAt && Date.now() - parsed.cachedAt < INVITE_CACHE_TTL_MS) {
              console.log("[app]", "[ConfigProvider]", "using cached config", { inviteToken, cacheAge: Date.now() - parsed.cachedAt });
              const { resolveAllConfigImages } = await import("../lib/image-store");
              const resolved = await resolveAllConfigImages(inviteToken, parsed.data);
              for (const [key, url] of Object.entries(resolved)) {
                if (url) parsed.data[key] = url;
              }
              setConfig(parsed.data);
              setFormData(parsed.data);
              setHasStoredConfig(true);
              setIsConfigLoading(false);
              loadedTokenRef.current = inviteToken;
              return;
            } else {
              console.log("[app]", "[ConfigProvider]", "cache expired", { cacheAge: parsed.cachedAt ? Date.now() - parsed.cachedAt : "unknown", ttl: INVITE_CACHE_TTL_MS });
            }
          } catch { console.log("[app]", "[ConfigProvider]", "cache parse error", {}); }
        } else {
          console.log("[app]", "[ConfigProvider]", "no cache found", {});
        }

        console.log("[app]", "[ConfigProvider]", "fetching from Firestore", { inviteToken });
        const snapshot = await getDoc(invitationDocRef(inviteToken));
        if (!snapshot.exists()) {
          console.log("[app]", "[ConfigProvider]", "Firestore doc does not exist", { inviteToken });
          setHasStoredConfig(false);
          setConfig(defaultConfig);
          setFormData(defaultConfig);
          setIsConfigLoading(false);
          return;
        }
        const parsed = normalizeConfig(snapshot.data());
        if (parsed.bankInfo) { console.log("[app]", "[ConfigProvider]", "decrypting bankInfo", {}); parsed.bankInfo = await decrypt(parsed.bankInfo, inviteToken); }
        const { resolveAllConfigImages } = await import("../lib/image-store");
        const resolved = await resolveAllConfigImages(inviteToken, parsed);
        for (const [key, url] of Object.entries(resolved)) {
          if (url) (parsed as Record<string, unknown>)[key] = url;
        }
        {
          console.log("[app]", "[ConfigProvider]", "loading audio", {});
          const { loadAudio } = await import("../lib/music-store");
          const audio = await loadAudio(inviteToken);
          if (audio?.url) {
            parsed.musicFile = audio.url;
            sessionStorage.setItem(`wedin_audio_${inviteToken}`, audio.url);
          } else {
            sessionStorage.removeItem(`wedin_audio_${inviteToken}`);
          }
        }
        const hydrated = { ...defaultConfig, ...parsed };
        console.log("[app]", "[ConfigProvider]", "config loaded from Firestore", { firstName: hydrated.firstName, hasBankInfo: !!hydrated.bankInfo });
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
      } catch (e) {
        console.error("[app]", "[ConfigProvider]", "hydrateConfig error", { error: e });
        if (!hasStoredConfig) {
          setConfigLoadError(getFirestoreErrorMessage(e, t));
        }
      } finally {
        console.log("[app]", "[ConfigProvider]", "hydrateConfig done", {});
        setIsConfigLoading(false);
      }
    };
    hydrateConfig();
  }, [location.pathname, location.hash, inviteToken, hasStoredConfig, trackVisit, t]);

  const reloadConfig = useCallback(async () => {
    console.log("[app]", "[ConfigProvider]", "reloadConfig start", { inviteToken });
    if (!inviteToken) { console.log("[app]", "[ConfigProvider]", "reloadConfig skipped, no inviteToken", {}); return; }
    try {
      safeRemoveItem(`wedin_invite_cache_${inviteToken}`);
      const snapshot = await getDoc(invitationDocRef(inviteToken));
      if (!snapshot.exists()) {
        console.log("[app]", "[ConfigProvider]", "reloadConfig: doc not found", {});
        setHasStoredConfig(false);
        setConfig(defaultConfig);
        setFormData(defaultConfig);
        return;
      }
      const parsed = normalizeConfig(snapshot.data());
      if (parsed.bankInfo) parsed.bankInfo = await decrypt(parsed.bankInfo, inviteToken);
      {
        const { resolveAllConfigImages } = await import("../lib/image-store");
        const resolved = await resolveAllConfigImages(inviteToken, parsed);
        for (const [key, url] of Object.entries(resolved)) {
          if (url) (parsed as Record<string, unknown>)[key] = url;
        }
      }
      {
        const { loadAudio } = await import("../lib/music-store");
        const audio = await loadAudio(inviteToken);
        if (audio?.url) {
          parsed.musicFile = audio.url;
          sessionStorage.setItem(`wedin_audio_${inviteToken}`, audio.url);
        } else {
          sessionStorage.removeItem(`wedin_audio_${inviteToken}`);
        }
      }
      const hydrated = { ...defaultConfig, ...parsed };
      console.log("[app]", "[ConfigProvider]", "reloadConfig success", { firstName: hydrated.firstName });
      setConfig(hydrated);
      setFormData(hydrated);
      setHasStoredConfig(true);
    } catch (e) {
      console.error("[app]", "[ConfigProvider]", "reloadConfig error", { error: e });
      setSaveError(getFirestoreErrorMessage(e, t));
    }
  }, [inviteToken, t, setSaveError]);

  const handleSaveSetupCore = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    console.log("[app]", "[ConfigProvider]", "handleSaveSetupCore start", { hasStoredConfig });
    if (autoSaveTimerRef.current) { console.log("[app]", "[ConfigProvider]", "clearing autosave timer", {}); clearTimeout(autoSaveTimerRef.current); }
    if (isSavingRef.current) {
      console.log("[app]", "[ConfigProvider]", "already saving, blocked", {});
      setSaveError(t("errors.alreadySaving"));
      return;
    }
    setSaveError("");
    setSaveMessage("");

    const sanitized = normalizeConfig(formData);
    const hiddenArray = (sanitized.hiddenSections || "").split(",").filter(Boolean).filter((s: string) => !SPECIAL_SECTIONS.includes(s));
    const hiddenSet = new Set(hiddenArray);

    if (!hasStoredConfig) {
      if (formData._privacyConsent !== "true") {
        console.log("[app]", "[ConfigProvider]", "validation failed: privacyConsent required", {});
        setSaveError(t("errors.acceptPrivacyPolicy"));
        return;
      }
      if (!sanitized.adminUsername) {
        console.log("[app]", "[ConfigProvider]", "validation failed: username required", {});
        setSaveError(t("errors.usernameRequired"));
        return;
      }
      if (!/^[a-zA-Z0-9]+$/.test(sanitized.adminUsername)) {
        console.log("[app]", "[ConfigProvider]", "validation failed: username invalid chars", { username: sanitized.adminUsername });
        setSaveError(t("errors.usernameInvalid"));
        return;
      }
      if (sanitized.adminUsername.length > MAX_USERNAME_LENGTH) {
        console.log("[app]", "[ConfigProvider]", "validation failed: username too long", { length: sanitized.adminUsername.length });
        setSaveError(t("errors.usernameTooLong"));
        return;
      }
    }

    if (!sanitized.firstName || !sanitized.secondName) {
      console.log("[app]", "[ConfigProvider]", "validation failed: names required", { firstName: sanitized.firstName, secondName: sanitized.secondName });
      setSaveError(t("errors.bothNamesRequired"));
      return;
    }

    const dateErrorKey = validateWeddingDate(sanitized, maxAllowedYear, hiddenSet, hasStoredConfig);
    if (dateErrorKey) {
      console.log("[app]", "[ConfigProvider]", "validation failed: date", { dateErrorKey });
      setSaveError(t(dateErrorKey, { year: maxAllowedYear }));
      return;
    }

    if (!THEME_VALUES.has(sanitized.theme)) {
      console.log("[app]", "[ConfigProvider]", "validation failed: theme invalid", { theme: sanitized.theme });
      setSaveError(t("errors.themeInvalid"));
      return;
    }

    const orderArray = (sanitized.sectionOrder || "").split(",").filter(Boolean).filter((s: string) => !SPECIAL_SECTIONS.includes(s));
    const validSectionKeys = new Set(STORY_SECTION_ORDER);
    if (orderArray.length < 1 || !orderArray.every((s: string) => validSectionKeys.has(s))) {
      console.log("[app]", "[ConfigProvider]", "validation failed: sectionOrder invalid", { orderArray });
      setSaveError(t("errors.sectionOrderInvalid"));
      return;
    }
    if (!hiddenArray.every((s) => validSectionKeys.has(s))) {
      console.log("[app]", "[ConfigProvider]", "validation failed: hiddenSections invalid", { hiddenArray });
      setSaveError(t("errors.hiddenSectionsInvalid"));
      return;
    }
    if (Boolean(sanitized.godparent1) !== Boolean(sanitized.godparent2)) {
      console.log("[app]", "[ConfigProvider]", "validation failed: godparents both required", { godparent1: sanitized.godparent1, godparent2: sanitized.godparent2 });
      setSaveError(t("errors.godparentsRequired"));
      return;
    }
    if (orderArray[0] !== "hero") {
      console.log("[app]", "[ConfigProvider]", "validation failed: cover first required", { first: orderArray[0] });
      setSaveError(t("errors.coverFirst"));
      return;
    }

    if (sanitized.menuEnabled === "true") {
      if (!sanitized.menuPostre) {
        console.log("[app]", "[ConfigProvider]", "validation failed: postre required", {});
        setSaveError(t("errors.postreRequired"));
        return;
      }
      if (!sanitized.menuCarne && !sanitized.menuPescado && !sanitized.menuVegano) {
        console.log("[app]", "[ConfigProvider]", "validation failed: menu option required", {});
        setSaveError(t("errors.menuRequired"));
        return;
      }
    }

    if (sanitized.bankInfo) {
      const upper = sanitized.bankInfo.toUpperCase();
      const looksLikeIban = /^[A-Z]{2}\d/.test(upper);
      if (looksLikeIban && !/^[A-Z]{2}\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{0,4}$/.test(upper)) {
        console.log("[app]", "[ConfigProvider]", "validation failed: IBAN invalid", { bankInfo: sanitized.bankInfo });
        setSaveError(t("errors.ibanInvalid"));
        return;
      }
    }

    if (sanitized.musicUrl && sanitized.musicUrl.startsWith("data:")) {
      console.log("[app]", "[ConfigProvider]", "moving musicUrl to musicFile (data URL)", {});
      sanitized.musicFile = sanitized.musicUrl;
      sanitized.musicUrl = "";
    }

    if (sanitized.sectionOrder) {
      const expected = STORY_SECTION_ORDER.length;
      const actual = orderArray.length;
      if (actual !== expected) {
        console.log("[app]", "[ConfigProvider]", "validation failed: sectionOrder mismatch", { actual, expected });
        setSaveError(t("errors.sectionOrderMismatch", { actual, expected }));
        return;
      }
    }

    if (sanitized.inviteMessage && sanitized.inviteMessage.length > MAX_INVITE_MESSAGE_LENGTH) {
      console.log("[app]", "[ConfigProvider]", "validation failed: message too long", { length: sanitized.inviteMessage.length });
      setSaveError(t("errors.messageTooLong"));
      return;
    }
    if (sanitized.weddingSchedule && sanitized.weddingSchedule.length > MAX_LONG_TEXT_LENGTH) {
      console.log("[app]", "[ConfigProvider]", "validation failed: schedule too long", { length: sanitized.weddingSchedule.length });
      setSaveError(t("errors.scheduleTooLong"));
      return;
    }
    if (sanitized.storyText && sanitized.storyText.length > MAX_LONG_TEXT_LENGTH) {
      console.log("[app]", "[ConfigProvider]", "validation failed: story too long", { length: sanitized.storyText.length });
      setSaveError(t("errors.storyTooLong"));
      return;
    }
    if (sanitized.giftsInfo && sanitized.giftsInfo.length > MAX_LONG_TEXT_LENGTH) {
      console.log("[app]", "[ConfigProvider]", "validation failed: giftsInfo too long", { length: sanitized.giftsInfo.length });
      setSaveError(t("errors.giftsTooLong"));
      return;
    }
    if (sanitized.transportInfo && sanitized.transportInfo.length > MAX_LONG_TEXT_LENGTH) {
      console.log("[app]", "[ConfigProvider]", "validation failed: transportInfo too long", { length: sanitized.transportInfo.length });
      setSaveError(t("errors.transportTooLong"));
      return;
    }
    if (sanitized.accommodationInfo && sanitized.accommodationInfo.length > MAX_LONG_TEXT_LENGTH) {
      console.log("[app]", "[ConfigProvider]", "validation failed: accommodationInfo too long", { length: sanitized.accommodationInfo.length });
      setSaveError(t("errors.accommodationTooLong"));
      return;
    }
    if (sanitized.menuTexto && sanitized.menuTexto.length > MAX_LONG_TEXT_LENGTH) {
      console.log("[app]", "[ConfigProvider]", "validation failed: menuTexto too long", { length: sanitized.menuTexto.length });
      setSaveError(t("errors.menuTextoTooLong"));
      return;
    }

    const payload = { ...defaultConfig, ...sanitized } as InvitationConfig;
    if (hiddenSet.has("details") && hasStoredConfig) {
      payload.weddingDay = config.weddingDay;
      payload.weddingMonth = config.weddingMonth;
      payload.weddingYear = config.weddingYear;
      payload.weddingHour = config.weddingHour;
      payload.weddingMinute = config.weddingMinute;
    }

    isSavingRef.current = true;
    console.log("[app]", "[ConfigProvider]", "validation passed, saving...", {});
    try {
      if (payload.bankInfo) { console.log("[app]", "[ConfigProvider]", "encrypting bankInfo", {}); payload.bankInfo = await encrypt(payload.bankInfo, inviteToken); }
      // Migrate any data-URL image fields to configImages subcollection
      const { saveConfigImage } = await import("../lib/image-store");
      const originalImages: Record<string, string> = {};
      for (const imageId of ["couplePhoto", "backgroundImage", "customSeal", "cornerDecoration"]) {
        const val = payload[imageId];
        if (typeof val === "string" && val.startsWith("data:")) {
          console.log("[app]", "[ConfigProvider]", `migrating ${imageId} data URL to subcollection`, {});
          originalImages[imageId] = val;
          payload[imageId] = await saveConfigImage(inviteToken, imageId, val);
        }
      }
      delete (payload as { musicFile?: string }).musicFile;
      payload.privacyPolicyVersion = PRIVACY_POLICY_VERSION;
      console.log("[app]", "[ConfigProvider]", "setDoc start", {});
      await setDoc(invitationDocRef(inviteToken), payload, { merge: true });
      console.log("[app]", "[ConfigProvider]", "setDoc success", {});
      if (payload.bankInfo) payload.bankInfo = await decrypt(payload.bankInfo, inviteToken);
      // Restore data URLs in memory for the current session
      for (const [k, v] of Object.entries(originalImages)) {
        payload[k] = v;
      }
      setConfig(payload);
      setFormData(payload);
      setHasStoredConfig(true);
      console.log("[app]", "[ConfigProvider]", "calling onFirstSave callbacks", { count: onFirstSaveCallbacksRef.current.length });

      for (const cb of onFirstSaveCallbacksRef.current) cb();

      console.log("[app]", "[ConfigProvider]", "save success", {});
      setSaveMessage(t("errors.configSaved"));
    } catch (e) {
      console.error("[app]", "[ConfigProvider]", "save error", { error: e });
      setSaveError(getFirestoreErrorMessage(e, t));
    } finally {
      console.log("[app]", "[ConfigProvider]", "save complete", {});
      isSavingRef.current = false;
    }
  }, [hasStoredConfig, formData, maxAllowedYear, inviteToken, config, autoSaveTimerRef, isSavingRef, t, setSaveError, setSaveMessage]);

  const handleDeleteInvitation = useCallback(async () => {
    console.log("[app]", "[ConfigProvider]", "handleDeleteInvitation start", { inviteToken });
    if (!inviteToken) return;
    if (!window.confirm(t("errors.deleteConfirm"))) { console.log("[app]", "[ConfigProvider]", "delete cancelled by user", {}); return; }
    try {
      const snap = await getDocs(rsvpByInviteRef(inviteToken));
      const batch = writeBatch(db);
      snap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref));
      await deleteGallery(inviteToken);
      const { deleteAllConfigImages } = await import("../lib/image-store");
      await deleteAllConfigImages(inviteToken);
      batch.delete(invitationDocRef(inviteToken));
      await batch.commit();
      safeRemoveItem(`wedin_invite_cache_${inviteToken}`);
      clearSession();
      console.log("[app]", "[ConfigProvider]", "invitation deleted, navigating home", {});
      navigate("/");
    } catch (e) {
      console.error("[app]", "[ConfigProvider]", "delete invitation error", { error: e });
      setSaveError(getFirestoreErrorMessage(e, t));
    }
  }, [inviteToken, navigate, t, setSaveError]);

  const configValue = useMemo(() => ({
    config, formData, hasStoredConfig, isConfigLoading, configLoadError, inviteToken,
    maxAllowedYear, previewBackgrounds, isPreviewLoading,
    formattedDate, formattedTime, calendarLink, visitCount,
    updateFormField, reloadConfig, handleSaveSetup: handleSaveSetupCore,
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange, handleDeleteInvitation,
    setHasStoredConfig, registerOnFirstSave,
  }), [
    config, formData, hasStoredConfig, isConfigLoading, configLoadError, inviteToken,
    maxAllowedYear, previewBackgrounds, isPreviewLoading,
    formattedDate, formattedTime, calendarLink, visitCount,
    updateFormField, reloadConfig, handleSaveSetupCore,
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


