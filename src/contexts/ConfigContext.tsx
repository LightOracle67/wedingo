import { useCallback, useContext, createContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { getDoc, setDoc, doc, increment, writeBatch, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, invitationDocRef } from "../lib/firebase";
import {
  defaultConfig,
  MAX_YEARS_AHEAD,
  INVITE_CACHE_TTL_MS,
  TOKEN_ROUTE_REGEX,
  PRIVACY_POLICY_VERSION,
} from "../lib/constants";
import { normalizeConfig } from "../lib/normalize-config";
import { withTimeout, withWriteRetry } from "../lib/async-utils";
import { validateConfigForSave } from "../lib/config-validation";
import { sectionHasContent } from "../lib/section-utils";
import type { InvitationConfig } from "../types";
import { decodeInviteConfig } from "../lib/invite-config-codec";
import { clearSession } from "../lib/sessionVars";
import { deleteSetupTokenRecord, hashSetupToken } from "../lib/setup-token";
import { safeGetItem, safeRemoveItem, hasAnalyticsConsent, hasRejectedConsent } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/storage-keys";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { useCalendar } from "../hooks/useCalendar";
import { useFieldHandlers } from "../hooks/useFieldHandlers";
import { useAutoSave } from "../hooks/useAutoSave";
import { getFirestoreErrorMessage } from "../lib/error-utils";
import { recoverFromStaleChunk } from "../lib/stale-chunk-recovery";
import { ConfigContext } from "./useConfig";
import { FormStoreContext, createFormStore, type FormStore } from "./FormStore";
import { useAppUI } from "./useAppUI";
import { safeLogError } from "../lib/safe-error";

/** Año máximo permitido al guardar la fecha de la boda (constante de módulo:
 *  no se recalcula en cada render). */
const MAX_ALLOWED_YEAR = new Date().getFullYear() + MAX_YEARS_AHEAD;

/**
 * ConfigActionsContext — Contexto ESTABLE de acciones del editor.
 *
 * `ConfigContext` incluye `formData`/`config`, que cambian de identidad en
 * CADA tecla (`updateFormField` → `setFormData`): cualquier consumidor de
 * `useConfig()` re-renderiza en cada tecla, anulando el beneficio de
 * `useFormField` (re-render acotado por campo). Este contexto separa las
 * FUNCIONES (estables) y los pocos valores que cambian raramente
 * (`inviteToken`, `hasStoredConfig`), de forma que los formularios solo
 * re-renderizan cuando tocan sus propios campos, no en cada tecla del resto.
 */
export const ConfigActionsContext = createContext<ConfigActionsValue | null>(null);

/** Valor expuesto por ConfigActionsContext (estable entre teclas). */
export interface ConfigActionsValue {
  updateFormField: (field: string, value: string) => void;
  handleDayChange: (value: string) => void;
  handleTimeChange: (value: string) => void;
  handleTimeBlur: (value: string) => void;
  handleYearChange: (value: string) => void;
  /** Año máximo permitido al guardar la fecha de la boda. */
  maxAllowedYear: number;
  /** Token de la invitación en curso (cambia solo al navegar de ruta). */
  inviteToken: string;
  /** Indica si la invitación ya tiene configuración guardada. */
  hasStoredConfig: boolean;
}

/** Hook para leer las acciones estables del editor (error si no hay provider). */
export function useConfigActions(): ConfigActionsValue {
  const ctx = useContext(ConfigActionsContext);
  if (!ctx) throw new Error("useConfigActions debe usarse dentro de ConfigProvider");
  return ctx;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { setSaveMessage, setSaveError } = useAppUI();
  const location = useLocation();
  const navigate = useNavigate();

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
  /** Token actual del provider (se actualiza en un effect): evita que un
   *  autosave de la invitación A sobrescriba el estado en memoria de B al
   *  navegar mientras la promesa está en vuelo. */
  const currentTokenRef = useRef(inviteToken);
  useEffect(() => {
    currentTokenRef.current = inviteToken;
  }, [inviteToken]);
  // La visita se cuenta una vez por invitación: al cambiar de token (admin
  // navegando entre varias) se resetea para volver a contarla.
  const trackedRef = useRef("");

  const { formattedDate, formattedTime, calendarLink } = useCalendar(config);

  // Tienda de selectores por campo (ver FormStore): permite que las secciones
  // del Setup lean con useFormField(field) y solo se re-rendericen cuando su
  // propio campo cambia, en vez de todo el árbol por cada tecla.
  const storeRef = useRef<FormStore | null>(null);
  if (!storeRef.current) storeRef.current = createFormStore();
  const formStore = storeRef.current;

  const updateFormField = useCallback(
    (field: string, value: string) => {
      // El campo se escribe en la tienda (notifica a los lectores con
      // useFormField) y en formData (fuente de verdad para el guardado).
      formStore.set(field, value);
      setFormData((current: InvitationConfig) => ({ ...current, [field]: value }));
    },
    [formStore],
  );

  const { handleDayChange, handleTimeChange, handleTimeBlur, handleYearChange } = useFieldHandlers(
    updateFormField,
    MAX_ALLOWED_YEAR,
  );

  const { autoSaveTimerRef } = useAutoSave(
    hasStoredConfig,
    inviteToken,
    formData,
    config,
    setSaveMessage,
    isSavingRef,
    (data) => {
      // Protege la carrera: un autosave de A que resuelve tras navegar a B no
      // debe pisar el estado de B.
      if (currentTokenRef.current === inviteToken) setConfig(data);
    },
    setSaveError,
    // Guard de carrera crítica: impide que un autosave programado para la
    // invitación A se escriba dentro del documento de B al navegar sin guardar.
    currentTokenRef,
  );

  const onFirstSaveCallbacksRef = useRef<(() => void)[]>([]);

  const registerOnFirstSave = useCallback((cb: () => void) => {
    onFirstSaveCallbacksRef.current.push(cb);
  }, []);

  const trackVisit = useCallback(async (token: string) => {
    // Solo se cuenta una visita por invitación (no por cambio de ruta).
    if (!token || trackedRef.current === token) {
      return;
    }
    trackedRef.current = token;

    try {
      const ref = invitationDocRef(token);
      // Día local (no UTC) para que el historial coincida con el calendario
      // del responsable: "2026-08-17" para el 17 de agosto de 2026.
      const now = new Date();
      const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      // Batch atómico: si una de las dos escrituras falla, ninguna se aplica
      // (el contador total y el historial por día nunca quedan desincronizados).
      const batch = writeBatch(db);
      batch.update(ref, { _visits: increment(1) });
      batch.set(doc(db, "invitations", token, "visitLog", day), { count: increment(1) }, { merge: true });
      await batch.commit();
    } catch (e) {
      safeLogError(["[app]", "[ConfigProvider]", "trackVisit failed"], e);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const isInvite = new URLSearchParams(window.location.search).has("invitar");
    const pathParts = location.pathname.split("/").filter(Boolean);
    const firstSegment = pathParts[0] || "";
    const isTokenRoute =
      TOKEN_ROUTE_REGEX.test(firstSegment) &&
      !["setup", "admin", "superadmin-login", "superadmin"].includes(firstSegment);
    const isAdminRoute = pathParts[1] === "setup" || pathParts[1] === "admin";

    if (hash && hash.length > 1) {
      try {
        const parsed = decodeInviteConfig(hash.slice(1));
        const hydrated = { ...defaultConfig, ...normalizeConfig(parsed) };

        setConfig(hydrated);
        setFormData(hydrated);
        formStore.setAll(hydrated);
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
        if (!inviteToken) {
          setIsConfigLoading(false);
          return;
        }

        if (inviteToken === loadedTokenRef.current && hasStoredConfig) {
          setIsConfigLoading(false);
          return;
        }

        // Caché de invitación = almacenamiento técnicamente necesario para el
        // modo offline (no sujeto a consentimiento de cookies): se accede
        // directo a localStorage y se ignora si está bloqueado.
        const cached = (() => {
          try {
            return localStorage.getItem(STORAGE_KEYS.inviteCache(inviteToken));
          } catch {
            return null;
          }
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
              formStore.setAll(parsed.data as Record<string, string>);
              setHasStoredConfig(true);
              setIsConfigLoading(false);
              loadedTokenRef.current = inviteToken;
              // Un cache-hit (<2 min) no debe perder ni la visita ni el conteo
              // de visitas del panel (antes se saltaba con el return).
              setVisitCount(typeof parsed.data._visits === "number" ? parsed.data._visits : 0);
              const segments = location.pathname.split("/").filter(Boolean);
              if (
                segments.length === 1 &&
                TOKEN_ROUTE_REGEX.test(segments[0]!) &&
                hasAnalyticsConsent() &&
                // Previsualización del superadmin (?preview=1): no cuenta visita.
                !location.search.includes("preview=1")
              ) {
                trackVisit(inviteToken);
              }
              return;
            } else {
            }
          } catch {}
        } else {
        }

        const snapshot = await withTimeout(getDoc(invitationDocRef(inviteToken)), 25000, "load timeout");
        if (!snapshot.exists()) {
          setHasStoredConfig(false);
          setConfig(defaultConfig);
          setFormData(defaultConfig);
          formStore.setAll(defaultConfig);
          setIsConfigLoading(false);
          return;
        }
        const parsed = normalizeConfig(snapshot.data());
        // Se captura el bankInfo CIFRADO (antes de descifrar) para guardarlo
        // en la caché: el cache-hit podrá descifrarlo sin consultar Firestore.
        const bankInfoEncrypted = parsed.bankInfo;
        if (parsed.bankInfo) {
          parsed.bankInfo = await decrypt(parsed.bankInfo, inviteToken);
        }
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
        formStore.setAll(hydrated);
        // La caché guarda el shell + el bankInfo CIFRADO (no el descifrado):
        // el cache-hit descifra localmente sin Firestore. hydrated.bankInfo ya
        // está en claro, así que se omite explícitamente (antes quedaba el
        // IBAN en localStorage).
        const { bankInfo: _omitBank, musicFile: _omitAudio, ...cacheSafe } = hydrated;
        // ePrivacy art. 5.3: tras REChazar el consentimiento no se vuelve a
        // cachear la invitación en localStorage (el rechazo es persistente).
        if (!hasRejectedConsent()) {
          try {
            localStorage.setItem(
              STORAGE_KEYS.inviteCache(inviteToken),
              JSON.stringify({ data: cacheSafe, bankInfoEncrypted: bankInfoEncrypted || null, cachedAt: Date.now() }),
            );
          } catch {
            /* almacenamiento no disponible */
          }
        }
        setVisitCount(typeof snapshot.data()._visits === "number" ? snapshot.data()._visits : 0);
        setHasStoredConfig(true);
        loadedTokenRef.current = inviteToken;
        // Solo la ruta pública exacta /:token cuenta una visita: /A/admin,
        // /A/setup y /A/print tienen 2 segmentos y no deben sumar (antes el
        // guard solo miraba el primer segmento y el admin se contaba a sí
        // mismo).
        const segments = location.pathname.split("/").filter(Boolean);
        if (
          segments.length === 1 &&
          TOKEN_ROUTE_REGEX.test(segments[0]!) &&
          hasAnalyticsConsent() &&
          // Previsualización del superadmin (?preview=1): no cuenta visita.
          !location.search.includes("preview=1")
        ) {
          trackVisit(inviteToken);
        }
      } catch (e) {
        safeLogError(["[app]", "[ConfigProvider]", "hydrateConfig error"], e);
        // Error de import de módulo: el SW conserva chunks de la versión
        // anterior que ya no existen en el hosting. En vez de mostrar solo el
        // mensaje de error, se desregistra el SW y se recarga limpio (con
        // tope de intentos para no entrar en bucle).
        if (!recoverFromStaleChunk(e)) {
          if (!hasStoredConfig) {
            setConfigLoadError(getFirestoreErrorMessage(e, t));
          }
        }
      } finally {
        setIsConfigLoading(false);
      }
    };
    hydrateConfig();
  }, [location.pathname, location.search, location.hash, inviteToken, hasStoredConfig, trackVisit, t, formStore]);

  const reloadConfig = useCallback(async () => {
    if (!inviteToken) {
      return;
    }
    try {
      safeRemoveItem(STORAGE_KEYS.inviteCache(inviteToken));
      const snapshot = await withTimeout(getDoc(invitationDocRef(inviteToken)), 25000, "load timeout");
      if (!snapshot.exists()) {
        setHasStoredConfig(false);
        setConfig(defaultConfig);
        setFormData(defaultConfig);
        formStore.setAll(defaultConfig);
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
      formStore.setAll(hydrated);
      setHasStoredConfig(true);
    } catch (e) {
      safeLogError(["[app]", "[ConfigProvider]", "reloadConfig error"], e);
      setSaveError(getFirestoreErrorMessage(e, t));
    }
  }, [inviteToken, t, setSaveError, formStore]);

  const handleSaveSetupCore = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (isSavingRef.current) {
        setSaveError(t("errors.alreadySaving"));
        return;
      }
      isSavingRef.current = true;
      setIsSaving(true);
      setSaveError("");
      setSaveMessage("");

      const { sanitized, hiddenSet, errorKey, errorParams } = validateConfigForSave(
        formData,
        hasStoredConfig,
        MAX_ALLOWED_YEAR,
      );
      if (errorKey) {
        isSavingRef.current = false;
        setIsSaving(false);
        setSaveError(errorParams ? t(errorKey, errorParams) : t(errorKey));
        return;
      }

      // Calcula campos cambiados ANTES de mutar sanitized (para auditoría y payload incremental)
      const baseForDiff = { ...defaultConfig, ...config } as InvitationConfig;
      const candidate = { ...defaultConfig, ...sanitized } as InvitationConfig;

      // Desactiva automáticamente las secciones habilitadas sin contenido:
      const orderSections = (formData.sectionOrder || "").split(",").filter(Boolean);
      const alreadyHidden = new Set((formData.hiddenSections || "").split(",").filter(Boolean));
      const emptyEnabled = orderSections.filter((s) => !alreadyHidden.has(s) && !sectionHasContent(s, formData));
      let deactivatedMsg: string | null = null;

      if (emptyEnabled.length > 0) {
        const nextHidden = [...alreadyHidden, ...emptyEnabled].join(",");
        candidate.hiddenSections = nextHidden;
        updateFormField("hiddenSections", nextHidden);
        deactivatedMsg = t("errors.sectionsDeactivated", { sections: emptyEnabled.join(", ") });
        setSaveMessage(deactivatedMsg);
      }

      if (hiddenSet.has("details") && hasStoredConfig) {
        candidate.weddingDay = config.weddingDay;
        candidate.weddingMonth = config.weddingMonth;
        candidate.weddingYear = config.weddingYear;
        candidate.weddingHour = config.weddingHour;
        candidate.weddingMinute = config.weddingMinute;
      }

      // Detecta campos cambiados comparando candidate vs config actual (no vs defaultConfig)
      const changed: string[] = [];
      for (const key of Object.keys(candidate)) {
        const newVal = String(candidate[key as keyof InvitationConfig] ?? "");
        const oldVal = String((baseForDiff as Record<string, unknown>)[key] ?? "");
        if (newVal !== oldVal) {
          changed.push(key);
        }
      }

      // Campos que SIEMPRE se envían aunque no hayan cambiado (requeridos por reglas/seguridad)
      const alwaysInclude = new Set<string>([
        "privacyConsent",
        "privacyConsentAt",
        "privacyPolicyVersion",
        "firstName",
        "secondName",
      ]);
      if (!hasStoredConfig) {
        alwaysInclude.add("createdAt");
        alwaysInclude.add("setupTokenHash");
      }

      // Construye payload incremental: solo campos cambiados + alwaysInclude + migraciones
      const payload: Record<string, unknown> = {};
      const originalImages: Record<string, string> = {};
      for (const key of changed) {
        if (key in candidate) {
          payload[key] = (candidate as Record<string, unknown>)[key];
        }
      }
      // Añade campos obligatorios aunque no hayan cambiado
      for (const key of alwaysInclude) {
        if (!(key in payload) && key in candidate) {
          payload[key] = (candidate as Record<string, unknown>)[key];
        }
      }

      // Migración de imágenes data-URL → configImages (solo si cambiaron)
      const { saveConfigImage } = await import("../lib/image-store");
      for (const imageId of ["couplePhoto", "backgroundImage", "customSeal", "cornerDecoration"] as const) {
        const val = (candidate as Record<string, unknown>)[imageId];
        if (typeof val === "string" && val.startsWith("data:")) {
          originalImages[imageId] = val;
          payload[imageId] = await saveConfigImage(inviteToken, imageId, val);
        }
      }

      // Cifrado bankInfo (solo si cambió)
      if (changed.includes("bankInfo") || alwaysInclude.has("bankInfo")) {
        const val = (candidate as Record<string, unknown>).bankInfo;
        if (val) payload.bankInfo = await encrypt(val as string, inviteToken);
      }

      // Campos obligatorios de consentimiento/versionado (siempre)
      payload.privacyPolicyVersion = PRIVACY_POLICY_VERSION;
      payload.privacyConsent = true;
      payload.privacyConsentAt = serverTimestamp();
      if (!hasStoredConfig) {
        payload.createdAt = serverTimestamp();
        const storedToken = (() => {
          try {
            return sessionStorage.getItem(STORAGE_KEYS.setupToken(inviteToken || "")) || "";
          } catch {
            return "";
          }
        })();
        if (storedToken) {
          payload.setupTokenHash = await hashSetupToken(storedToken);
        }
      }

      // Campos de SUPERADMIN: nunca los toca el admin
      const superAdminFields = [
        "verified",
        "adminNotes",
        "manualExpiry",
        "status",
        "tags",
        "rsvpCapacity",
        "rsvpSignatureEnabled",
      ];
      for (const k of superAdminFields) {
        delete payload[k];
      }
      delete (payload as Record<string, unknown>).musicFile;

      isSavingRef.current = true;
      setIsSaving(true);

      try {
        // Auditoría: registra solo los campos que realmente cambiaron
        if (changed.length > 0) {
          await addDoc(collection(db, "invitations", inviteToken, "configLog"), {
            fields: changed.slice(0, 60).join(", "),
            ts: serverTimestamp(),
            userAgent: navigator.userAgent.slice(0, 200),
          });
        }

        // Guardado incremental: solo campos en payload (merge: true respeta lo no enviado)
        await setDoc(invitationDocRef(inviteToken), payload, { merge: true });

        // Invalida la caché de invitación: sin esto, un guardado y recarga
        // inmediata servía el estado pre-guardado durante el TTL de 2 min.
        try {
          localStorage.removeItem(STORAGE_KEYS.inviteCache(inviteToken));
        } catch {}

        // Crea el documento grupo de RSVP de la invitación (tope anti-spam) si no existe.
        // Con reintento ante fallos transitorios: sin contador, el primer RSVP
        // fallaría con un error genérico (antes el fallo se tragaba en silencio).
        try {
          const groupRef = doc(db, "rsvpResponses", inviteToken);
          const groupSnap = await getDoc(groupRef);
          if (!groupSnap.exists()) {
            await withWriteRetry(() => setDoc(groupRef, { count: 0, attendingCount: 0 }));
          }
        } catch (counterErr) {
          safeLogError(["[app]", "[ConfigProvider]", "RSVP counter create failed"], counterErr);
          setSaveError(t("errors.rsvpCounterFailed"));
        }

        // Reconstruye el config completo en memoria: merge de cambios + config actual
        const savedConfig = { ...config };
        for (const key of changed) {
          if (key in payload) {
            (savedConfig as Record<string, unknown>)[key] = payload[key];
          }
        }
        // Campos obligatorios siempre incluidos
        for (const key of alwaysInclude) {
          if (key in payload) {
            (savedConfig as Record<string, unknown>)[key] = payload[key];
          }
        }
        // Campos de sesión/setup que no están en config pero se guardaron
        if (!hasStoredConfig) {
          savedConfig.createdAt = String(payload.createdAt);
          savedConfig.setupTokenHash = payload.setupTokenHash as string;
        }
        // Restore data URLs en memoria (para sesión actual)
        for (const [k, v] of Object.entries(originalImages)) {
          (savedConfig as Record<string, unknown>)[k] = v;
        }

        // musicFile se restaura desde formData (no se guarda en el doc principal)
        const musicFileValue = (formData as Record<string, unknown>).musicFile;
        if (musicFileValue) (savedConfig as Record<string, unknown>).musicFile = musicFileValue as string;

        setConfig(savedConfig);
        setFormData(savedConfig);
        formStore.setAll(savedConfig as unknown as Record<string, string>);
        setHasStoredConfig(true);

        for (const cb of onFirstSaveCallbacksRef.current) cb();
        onFirstSaveCallbacksRef.current = [];

        setSaveMessage(deactivatedMsg || t("errors.configSaved"));
      } catch (e) {
        safeLogError(["[app]", "[ConfigProvider]", "save error"], e);
        // Un permission-denied al guardar suele significar sesión expirada o
        // token no verificado: se avisa de forma útil en vez del genérico.
        const code = (e as { code?: string })?.code;
        setSaveError(code === "permission-denied" ? t("errors.saveSessionExpired") : getFirestoreErrorMessage(e, t));
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [
      hasStoredConfig,
      formData,
      inviteToken,
      config,
      autoSaveTimerRef,
      isSavingRef,
      t,
      setSaveError,
      setSaveMessage,
      updateFormField,
      formStore,
    ],
  );

  const handleResetForm = useCallback(() => {
    const message = hasStoredConfig ? t("setup.resetConfirmAdmin") : t("setup.resetConfirmInitial");
    if (!window.confirm(message)) {
      return;
    }
    setSaveMessage("");
    setSaveError("");
    if (hasStoredConfig) {
      // Setup admin: restablece todos los campos por defecto.
      setFormData(defaultConfig as InvitationConfig);
      formStore.setAll(defaultConfig as unknown as Record<string, string>);
    } else {
      // Setup inicial: restablece todos los campos excepto el token
      // predefinido (el token de acceso vive fuera de formData; el username
      // ligado a él se conserva para no perder las credenciales de acceso).
      setFormData({ ...defaultConfig, adminUsername: formData.adminUsername } as InvitationConfig);
    }
  }, [hasStoredConfig, formData.adminUsername, t, setSaveMessage, setSaveError, formStore]);

  const handleDeleteInvitation = useCallback(async () => {
    if (!inviteToken) return;
    if (!window.confirm(t("errors.deleteConfirm"))) {
      return;
    }
    try {
      // Borrado en cascada completo (GDPR art. 17): respuestas RSVP, todas las
      // subcolecciones sociales con PII (reactions, notes, songs, rides, gifts,
      // mailbox, confirmedPeople…), mesas con nombres de invitados, tokens de
      // setup asociados, contador RSVP y el documento de invitación. Antes
      // solo se borraban las respuestas y el doc: el resto de datos de
      // invitados quedaba huérfano y legible para siempre.
      const { deleteInvitationCascade } = await import("../lib/invitation-subcollections");
      await deleteInvitationCascade(inviteToken, db);
      const { deleteGallery, deleteAllConfigImages } = await import("../lib/image-store");
      const { deleteAudio } = await import("../lib/music-store");
      await deleteGallery(inviteToken);
      await deleteAllConfigImages(inviteToken);
      // El audio (chunks cifrados) también se elimina: sin esto quedaban
      // huérfanos para siempre (incumplía el borrado completo de datos).
      await deleteAudio(inviteToken);
      // El registro setupTokens/{hash} también se elimina (si el token de
      // setup sigue en esta sesión): sin esto quedaba un hash huérfano que
      // apuntaba a una invitación inexistente.
      try {
        const storedToken = safeGetItem(STORAGE_KEYS.setupToken(inviteToken), sessionStorage);
        if (storedToken) await deleteSetupTokenRecord(storedToken);
      } catch {
        /* el registro se borrará en la limpieza del superadmin */
      }
      safeRemoveItem(STORAGE_KEYS.inviteCache(inviteToken));
      safeRemoveItem(STORAGE_KEYS.audio(inviteToken));
      clearSession();

      navigate("/");
    } catch (e) {
      safeLogError(["[app]", "[ConfigProvider]", "delete invitation error"], e);
      setSaveError(getFirestoreErrorMessage(e, t));
    }
  }, [inviteToken, navigate, t, setSaveError]);

  const configValue = useMemo(
    () => ({
      config,
      formData,
      hasStoredConfig,
      isConfigLoading,
      configLoadError,
      inviteToken,
      maxAllowedYear: MAX_ALLOWED_YEAR,
      formattedDate,
      formattedTime,
      calendarLink,
      visitCount,
      updateFormField,
      reloadConfig,
      handleSaveSetup: handleSaveSetupCore,
      handleDayChange,
      handleTimeChange,
      handleTimeBlur,
      handleYearChange,
      handleResetForm,
      handleDeleteInvitation,
      setHasStoredConfig,
      registerOnFirstSave,
      isSaving,
    }),
    [
      config,
      formData,
      hasStoredConfig,
      isConfigLoading,
      configLoadError,
      inviteToken,
      formattedDate,
      formattedTime,
      calendarLink,
      visitCount,
      updateFormField,
      reloadConfig,
      handleSaveSetupCore,
      handleDayChange,
      handleTimeChange,
      handleTimeBlur,
      handleYearChange,
      handleResetForm,
      handleDeleteInvitation,
      setHasStoredConfig,
      registerOnFirstSave,
      isSaving,
    ],
  );

  // Valor de las acciones estables del editor: se memoiza SOLO con dependencias
  // estables o que cambian raramente (token, hasStoredConfig), nunca con
  // formData/config → los formularios no re-renderizan por cada tecla.
  const configActionsValue = useMemo<ConfigActionsValue>(
    () => ({
      updateFormField,
      handleDayChange,
      handleTimeChange,
      handleTimeBlur,
      handleYearChange,
      maxAllowedYear: MAX_ALLOWED_YEAR,
      inviteToken,
      hasStoredConfig,
    }),
    [
      updateFormField,
      handleDayChange,
      handleTimeChange,
      handleTimeBlur,
      handleYearChange,
      inviteToken,
      hasStoredConfig,
    ],
  );

  return (
    <FormStoreContext.Provider value={formStore}>
      <ConfigActionsContext.Provider value={configActionsValue}>
        <ConfigContext.Provider value={configValue}>{children}</ConfigContext.Provider>
      </ConfigActionsContext.Provider>
    </FormStoreContext.Provider>
  );
}
