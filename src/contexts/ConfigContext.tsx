import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { getDoc, setDoc, doc, increment, updateDoc, getDocs, writeBatch, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { db, invitationDocRef, rsvpByInviteRef } from "../lib/firebase";
import {
  defaultConfig,
  MAX_YEARS_AHEAD, INVITE_CACHE_TTL_MS, TOKEN_ROUTE_REGEX,
  PRIVACY_POLICY_VERSION,
} from "../lib/constants";
import { normalizeConfig } from "../lib/normalize-config";
import { withTimeout } from "../lib/async-utils";
import { validateConfigForSave } from "../lib/config-validation";
import { sectionHasContent } from "../lib/section-utils";
import type { InvitationConfig } from "../types";
import { decodeInviteConfig } from "../lib/invite-config-codec";
import { clearSession } from "../lib/sessionVars";
import { deleteSetupTokenRecord } from "../lib/setup-token";
import { safeGetItem, safeRemoveItem } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/storage-keys";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { useCalendar } from "../hooks/useCalendar";
import { useFieldHandlers } from "../hooks/useFieldHandlers";
import { useAutoSave } from "../hooks/useAutoSave";
import { getFirestoreErrorMessage } from "../lib/error-utils";
import { ConfigContext } from "./useConfig";
import { useAppUI } from "./useAppUI";

export function ConfigProvider({ children }: { children: ReactNode }) {

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
  /** Estado visible del guardado (habilita el botón "Guardar" de SetupForm). */
  const [isSaving, setIsSaving] = useState(false);
  const loadedTokenRef = useRef("");
  /** Token actual del provider (se actualiza en cada render): evita que un
   *  autosave de la invitación A sobrescriba el estado en memoria de B al
   *  navegar mientras la promesa está en vuelo. */
  const currentTokenRef = useRef(inviteToken);
  currentTokenRef.current = inviteToken;
  // La visita se cuenta una vez por invitación: al cambiar de token (admin
  // navegando entre varias) se resetea para volver a contarla.
  const trackedRef = useRef("");

  const { formattedDate, formattedTime, calendarLink } = useCalendar(config);

  const updateFormField = useCallback((field: string, value: string) => {

    setFormData((current: InvitationConfig) => ({ ...current, [field]: value }));
  }, []);

  const {
    handleDayChange, handleTimeChange, handleTimeBlur,
    handleYearChange,
  } = useFieldHandlers(updateFormField, maxAllowedYear);

  const { autoSaveTimerRef } = useAutoSave(hasStoredConfig, inviteToken, formData, config, setSaveMessage, isSavingRef, (data) => {
    // Protege la carrera: un autosave de A que resuelve tras navegar a B no
    // debe pisar el estado de B.
    if (currentTokenRef.current === inviteToken) setConfig(data);
  }, setSaveError);

  const onFirstSaveCallbacksRef = useRef<(() => void)[]>([]);

  const registerOnFirstSave = useCallback((cb: () => void) => {
    onFirstSaveCallbacksRef.current.push(cb);
  }, []);

  const trackVisit = useCallback(async (token: string) => {
    // Solo se cuenta una visita por invitación (no por cambio de ruta).
    if (!token || trackedRef.current === token) { return; }
    trackedRef.current = token;

    try {
      const ref = invitationDocRef(token);
      await updateDoc(ref, { _visits: increment(1) });

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
        if (!inviteToken) { ; setIsConfigLoading(false); return; }

        if (inviteToken === loadedTokenRef.current && hasStoredConfig) {

          setIsConfigLoading(false);
          return;
        }

        // Caché de invitación = almacenamiento técnicamente necesario para el
        // modo offline (no sujeto a consentimiento de cookies): se accede
        // directo a localStorage y se ignora si está bloqueado.
        const cached = (() => {
          try { return localStorage.getItem(STORAGE_KEYS.inviteCache(inviteToken)); } catch { return null; }
        })();
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.data && parsed.cachedAt && Date.now() - parsed.cachedAt < INVITE_CACHE_TTL_MS) {

              const { resolveAllConfigImages } = await import("../lib/image-store");
              const resolved = await resolveAllConfigImages(inviteToken, parsed.data);
              for (const [key, url] of Object.entries(resolved)) {
                if (url) parsed.data[key] = url;
              }
              // El bankInfo viaja cifrado en la caché: se descifra localmente.
              if (parsed.bankInfoEncrypted) {
                parsed.data.bankInfo = await decrypt(parsed.bankInfoEncrypted, inviteToken);
              }
              // La música no se cachea (data URL grande): se descarga del
              // mismo modo que en la carga completa para que el sobre suene.
              const { loadAudio } = await import("../lib/music-store");
              const audio = await loadAudio(inviteToken);
              if (audio?.url) parsed.data.musicFile = audio.url;
              setConfig(parsed.data);
              setFormData(parsed.data);
              setHasStoredConfig(true);
              setIsConfigLoading(false);
              loadedTokenRef.current = inviteToken;
              return;
            } else {

            }
          } catch { ; }
        } else {

        }

        const snapshot = await withTimeout(getDoc(invitationDocRef(inviteToken)), 25000, "load timeout");
        if (!snapshot.exists()) {

          setHasStoredConfig(false);
          setConfig(defaultConfig);
          setFormData(defaultConfig);
          setIsConfigLoading(false);
          return;
        }
        const parsed = normalizeConfig(snapshot.data());
        // Se captura el bankInfo CIFRADO (antes de descifrar) para guardarlo
        // en la caché: el cache-hit podrá descifrarlo sin consultar Firestore.
        const bankInfoEncrypted = parsed.bankInfo;
        if (parsed.bankInfo) { ; parsed.bankInfo = await decrypt(parsed.bankInfo, inviteToken); }
        const { resolveAllConfigImages } = await import("../lib/image-store");
        const resolved = await resolveAllConfigImages(inviteToken, parsed);
        for (const [key, url] of Object.entries(resolved)) {
          if (url) (parsed as Record<string, unknown>)[key] = url;
        }
        {

          const { loadAudio } = await import("../lib/music-store");
          const audio = await loadAudio(inviteToken);
          if (audio?.url) {
            parsed.musicFile = audio.url;
          }
        }
        const hydrated = { ...defaultConfig, ...parsed };

        setConfig(hydrated);
        setFormData(hydrated);
        // La caché guarda el shell + el bankInfo CIFRADO (no el descifrado):
        // el cache-hit descifra localmente sin Firestore. hydrated.bankInfo ya
        // está en claro, así que se omite explícitamente (antes quedaba el
        // IBAN en localStorage).
        const { bankInfo: _omitBank, musicFile: _omitAudio, ...cacheSafe } = hydrated;
        try {
          localStorage.setItem(
            STORAGE_KEYS.inviteCache(inviteToken),
            JSON.stringify({ data: cacheSafe, bankInfoEncrypted: bankInfoEncrypted || null, cachedAt: Date.now() }),
          );
        } catch { /* almacenamiento no disponible */ }
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

        setIsConfigLoading(false);
      }
    };
    hydrateConfig();
  }, [location.pathname, location.hash, inviteToken, hasStoredConfig, trackVisit, t]);

  const reloadConfig = useCallback(async () => {

    if (!inviteToken) { ; return; }
    try {
      safeRemoveItem(STORAGE_KEYS.inviteCache(inviteToken));
      const snapshot = await withTimeout(getDoc(invitationDocRef(inviteToken)), 25000, "load timeout");
      if (!snapshot.exists()) {

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
        }
      }
      const hydrated = { ...defaultConfig, ...parsed };

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

    if (autoSaveTimerRef.current) { ; clearTimeout(autoSaveTimerRef.current); }
    if (isSavingRef.current) {

      setSaveError(t("errors.alreadySaving"));
      return;
    }
    setSaveError("");
    setSaveMessage("");

    const { sanitized, hiddenSet, errorKey, errorParams } = validateConfigForSave(formData, hasStoredConfig, maxAllowedYear);
    if (errorKey) {
      setSaveError(errorParams ? t(errorKey, errorParams) : t(errorKey));
      return;
    }

    const payload = { ...defaultConfig, ...sanitized } as InvitationConfig;

    // Desactiva automáticamente las secciones habilitadas sin contenido:
    // se añaden a hiddenSections (mantiene válido el orden) y se informa.
    const orderSections = (formData.sectionOrder || "").split(",").filter(Boolean);
    const alreadyHidden = new Set((formData.hiddenSections || "").split(",").filter(Boolean));
    const emptyEnabled = orderSections.filter((s) => !alreadyHidden.has(s) && !sectionHasContent(s, formData));

    let deactivatedMsg: string | null = null;
    if (emptyEnabled.length > 0) {
      const nextHidden = [...alreadyHidden, ...emptyEnabled].join(",");
      payload.hiddenSections = nextHidden;
      updateFormField("hiddenSections", nextHidden);
      deactivatedMsg = t("errors.sectionsDeactivated", { sections: emptyEnabled.join(", ") });
    }

    if (hiddenSet.has("details") && hasStoredConfig) {
      payload.weddingDay = config.weddingDay;
      payload.weddingMonth = config.weddingMonth;
      payload.weddingYear = config.weddingYear;
      payload.weddingHour = config.weddingHour;
      payload.weddingMinute = config.weddingMinute;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      if (payload.bankInfo) { ; payload.bankInfo = await encrypt(payload.bankInfo, inviteToken); }
      // Migrate any data-URL image fields to configImages subcollection
      const { saveConfigImage } = await import("../lib/image-store");
      const originalImages: Record<string, string> = {};
      for (const imageId of ["couplePhoto", "backgroundImage", "customSeal", "cornerDecoration"]) {
        const val = payload[imageId];
        if (typeof val === "string" && val.startsWith("data:")) {

          originalImages[imageId] = val;
          payload[imageId] = await saveConfigImage(inviteToken, imageId, val);
        }
      }
      delete (payload as { musicFile?: string }).musicFile;
      payload.privacyPolicyVersion = PRIVACY_POLICY_VERSION;

      await setDoc(invitationDocRef(inviteToken), payload, { merge: true });

      // Invalida la caché de invitación: sin esto, un guardado y recarga
      // inmediata servía el estado pre-guardado durante el TTL de 2 min.
      try { localStorage.removeItem(STORAGE_KEYS.inviteCache(inviteToken)); } catch { }

      // Crea el documento grupo de RSVP de la invitación (tope anti-spam) si no existe.
      try {
        const groupRef = doc(db, "rsvpResponses", inviteToken);
        const groupSnap = await getDoc(groupRef);
        if (!groupSnap.exists()) {
          await setDoc(groupRef, { count: 0 });
        }
      } catch { }

      if (payload.bankInfo) payload.bankInfo = await decrypt(payload.bankInfo, inviteToken);
      // Restore data URLs in memory for the current session
      for (const [k, v] of Object.entries(originalImages)) {
        payload[k] = v;
      }
      // El musicFile se persiste en la subcolección audio (chunks), no en el
      // documento: se restaura en memoria para que el editor no quede vacío.
      const musicFileValue = (formData as Record<string, unknown>).musicFile;
      setConfig(musicFileValue ? { ...payload, musicFile: musicFileValue as string } : payload);
      setFormData(musicFileValue ? { ...payload, musicFile: musicFileValue as string } : payload);
      setHasStoredConfig(true);

      for (const cb of onFirstSaveCallbacksRef.current) cb();

      setSaveMessage(deactivatedMsg || t("errors.configSaved"));
    } catch (e) {
      console.error("[app]", "[ConfigProvider]", "save error", { error: e });
      setSaveError(getFirestoreErrorMessage(e, t));
    } finally {

      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [hasStoredConfig, formData, maxAllowedYear, inviteToken, config, autoSaveTimerRef, isSavingRef, t, setSaveError, setSaveMessage, updateFormField]);

  const handleDeleteInvitation = useCallback(async () => {

    if (!inviteToken) return;
    if (!window.confirm(t("errors.deleteConfirm"))) { ; return; }
    try {
      const snap = await getDocs(rsvpByInviteRef(inviteToken));
      const batch = writeBatch(db);
      snap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref));
      const { deleteGallery, deleteAllConfigImages } = await import("../lib/image-store");
      const { deleteAudio } = await import("../lib/music-store");
      await deleteGallery(inviteToken);
      await deleteAllConfigImages(inviteToken);
      // El audio (chunks cifrados) también se elimina: sin esto quedaban
      // huérfanos para siempre (incumplía el borrado completo de datos).
      await deleteAudio(inviteToken);
      batch.delete(doc(db, "rsvpResponses", inviteToken));
      batch.delete(invitationDocRef(inviteToken));
      await batch.commit();
      // El registro setupTokens/{hash} también se elimina (si el token de
      // setup sigue en esta sesión): sin esto quedaba un hash huérfano que
      // apuntaba a una invitación inexistente.
      try {
        const storedToken = safeGetItem(STORAGE_KEYS.setupToken(inviteToken), sessionStorage);
        if (storedToken) await deleteSetupTokenRecord(storedToken);
      } catch { /* el registro se borrará en la limpieza del superadmin */ }
      safeRemoveItem(STORAGE_KEYS.inviteCache(inviteToken));
      safeRemoveItem(STORAGE_KEYS.audio(inviteToken));
      clearSession();

      navigate("/");
    } catch (e) {
      console.error("[app]", "[ConfigProvider]", "delete invitation error", { error: e });
      setSaveError(getFirestoreErrorMessage(e, t));
    }
  }, [inviteToken, navigate, t, setSaveError]);

  const configValue = useMemo(() => ({
    config, formData, hasStoredConfig, isConfigLoading, configLoadError, inviteToken,
    maxAllowedYear,
    formattedDate, formattedTime, calendarLink, visitCount,
    updateFormField, reloadConfig, handleSaveSetup: handleSaveSetupCore,
    handleDayChange, handleTimeChange, handleTimeBlur,
    handleYearChange, handleDeleteInvitation,
    setHasStoredConfig, registerOnFirstSave, isSaving,
  }), [
    config, formData, hasStoredConfig, isConfigLoading, configLoadError, inviteToken,
    maxAllowedYear,
    formattedDate, formattedTime, calendarLink, visitCount,
    updateFormField, reloadConfig, handleSaveSetupCore,
    handleDayChange, handleTimeChange, handleTimeBlur,
    handleYearChange, handleDeleteInvitation,
    setHasStoredConfig, registerOnFirstSave, isSaving,
  ]);

  return (
    <ConfigContext.Provider value={configValue}>
      {children}
    </ConfigContext.Provider>
  );
}


