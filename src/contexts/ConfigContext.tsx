import {
  useCallback,
  useContext,
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import {
  getDoc,
  setDoc,
  doc,
  increment,
  getDocs,
  writeBatch,
  addDoc,
  collection,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, invitationDocRef, rsvpByInviteRef } from "../lib/firebase";
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
import { ConfigContext } from "./useConfig";
import { FormStoreContext, createFormStore, type FormStore } from "./FormStore";
import { useAppUI } from "./useAppUI";

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
      console.warn("[app]", "[ConfigProvider]", "trackVisit failed:", getFirestoreErrorMessage(e));
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
        console.error("[app]", "[ConfigProvider]", "hydrateConfig error", { error: e });
        if (!hasStoredConfig) {
          setConfigLoadError(getFirestoreErrorMessage(e, t));
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
      console.error("[app]", "[ConfigProvider]", "reloadConfig error", { error: e });
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
      setSaveError("");
      setSaveMessage("");

      const { sanitized, hiddenSet, errorKey, errorParams } = validateConfigForSave(
        formData,
        hasStoredConfig,
        MAX_ALLOWED_YEAR,
      );
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
        if (payload.bankInfo) {
          payload.bankInfo = await encrypt(payload.bankInfo, inviteToken);
        }
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
        // Evidencia auditable del consentimiento del responsable (GDPR art.
        // 7.1): se estampa la versión aceptada y un timestamp de servidor.
        payload.privacyPolicyVersion = PRIVACY_POLICY_VERSION;
        payload.privacyConsent = true;
        payload.privacyConsentAt = serverTimestamp();
        // Fecha de creación: solo en el primer guardado (create).
        if (!hasStoredConfig) {
          payload.createdAt = serverTimestamp();
        }

        // Primer guardado (create): las reglas exigen la prueba de conocimiento
        // del token de setup (setupTokenValid) para no alojar invitaciones
        // falsas. Se adjunta el hash del token guardado en sessionStorage.
        if (!hasStoredConfig) {
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

        // Campos de SUPERADMIN: el guardado del admin NO debe tocarlos (con
        // setDoc + merge, si no viajan en el payload se conservan intactos y
        // las reglas no los ven en el diff). Los gestiona solo la pestaña
        // Gestión del superadmin.
        delete payload.verified;
        delete payload.adminNotes;
        delete payload.manualExpiry;
        delete payload.status;
        delete payload.tags;
        delete payload.rsvpCapacity;
        delete payload.rsvpSignatureEnabled;

        // F5-3: auditoría por sección — se registran los campos que cambiaron
        // respecto al config actual (subcolección configLog, solo lectura
        // admin/superadmin). Best-effort.
        try {
          const changed: string[] = [];
          for (const key of Object.keys(payload)) {
            if (String(payload[key] ?? "") !== String((config as Record<string, unknown>)[key] ?? "")) {
              changed.push(key);
            }
          }
          if (changed.length > 0) {
            await addDoc(collection(db, "invitations", inviteToken, "configLog"), {
              fields: changed.slice(0, 60).join(", "),
              ts: serverTimestamp(),
              userAgent: navigator.userAgent.slice(0, 200),
            });
          }
        } catch {}

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
            await withWriteRetry(() => setDoc(groupRef, { count: 0 }));
          }
        } catch (counterErr) {
          console.error("[app]", "[ConfigProvider]", "RSVP counter create failed", { error: counterErr });
          setSaveError(t("errors.rsvpCounterFailed"));
        }

        // Crea los contadores anti-spam de las subcolecciones sociales
        // (_counters/notes, songs, gifts, rides). Igual que rsvpResponses:
        // sin contador, la regla permite escribir y lo crea el cliente en el
        // primer documento (merge+increment), pero inicializarlos aquí hace
        // que el tope aplique desde el primer guardado de la invitación.
        try {
          const counterRefs = ["notes", "songs", "gifts", "rides"].map((name) =>
            doc(db, "invitations", inviteToken, "_counters", name),
          );
          const counterSnaps = await Promise.all(counterRefs.map((ref) => getDoc(ref)));
          await Promise.all(
            counterSnaps.map(async (snap, i) => {
              if (!snap.exists()) {
                await withWriteRetry(() => setDoc(counterRefs[i]!, { count: 0 }));
              }
            }),
          );
        } catch (counterErr) {
          console.error("[app]", "[ConfigProvider]", "social counters create failed", { error: counterErr });
        }

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
        // Solo deben ejecutarse UNA vez (tras el primer guardado). Se vacía la
        // lista para que un remount del proveedor (StrictMode, lazy) no acumule
        // duplicados que se dispararían en cada guardado posterior.
        onFirstSaveCallbacksRef.current = [];

        setSaveMessage(deactivatedMsg || t("errors.configSaved"));
      } catch (e) {
        console.error("[app]", "[ConfigProvider]", "save error", { error: e });
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
      } catch {
        /* el registro se borrará en la limpieza del superadmin */
      }
      safeRemoveItem(STORAGE_KEYS.inviteCache(inviteToken));
      safeRemoveItem(STORAGE_KEYS.audio(inviteToken));
      clearSession();

      navigate("/");
    } catch (e) {
      console.error("[app]", "[ConfigProvider]", "delete invitation error", { error: e });
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
