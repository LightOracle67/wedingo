/**
 * AppContext.jsx
 * ─────────────────────────────────────────────────────────────
 * Contexto global de la aplicación Wedingo.
 * Proporciona el estado compartido (configuración, RSVP, auth,
 * invitaciones) a toda la app a través de React Context.
 *
 * Responsabilidades principales:
 * - Cargar y cachear la configuración de la invitación desde Firestore.
 * - Gestionar el guardado automático y manual de la configuración.
 * - Manejar la subida de imágenes de fondo y foto de pareja.
 * - Consolidar los hooks de RSVP, calendario, mapa y autenticación.
 * - Controlar el modal legal (privacidad, cookies, términos).
 * - Rastrear visitas a la invitación (analytics).
 *
 * @module AppContext
 */

import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { getDoc, setDoc, increment, updateDoc, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db, invitationDocRef, rsvpByInviteRef } from "../lib/firebase";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES, defaultConfig, MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER, STORY_SECTION_ORDER, THEME_VALUES } from "../lib/constants";
import { normalizeConfig } from "../lib/normalize-config";
import { decodeInviteConfig } from "../lib/invite-config-codec";
import { compressImage } from "../lib/image-utils";
import { uploadImage, loadDecryptedField, deleteGallery, loadGallery } from "../lib/image-store";
import { saveSession, clearSession } from "../lib/sessionVars";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";
import { encrypt, decrypt } from "../lib/crypto-utils";
import { useCalendar } from "../hooks/useCalendar";
import { useFieldHandlers } from "../hooks/useFieldHandlers";
import { useRsvp } from "../hooks/useRsvp";
import { useMapPreview } from "../hooks/useMapPreview";
import { useSetupAuth } from "../hooks/useSetupAuth";
import { useAutoSave } from "../hooks/useAutoSave";
import LegalModal, { PRIVACY_POLICY_VERSION } from "../components/LegalModal";

/** Contexto de React — se crea vacío, se llena en AppProvider. */
const AppContext = createContext(null);

/** Contextos divididos para evitar re-renders globales. */
const ConfigContext = createContext(null);
const AuthContext = createContext(null);
const RsvpContext = createContext(null);
const UIContext = createContext(null);

/**
 * Proveedor del contexto global de Wedingo.
 * Envuelve toda la aplicación y expone el estado compartido
 * (configuración de boda, RSVP, autenticación, etc.).
 *
 * @param {{ children: React.ReactNode }} props - Componentes hijos envueltos.
 * @returns {JSX.Element} Provider con el valor del contexto.
 */
export function AppProvider({ children }) {
  const { t } = useTranslation();
  /** Año máximo permitido para la fecha de boda (actual + 4 años). */
  const maxAllowedYear = new Date().getFullYear() + 4;

  // ─── Estados de configuración ──────────────────────────
  const [config, setConfig] = useState(defaultConfig);
  const [formData, setFormData] = useState(defaultConfig);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configLoadError, setConfigLoadError] = useState("");

  /** Token de la invitación (extraído de la URL). */
  const [inviteToken, setInviteToken] = useState("");

  // ─── Estados de mensajes ───────────────────────────────
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminMessageType, setAdminMessageType] = useState("success");

  // ─── Estados de UI ─────────────────────────────────────
  const [legalModal, setLegalModal] = useState("");
  const [locationMapError, setLocationMapError] = useState("");
  const [locationMapLoading, setLocationMapLoading] = useState(false);
  const [locationMapTarget, setLocationMapTarget] = useState(null);
  const locationMapContainerRef = useRef(null);

  /** Previene guardados simultáneos duplicados. */
  const isSavingRef = useRef(false);
  /** Evita recargar la configuración si el token ya se cargó. */
  const loadedTokenRef = useRef("");

  /** Contador de visitas y flag para evitar múltiples rastreos. */
  const [visitCount, setVisitCount] = useState(0);
  const trackedRef = useRef(false);

  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Registra una visita a la invitación incrementando el contador en Firestore.
   * Solo se ejecuta una vez por sesión (trackedRef).
   *
   * @param {string} token - Token de la invitación.
   */
  const trackVisit = useCallback(async (token) => {
    if (!token || trackedRef.current) return;
    trackedRef.current = true;
    try {
      const ref = invitationDocRef(token);
      await updateDoc(ref, { _visits: increment(1) });
    } catch {}
  }, []);

  // ─── Hooks de autenticación de setup ───────────────────
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

  // ─── Hooks de RSVP ─────────────────────────────────────
  const {
    rsvpEntries, rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    alreadySubmittedEntry,
    updateRsvpField, handleRsvpSubmit, handleClearRsvpEntries, handleDeleteRsvp,
    handleDietaryToggle, DIETARY_OPTIONS,
    computeAge,
  } = useRsvp(inviteToken, setAdminMessage, setAdminMessageType, config.menuEnabled === "true");

  // ─── Hook de calendario ────────────────────────────────
  const { formattedDate, formattedTime, calendarLink } = useCalendar(config);

  /**
   * Actualiza un campo individual del formulario de configuración.
   * @param {string} field - Nombre del campo.
   * @param {*} value - Nuevo valor.
   */
  const updateFormField = useCallback((field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  }, []);

  /**
   * Aplica una imagen de fondo seleccionada al formulario.
   * Guarda la URL, etiqueta y fuente.
   *
   * @param {string} backgroundImage - URL de la imagen de fondo.
   * @param {string} backgroundImageLabel - Etiqueta descriptiva.
   * @param {string} backgroundImageSource - Origen (upload, openfreemap, etc.).
   */
  const applyBackgroundImage = useCallback((backgroundImage, backgroundImageLabel, backgroundImageSource) => {
    setFormData((current) => ({
      ...current,
      backgroundImage,
      backgroundImageLabel,
      backgroundImageSource,
    }));
  }, []);

  // ─── Hook de previsualización y coordenadas ────────────
  const { previewBackgrounds, isPreviewLoading } = useMapPreview(
    formData.weddingPlace,
    formData.weddingLatitude,
    formData.weddingLongitude,
  );

  // ─── Hook de validación de campos de fecha y coordenadas ──
  const {
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange,
  } = useFieldHandlers(updateFormField, maxAllowedYear, formData.weddingMinute);

  // ─── Hook de autoguardado ──────────────────────────────
  const { autoSaveTimerRef } = useAutoSave(hasStoredConfig, inviteToken, formData, config, setSaveMessage, isSavingRef);

  /**
   * useEffect principal de carga de configuración.
   *
   * Flujo:
   * 1. Si hay hash en la URL, decodifica la configuración desde el hash.
   * 2. Si hay token en la ruta, carga la configuración desde Firestore.
   * 3. Usa caché en localStorage (2 min TTL) para evitar lecturas repetidas.
   * 4. Desencripta campos sensibles (bankInfo, backgroundImage, couplePhoto).
   */
  useEffect(() => {
    const hash = window.location.hash;
    const isInvite = new URLSearchParams(window.location.search).has("invitar");
    const pathParts = location.pathname.split("/").filter(Boolean);
    const firstSegment = pathParts[0] || "";
    // Detecta si el primer segmento de la ruta es un token de invitación
    const isTokenRoute = /^[a-zA-Z0-9]{8,12}$/.test(firstSegment) && !["setup", "admin", "superadmin-login", "superadmin"].includes(firstSegment);
    const isAdminRoute = pathParts[1] === "setup" || pathParts[1] === "admin";

    // ── Caso 1: Configuración embebida en el hash ──
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

    // ── Caso 2: Modo invitar sin token ──
    if (isInvite && !isTokenRoute) {
      setIsConfigLoading(false);
      return;
    }

    // ── Caso 3: Token detectado → se actualiza el estado ──
    if (isTokenRoute && inviteToken !== firstSegment) {
      setInviteToken(firstSegment);
      setIsConfigLoading(true);
      return;
    }

    // ── Caso 4: Ruta no relacionada con invitación ──
    if (!isAdminRoute && !isTokenRoute) {
      setIsConfigLoading(false);
      return;
    }

    setIsConfigLoading(true);

    /**
     * Carga la configuración desde Firestore y la hidrata.
     */
    const hydrateConfig = async () => {
      setConfigLoadError("");
      try {
        if (!inviteToken) { setIsConfigLoading(false); return; }

        // Evita recargar si ya se cargó el mismo token
        if (inviteToken === loadedTokenRef.current && hasStoredConfig) {
          setIsConfigLoading(false);
          return;
        }

        // Intenta cargar desde caché local (2 min TTL)
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

        // Carga desde Firestore
        const snapshot = await getDoc(invitationDocRef(inviteToken));
        if (!snapshot.exists()) {
          setHasStoredConfig(false);
          setConfig(defaultConfig);
          setFormData(defaultConfig);
          setIsConfigLoading(false);
          return;
        }
        const parsed = normalizeConfig(snapshot.data());
        // Desencripta campos sensibles usando el token como clave
        if (parsed.bankInfo) parsed.bankInfo = await decrypt(parsed.bankInfo, inviteToken);
        if (parsed.backgroundImage) parsed.backgroundImage = await loadDecryptedField(inviteToken, parsed.backgroundImage);
        if (parsed.couplePhoto) parsed.couplePhoto = await loadDecryptedField(inviteToken, parsed.couplePhoto);
        const hydrated = { ...defaultConfig, ...parsed };
        setConfig(hydrated);
        setFormData(hydrated);
        // Carga las imágenes de la galería desde Firestore para mostrarlas
        // como miniaturas en el formulario de administración (máx 10).
        if (isAdminRoute || location.pathname.includes("/setup")) {
          loadGallery(inviteToken).then((urls) => {
            if (urls.length) {
              setFormData((prev) => ({ ...prev, galleryImages: JSON.stringify(urls.slice(0, 10)) }));
            }
          }).catch(() => {});
        }
        // Guarda en caché local
        safeSetItem(`wedin_invite_cache_${inviteToken}`, JSON.stringify({ data: hydrated, cachedAt: Date.now() }));
        setVisitCount(typeof snapshot.data()._visits === "number" ? snapshot.data()._visits : 0);
        setHasStoredConfig(true);
        loadedTokenRef.current = inviteToken;
        const firstSegment = location.pathname.split("/").filter(Boolean)[0] || "";
        // Rastrea la visita si el usuario ha aceptado cookies
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

  /**
   * Recarga la configuración desde Firestore, ignorando la caché.
   * Útil después de restaurar una copia de seguridad.
   */
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
      // Recarga también la galería al restaurar
      loadGallery(inviteToken).then((urls) => {
        if (urls.length) {
          setFormData((prev) => ({ ...prev, galleryImages: JSON.stringify(urls.slice(0, 10)) }));
        }
      }).catch(() => {});
    } catch {}
  }, [inviteToken]);

  /**
   * Limpia los mensajes de toast al cambiar de ruta.
   */
  useEffect(() => {
    setSaveMessage("");
    setSaveError("");
    setAuthMessage("");
    setAdminMessage("");
  }, [location.pathname, setAuthMessage]);

  /**
   * Si no hay configuración guardada, regenera el token de setup automáticamente.
   */
  useEffect(() => {
    if (hasStoredConfig || !inviteToken) return;
    (async () => { await refreshSetupToken(); })();
  }, [hasStoredConfig, inviteToken, refreshSetupToken]);

  /**
   * Elimina la imagen de fondo seleccionada.
   */
  const handleClearBackground = useCallback(() => {
    applyBackgroundImage("", "", "");
    setFormData(prev => ({ ...prev, backgroundImage: "" }));
  }, [applyBackgroundImage]);

  /**
   * Selecciona una imagen de fondo de la previsualización del mapa.
   * Sube la imagen al storage y la asigna como fondo.
   *
   * @param {string} imageDataUrl - URL de datos de la imagen.
   * @param {string} label - Etiqueta descriptiva.
   * @param {string} source - Origen de la imagen (por defecto "openfreemap").
   */
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

  /**
   * Maneja la subida de una imagen de fondo personalizada.
   * Valida el tipo y tamaño del archivo antes de subir.
   *
   * @param {Event} event - Evento de cambio del input file.
   */
  const handleBackgroundUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) { event.target.value = ""; return; }
    // Valida el tipo de archivo
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setSaveError(t("errors.fileFormat"));
      event.target.value = "";
      return;
    }
    // Valida el tamaño máximo
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

  /**
   * Guarda la configuración de la boda en Firestore.
   *
   * Flujo de validación:
   * 1. Verifica que no haya un guardado en curso.
   * 2. Valida token de autenticación (primer guardado).
   * 3. Valida todos los campos obligatorios (nombres, fecha, tema, etc.).
   * 4. Encripta campos sensibles (bankInfo, imágenes).
   * 5. Guarda en Firestore y actualiza el estado local.
   *
   * @param {Event} event - Evento submit del formulario.
   */
  const handleSaveSetup = useCallback(async (event) => {
    event.preventDefault();
    // Cancela cualquier autoguardado pendiente
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    // Previene guardados simultáneos
    if (isSavingRef.current) {
      setSaveError(t("errors.alreadySaving"));
      return;
    }
    setSaveError("");
    setSaveMessage("");

    // ── Verificación de autenticación (solo primer guardado) ──
    if (!hasStoredConfig && !isTokenVerified && !setupToken) {
      setSaveError(t("errors.verifyTokenFirst"));
      return;
    }

    const sanitized = normalizeConfig(formData);
    // Secciones ocultas: extrae el array excluyendo secciones especiales
    const hiddenArray = (sanitized.hiddenSections || "").split(",").filter(Boolean).filter(s => s !== "menu" && s !== "transport" && s !== "godparents");
    const hiddenSet = new Set(hiddenArray);

    // ── Validaciones de primer guardado ──
    if (!hasStoredConfig) {
      // Consentimiento de privacidad obligatorio
      if (formData._privacyConsent !== "true") {
        setSaveError(t("errors.acceptPrivacyPolicy"));
        return;
      }
      // Nombre de usuario obligatorio y validado
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

    // ── Nombres de los novios obligatorios ──
    if (!sanitized.firstName || !sanitized.secondName) {
      setSaveError(t("errors.bothNamesRequired"));
      return;
    }

    // ── Validación de fecha (si la sección detalles no está oculta) ──
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
      // Verifica que la fecha sea válida (ej: 31 de febrero no existe)
      if (enteredDate.getDate() !== parsedDay || enteredDate.getMonth() !== monthNum - 1 || enteredDate.getFullYear() !== parsedYear) {
        setSaveError(t("errors.dateNotValid"));
        return;
      }
      // La fecha debe ser futura
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

    // ── Validación de tema ──
    if (!THEME_VALUES.has(sanitized.theme)) {
      setSaveError(t("errors.themeInvalid"));
      return;
    }

    // ── Validación de orden de secciones ──
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
    // Los padrinos deben ir en pareja (ambos o ninguno)
    if (Boolean(sanitized.godparent1) !== Boolean(sanitized.godparent2)) {
      setSaveError(t("errors.godparentsRequired"));
      return;
    }
    // La portada (hero) debe ser la primera sección
    if (orderArray[0] !== "hero") {
      setSaveError(t("errors.coverFirst"));
      return;
    }

    // ── Validación de menú ──
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

    // ── Validación de IBAN ──
    if (sanitized.bankInfo) {
      const upper = sanitized.bankInfo.toUpperCase();
      const looksLikeIban = /^[A-Z]{2}\d/.test(upper);
      if (looksLikeIban && !/^[A-Z]{2}\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{0,4}$/.test(upper)) {
        setSaveError(t("errors.ibanInvalid"));
        return;
      }
    }

    // ── Validación de URL de música ──
    if (sanitized.musicUrl && !/^https?:\/\/.+\..+/.test(sanitized.musicUrl)) {
      setSaveError(t("errors.musicUrlInvalid"));
      return;
    }

    // ── Validación de galería (JSON) ──
    if (sanitized.galleryImages) {
      try { JSON.parse(sanitized.galleryImages); } catch {
        setSaveError(t("errors.galleryFormatInvalid"));
        return;
      }
    }

    // ── Validación de cantidad de secciones ──
    if (sanitized.sectionOrder) {
      const expected = STORY_SECTION_ORDER.length;
      const actual = orderArray.length;
      if (actual !== expected) {
        setSaveError(t("errors.sectionOrderMismatch", { actual, expected }));
        return;
      }
    }

    // ── Validación de longitudes máximas ──
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

    // ── Construcción del payload ──
    const payload = { ...defaultConfig, ...sanitized };
    // Si la sección detalles está oculta, preserva la fecha anterior
    if (hiddenSet.has("details") && hasStoredConfig) {
      payload.weddingDay = config.weddingDay;
      payload.weddingMonth = config.weddingMonth;
      payload.weddingYear = config.weddingYear;
      payload.weddingHour = config.weddingHour;
      payload.weddingMinute = config.weddingMinute;
    }

    isSavingRef.current = true;
    try {
      // Encripta campos sensibles antes de guardar
      const bgOrig = payload.backgroundImage?.startsWith("data:") ? payload.backgroundImage : null;
      const cpOrig = payload.couplePhoto?.startsWith("data:") ? payload.couplePhoto : null;
      if (payload.bankInfo) payload.bankInfo = await encrypt(payload.bankInfo, inviteToken);
      if (bgOrig) payload.backgroundImage = await encrypt(bgOrig, inviteToken);
      if (cpOrig) payload.couplePhoto = await encrypt(cpOrig, inviteToken);
      // Marca la versión de la política de privacidad aceptada
      if (!hasStoredConfig) payload.privacyPolicyVersion = PRIVACY_POLICY_VERSION;
      // Guarda en Firestore
      await setDoc(invitationDocRef(inviteToken), payload);
      // Desencripta para uso local
      if (payload.bankInfo) payload.bankInfo = await decrypt(payload.bankInfo, inviteToken);
      if (bgOrig) payload.backgroundImage = bgOrig;
      if (cpOrig) payload.couplePhoto = cpOrig;
      setConfig(payload);
      setFormData(payload);
      setHasStoredConfig(true);
      setSetupToken("");
      setSetupTokenInput("");
      // Activa la sesión en Firestore
      if (!isTokenVerified) {
        try {
          await updateDoc(invitationDocRef(inviteToken), { activeSession: serverTimestamp() });
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

  /**
   * Elimina la invitación completa: respuestas RSVP, galería, documento.
   * Requiere confirmación del usuario.
   */
  const handleDeleteInvitation = useCallback(async () => {
    if (!inviteToken) return;
    if (!window.confirm(t("errors.deleteConfirm"))) return;
    try {
      // Elimina todas las respuestas RSVP en batch
      const snap = await getDocs(rsvpByInviteRef(inviteToken));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      // Elimina la galería de imágenes
      await deleteGallery(inviteToken);
      // Elimina el documento de la invitación
      batch.delete(invitationDocRef(inviteToken));
      await batch.commit();
      // Limpia caché y sesión
      safeRemoveItem(`wedin_invite_cache_${inviteToken}`);
      clearSession();
      setIsTokenVerified(false);
      setTokenLoginUsername("");
      navigate("/");
    } catch {
      setSaveError(t("errors.deleteFailed"));
    }
  }, [inviteToken, navigate, setIsTokenVerified, setTokenLoginUsername]);

  const configValue = useMemo(() => ({
    config, formData, hasStoredConfig, isConfigLoading, configLoadError, inviteToken,
    maxAllowedYear, previewBackgrounds, isPreviewLoading,
    formattedDate, formattedTime, calendarLink, visitCount,
    updateFormField, reloadConfig, handleSaveSetup,
    handleBackgroundUpload, handleClearBackground, handleSelectPreviewBackground,
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange, handleDeleteInvitation,
  }), [
    config, formData, hasStoredConfig, isConfigLoading, configLoadError, inviteToken,
    maxAllowedYear, previewBackgrounds, isPreviewLoading,
    formattedDate, formattedTime, calendarLink, visitCount,
    updateFormField, reloadConfig, handleSaveSetup,
    handleBackgroundUpload, handleClearBackground, handleSelectPreviewBackground,
    handleDayChange, handleHourChange, handleMinuteChange, handleMinuteBlur,
    handleYearChange, handleCoordinateChange, handleDeleteInvitation,
  ]);

  const authValue = useMemo(() => ({
    setupToken, setupTokenInput, isTokenVerifying, isTokenVerified,
    tokenLoginUsername, adminLoginUsername, generatedToken,
    isAdminTokenLoggedIn, confirmTokenInput,
    refreshSetupToken,
    handleTokenLogin, handleAdminTokenLogin, handleGenerateToken,
    handleAdminLogout, handleResetSetupToken, handleResetTokenFromAdmin,
    setSetupTokenInput, setIsTokenVerified, setTokenLoginUsername,
    setAdminLoginUsername, setConfirmTokenInput,
  }), [
    setupToken, setupTokenInput, isTokenVerifying, isTokenVerified,
    tokenLoginUsername, adminLoginUsername, generatedToken,
    isAdminTokenLoggedIn, confirmTokenInput,
    refreshSetupToken,
    handleTokenLogin, handleAdminTokenLogin, handleGenerateToken,
    handleAdminLogout, handleResetSetupToken, handleResetTokenFromAdmin,
    setSetupTokenInput, setIsTokenVerified, setTokenLoginUsername,
    setAdminLoginUsername, setConfirmTokenInput,
  ]);

  const rsvpValue = useMemo(() => ({
    rsvpEntries, rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    alreadySubmittedEntry, DIETARY_OPTIONS,
    updateRsvpField, handleRsvpSubmit, handleDietaryToggle,
    handleDeleteRsvp, computeAge, handleClearRsvpEntries,
  }), [
    rsvpEntries, rsvpForm, rsvpMessage, isRsvpSubmitting, hasSubmitted,
    alreadySubmittedEntry, DIETARY_OPTIONS,
    updateRsvpField, handleRsvpSubmit, handleDietaryToggle,
    handleDeleteRsvp, computeAge, handleClearRsvpEntries,
  ]);

  const uiValue = useMemo(() => ({
    legalModal, setLegalModal,
    saveMessage, saveError,
    adminMessage, adminMessageType,
    authMessage, authMessageType,
    locationMapContainerRef, locationMapError, setLocationMapError,
    locationMapLoading, setLocationMapLoading, locationMapTarget, setLocationMapTarget,
  }), [
    legalModal, saveMessage, saveError,
    adminMessage, adminMessageType,
    authMessage, authMessageType,
    locationMapContainerRef, locationMapError,
    locationMapLoading, locationMapTarget,
  ]);

  return (
    <ConfigContext.Provider value={configValue}>
      <AuthContext.Provider value={authValue}>
        <RsvpContext.Provider value={rsvpValue}>
          <UIContext.Provider value={uiValue}>
            <AppContext.Provider value={{ ...configValue, ...authValue, ...rsvpValue, ...uiValue }}>
              {/* Modal legal (privacidad, cookies, términos) — solo se renderiza si está abierto */}
              {legalModal && <LegalModal section={legalModal} onClose={() => setLegalModal("")} />}
              {children}
            </AppContext.Provider>
          </UIContext.Provider>
        </RsvpContext.Provider>
      </AuthContext.Provider>
    </ConfigContext.Provider>
  );
}

/**
 * Hook personalizado para consumir el contexto global de la aplicación.
 * Lanza un error si se usa fuera de AppProvider.
 *
 * @returns {object} El valor completo del contexto AppContext.
 * @throws {Error} Si no hay un AppProvider ancestro.
 */
// eslint-disable-next-line react/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de AppProvider");
  return context;
}

/** Hook selector para el contexto de configuración. */
// eslint-disable-next-line react/only-export-components
export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig debe usarse dentro de AppProvider");
  return ctx;
}

/** Hook selector para el contexto de autenticación. */
// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AppProvider");
  return ctx;
}

/** Hook selector para el contexto de RSVP. */
// eslint-disable-next-line react/only-export-components
export function useRsvpContext() {
  const ctx = useContext(RsvpContext);
  if (!ctx) throw new Error("useRsvpContext debe usarse dentro de AppProvider");
  return ctx;
}

/** Hook selector para el contexto de UI (mensajes, modales, mapa). */
// eslint-disable-next-line react/only-export-components
export function useAppUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useAppUI debe usarse dentro de AppProvider");
  return ctx;
}
