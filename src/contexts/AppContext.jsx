import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, invitationDocRef, RSVP_COLLECTION_REF, rsvpByInviteRef } from "../lib/firebase";
import { ALLOWED_UPLOAD_TYPES, defaultConfig, MAX_UPLOAD_SIZE_BYTES, MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER, STORY_SECTION_ORDER, THEME_VALUES } from "../lib/constants";
import {
  buildGoogleCalendarUrl,
  compressImage,
  generateSetupToken,
  getValidCoordinates,
  normalizeConfig,
  normalizeTokenValue,
  resolveLocationTarget,
  buildOpenFreeMapPreviewUrl,
  decodeInviteConfig,
} from "../lib/utils";
import { saveSession, getSession, renewSession, clearSession } from "../lib/sessionVars";


const AppContext = createContext(null);

export function AppProvider({ children }) {
  const maxAllowedYear = new Date().getFullYear() + 4;

  const [config, setConfig] = useState(defaultConfig);
  const [formData, setFormData] = useState(defaultConfig);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configLoadError, setConfigLoadError] = useState("");

  const [inviteToken, setInviteToken] = useState("");

  const [setupToken, setSetupToken] = useState("");
  const [setupTokenInput, setSetupTokenInput] = useState("");
  const [isTokenVerifying, setIsTokenVerifying] = useState(false);
  const [isTokenVerified, setIsTokenVerified] = useState(false);
  const [tokenLoginUsername, setTokenLoginUsername] = useState("");
  const [adminLoginUsername, setAdminLoginUsername] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");

  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authMessageType, setAuthMessageType] = useState("error");
  const [confirmTokenInput, setConfirmTokenInput] = useState("");

  const [rsvpEntries, setRsvpEntries] = useState([]);

  const [previewBackgrounds, setPreviewBackgrounds] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [locationMapError, setLocationMapError] = useState("");
  const [locationMapLoading, setLocationMapLoading] = useState(false);
  const [locationMapTarget, setLocationMapTarget] = useState(null);
  const locationMapContainerRef = useRef(null);

  const [rsvpForm, setRsvpForm] = useState({
    guestName: "",
    attendance: "yes",
    companions: "0",
    dietaryInfo: "",
    note: "",
  });
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const rsvpSubmitTimeoutRef = useRef(null);

  const previewRequestRef = useRef(0);

  const isAdminTokenLoggedIn = useMemo(() =>
    isTokenVerified && tokenLoginUsername && (
      !config.adminUsername || config.adminUsername === tokenLoginUsername
    ),
    [isTokenVerified, tokenLoginUsername, config.adminUsername],
  );

  const location = useLocation();

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

    if (isInvite) {
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
        const snapshot = await getDoc(invitationDocRef(inviteToken));
        if (!snapshot.exists()) {
          setHasStoredConfig(false);
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

  useEffect(() => {
    const hydrateRsvp = async () => {
      if (!inviteToken) return;
      try {
        const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
        const entries = snapshot.docs
          .map((entryDoc) => {
            const data = entryDoc.data();
            const submittedDate = data.submittedAt?.toDate?.();
            return {
              id: entryDoc.id,
              guestName: data.guestName || "",
              attendance: data.attendance || "no",
              companions: Number.isFinite(data.companions) ? data.companions : 0,
              note: data.note || "",
              submittedAt: submittedDate ? submittedDate.toISOString() : new Date().toISOString(),
            };
          })
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        setRsvpEntries(entries);
      } catch {
        setRsvpEntries([]);
      }
    };

    hydrateRsvp();
  }, [inviteToken]);

  const renewRef = useRef(null);

  useEffect(() => {
    const session = getSession();
    if (session && (session.type === "setup" || session.type === "admin")) {
      setTokenLoginUsername(session.identifier);
      setSetupToken("");
      setSetupTokenInput("");
      setGeneratedToken("");
      setIsTokenVerified(true);
    }
  }, []);

  useEffect(() => {
    if (isTokenVerified) {
      renewSession();
      renewRef.current = setInterval(() => renewSession(), 60_000);
    } else {
      if (renewRef.current) clearInterval(renewRef.current);
    }
    return () => { if (renewRef.current) clearInterval(renewRef.current); };
  }, [isTokenVerified]);

  useEffect(() => {
    if (isTokenVerified && !hasStoredConfig && tokenLoginUsername) {
      setFormData((current) => ({ ...current, adminUsername: tokenLoginUsername }));
    }
  }, [isTokenVerified, tokenLoginUsername, hasStoredConfig]);

  useEffect(() => {
    if (hasStoredConfig) return;

    (async () => {
      await refreshSetupToken();
    })();
  }, [hasStoredConfig]);

  useEffect(() => {
    return () => {
      if (rsvpSubmitTimeoutRef.current) clearTimeout(rsvpSubmitTimeoutRef.current);
    };
  }, []);

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

  const refreshSetupToken = useCallback(async () => {
    const nextToken = generateSetupToken();
    const normalizedToken = normalizeTokenValue(nextToken);
    setSetupToken(normalizedToken);
    setSetupTokenInput(normalizedToken);

    try {
      await setDoc(doc(db, "setupTokens", normalizedToken), {
        used: false,
        autoGen: true,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Firestore write failed; token still works in memory for this session
    }

    return nextToken;
  }, []);

  const updateRsvpField = useCallback((field, value) => {
    if (field === "attendance" && value === "no") {
      setRsvpForm((current) => ({ ...current, attendance: value, companions: "0" }));
      return;
    }
    setRsvpForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleAdminLogout = useCallback(async () => {
    const username = tokenLoginUsername;
    setIsTokenVerified(false);
    setTokenLoginUsername("");
    setSetupToken("");
    setSetupTokenInput("");
    setGeneratedToken("");
    setAuthMessage("");
    clearSession();
    if (username) {
      try {
        await deleteDoc(doc(db, "sessions", username));
      } catch { }
    }
  }, [tokenLoginUsername]);

  const handleClearRsvpEntries = useCallback(async () => {
    if (!window.confirm("¿Borrar todas las respuestas de asistencia? Esta acción no se puede deshacer.")) return;
    try {
      const snapshot = await getDocs(rsvpByInviteRef(inviteToken));
      await Promise.all(snapshot.docs.map((entryDoc) => deleteDoc(entryDoc.ref)));
      setRsvpEntries([]);
      setAdminMessage("Se vació el registro de asistencia.");
    } catch {
      setAdminMessage("No se pudo vaciar el registro de asistencia.");
    }
  }, [inviteToken]);

  const handleClearBackground = useCallback(() => {
    applyBackgroundImage("", "", "");
  }, [applyBackgroundImage]);

  const handleSelectPreviewBackground = useCallback((backgroundImage, backgroundImageLabel, backgroundImageSource = "openfreemap") => {
    applyBackgroundImage(backgroundImage, backgroundImageLabel, backgroundImageSource);
  }, [applyBackgroundImage]);

  const handleDayChange = useCallback((value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingDay", "");
      return;
    }
    const numericDay = Number.parseInt(digits, 10);
    const clamped = Math.min(31, Math.max(1, numericDay));
    updateFormField("weddingDay", String(clamped));
  }, [updateFormField]);

  const handleHourChange = useCallback((value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingHour", "");
      return;
    }
    const numericHour = Number.parseInt(digits, 10);
    const clamped = Math.min(23, Math.max(0, numericHour));
    updateFormField("weddingHour", String(clamped));
  }, [updateFormField]);

  const handleMinuteChange = useCallback((value) => {
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
  }, [updateFormField]);

  const handleMinuteBlur = useCallback(() => {
    const digits = formData.weddingMinute.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingMinute", "");
      return;
    }
    const numericMinute = Number.parseInt(digits, 10);
    const clamped = Math.min(59, Math.max(0, numericMinute));
    updateFormField("weddingMinute", String(clamped).padStart(2, "0"));
  }, [updateFormField, formData.weddingMinute]);

  const handleYearChange = useCallback((value) => {
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
  }, [updateFormField, maxAllowedYear]);

  const handleCoordinateChange = useCallback((field, value) => {
    const normalized = value.replace(/,/g, ".").replace(/[^0-9.-]/g, "");
    updateFormField(field, normalized.slice(0, 18));
  }, [updateFormField]);

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

    if (!hiddenSet.has("details")) {
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

      const monthNum = MONTH_VALUE_TO_NUMBER[sanitized.weddingMonth];
      const enteredDate = new Date(
        Number.parseInt(sanitized.weddingYear, 10),
        monthNum - 1,
        Number.parseInt(sanitized.weddingDay, 10),
        Number.parseInt(sanitized.weddingHour, 10),
        Number.parseInt(sanitized.weddingMinute, 10),
      );
      const today = new Date();
      today.setSeconds(0, 0);
      if (enteredDate < today) {
        setSaveError("La fecha de la boda no puede ser anterior a hoy.");
        return;
      }

      const parsedYear = Number.parseInt(sanitized.weddingYear, 10);
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

    try {
      await setDoc(invitationDocRef(inviteToken), payload);
      setConfig(payload);
      setFormData(payload);
      setAdminLoginUsername(payload.adminUsername);
      setTokenLoginUsername(payload.adminUsername);
      setHasStoredConfig(true);
      setSetupToken("");
      setSetupTokenInput("");
      setSaveMessage("Configuración guardada correctamente.");
    } catch {
      setSaveError("No se pudo guardar la configuración. Si es la primera vez, prueba a entrar desde el panel privado.");
    }
  }, [hasStoredConfig, isTokenVerified, formData, maxAllowedYear, inviteToken]);

  const handleRsvpSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (isRsvpSubmitting) return;

    const guestName = rsvpForm.guestName.trim();
    if (!guestName) {
      setRsvpMessage("Escribe tu nombre para confirmar la asistencia.");
      return;
    }

    const companionsParam = rsvpForm.attendance === "yes" ? rsvpForm.companions : "0";
    const companions = Number.parseInt(companionsParam, 10);
    const companionsCount = Number.isNaN(companions) ? 0 : Math.max(0, Math.min(10, companions));

    const responsePayload = {
      guestName,
      attendance: rsvpForm.attendance,
      companions: companionsCount,
      dietaryInfo: rsvpForm.dietaryInfo.trim(),
      note: rsvpForm.note.trim(),
      inviteToken: inviteToken,
      submittedAt: serverTimestamp(),
    };

    setIsRsvpSubmitting(true);
    try {
      const createdDoc = await addDoc(RSVP_COLLECTION_REF, responsePayload);
      const responseRecord = {
        ...responsePayload,
        id: createdDoc.id,
        submittedAt: new Date().toISOString(),
      };

      setRsvpEntries((currentEntries) => [responseRecord, ...currentEntries]);

      setRsvpMessage(
        rsvpForm.attendance === "yes"
          ? `Gracias, ${guestName}. Tu asistencia quedó marcada con ${companionsCount} acompañante${companionsCount === 1 ? "" : "s"}.`
          : `Gracias, ${guestName}. Lamentamos que no puedas asistir.`,
      );
    } catch {
      setRsvpMessage("No pudimos guardar tu confirmación. Inténtalo de nuevo en unos minutos.");
    } finally {
      if (rsvpSubmitTimeoutRef.current) clearTimeout(rsvpSubmitTimeoutRef.current);
      rsvpSubmitTimeoutRef.current = setTimeout(() => {
        setIsRsvpSubmitting(false);
      }, 5000);
    }
  }, [isRsvpSubmitting, rsvpForm]);

  const handleTokenLogin = useCallback(async () => {
    setAuthMessageType("error");
    setAuthMessage("");

    const username = tokenLoginUsername.trim().toLowerCase();
    const enteredToken = normalizeTokenValue(setupTokenInput);
    if (!username || !enteredToken) {
      setAuthMessage("Escribe tu usuario y el código de acceso.");
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setAuthMessage("El usuario solo puede contener letras y números.");
      return;
    }

    if (username.length > 50) {
      setAuthMessage("El usuario no puede superar los 50 caracteres.");
      return;
    }

    setIsTokenVerifying(true);
    try {
      const tokenDocRef = doc(db, "setupTokens", enteredToken);
      await runTransaction(db, async (transaction) => {
        const tokenDoc = await transaction.get(tokenDocRef);
        if (!tokenDoc.exists || tokenDoc.data().used === true) {
          throw new Error("Token ya usado");
        }
        transaction.update(tokenDocRef, {
          used: true,
          username,
          usedAt: serverTimestamp(),
        });
      });

      await setDoc(doc(db, "sessions", username), { createdAt: serverTimestamp() });

      setTokenLoginUsername(username);
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      saveSession("setup", username);
      setAuthMessageType("success");
      setAuthMessage("Código verificado correctamente.");
    } catch {
      setAuthMessage("No se pudo verificar el código. Inténtalo de nuevo.");
    } finally {
      setIsTokenVerifying(false);
    }
  }, [tokenLoginUsername, setupTokenInput]);

  const handleGenerateToken = useCallback(async () => {
    setAuthMessageType("error");
    setAuthMessage("");

    if (confirmTokenInput !== "CONFIRMAR") {
      setAuthMessage("Escribe CONFIRMAR para generar un código nuevo.");
      return;
    }

    const username = adminLoginUsername.trim().toLowerCase();
    if (!username) {
      setAuthMessage("Escribe tu usuario primero.");
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setAuthMessage("El usuario solo puede contener letras y números.");
      return;
    }

    if (username.length > 50) {
      setAuthMessage("El usuario no puede superar los 50 caracteres.");
      return;
    }

    const configuredUsername = (config.adminUsername || "").trim().toLowerCase();
    if (configuredUsername && username !== configuredUsername) {
      setAuthMessage("Este usuario no tiene permiso para entrar aquí.");
      return;
    }

    const nextToken = generateSetupToken();
    const normalizedToken = normalizeTokenValue(nextToken);

    try {
      await setDoc(doc(db, "setupTokens", normalizedToken), {
        username,
        used: false,
        createdAt: serverTimestamp(),
      });
      setGeneratedToken(nextToken);
      setSetupTokenInput(normalizedToken);
      setAuthMessageType("success");
      setAuthMessage("Código generado. Ahora puedes entrar.");
      setConfirmTokenInput("");
    } catch {
      setAuthMessage("No se pudo generar el código. Inténtalo de nuevo.");
    }
  }, [adminLoginUsername, config, confirmTokenInput]);

  const handleAdminTokenLogin = useCallback(async () => {
    setAuthMessageType("error");
    setAuthMessage("");

    const username = adminLoginUsername.trim().toLowerCase();
    const enteredToken = normalizeTokenValue(setupTokenInput);
    if (!username || !enteredToken) {
      setAuthMessage("Escribe tu usuario y el código de acceso.");
      return;
    }

    const configuredUsername = (config.adminUsername || "").trim().toLowerCase();
    if (configuredUsername && username !== configuredUsername) {
      setAuthMessage("Usuario o código incorrecto.");
      return;
    }

    setIsTokenVerifying(true);
    try {
      const tokenDocRef = doc(db, "setupTokens", enteredToken);
      const tokenDoc = await getDoc(tokenDocRef);

      if (!tokenDoc.exists || tokenDoc.data().used === true) {
        setAuthMessage("Código no válido o ya ha sido usado.");
        setIsTokenVerifying(false);
        return;
      }

      const tokenUsername = (tokenDoc.data().username || "").trim().toLowerCase();
      if (tokenUsername && tokenUsername !== username) {
        setAuthMessage("El código no corresponde a este usuario.");
        setIsTokenVerifying(false);
        return;
      }

      await setDoc(tokenDocRef, {
        username,
        used: true,
        createdAt: tokenDoc.data().createdAt,
        usedAt: serverTimestamp(),
      });

      setTokenLoginUsername(username);
      setSetupToken("");
      setSetupTokenInput("");
      setGeneratedToken("");
      setIsTokenVerified(true);
      saveSession("admin", username);
      setAuthMessageType("success");
      setAuthMessage("Has entrado correctamente.");
    } catch {
      setAuthMessage("No se pudo verificar el código. Inténtalo de nuevo.");
    } finally {
      setIsTokenVerifying(false);
    }
  }, [adminLoginUsername, setupTokenInput, config]);

  const handleResetSetupToken = useCallback(async () => {
    if (!setupToken || confirmTokenInput !== setupToken) {
      setAuthMessage("Escribe el código de acceso actual para generar uno nuevo.");
      return;
    }

    setAuthMessage("");
    await refreshSetupToken();
    setAuthMessageType("success");
    setAuthMessage("Código nuevo generado. Cópialo del campo superior antes de guardar.");
    setConfirmTokenInput("");
  }, [refreshSetupToken, setupToken, confirmTokenInput]);

  const handleResetTokenFromAdmin = useCallback(async () => {
    if (!setupToken || confirmTokenInput !== setupToken) {
      setAdminMessage("Escribe el código de acceso actual para generar uno nuevo.");
      return;
    }

    setAdminMessage("");
    await refreshSetupToken();
    setAdminMessage("Código renovado. Esto no cambia la contraseña de la aplicación.");
    setConfirmTokenInput("");
  }, [refreshSetupToken, setupToken, confirmTokenInput]);

  useEffect(() => {
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

        const src = await buildOpenFreeMapPreviewUrl(resolvedLocation, {
          id: "default",
          label: "Mapa",
          description: "Vista del mapa en la ubicación indicada.",
        });

        if (previewRequestRef.current !== requestId) return;

        setPreviewBackgrounds(src ? [{ id: "default", src, label: "Mapa", description: "Vista del mapa en la ubicación indicada." }] : []);
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

  const formattedDate = useMemo(() => {
    const day = config.weddingDay.trim();
    const month = config.weddingMonth.trim();
    const year = config.weddingYear.trim();
    if (!day || !month || !year) return "";
    const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} de ${monthLabel} de ${year}`;
  }, [config.weddingDay, config.weddingMonth, config.weddingYear]);

  const formattedTime = useMemo(() => {
    const hour = config.weddingHour.trim();
    const minute = config.weddingMinute.trim();
    if (!hour || !minute) return "";
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }, [config.weddingHour, config.weddingMinute]);

  const calendarLink = useMemo(() => {
    const day = Number.parseInt(config.weddingDay.trim(), 10);
    const month = MONTH_VALUE_TO_NUMBER[config.weddingMonth.trim()];
    const year = Number.parseInt(config.weddingYear.trim(), 10);
    const hour = Number.parseInt(config.weddingHour.trim(), 10);
    const minute = Number.parseInt(config.weddingMinute.trim(), 10);

    if (!month || Number.isNaN(day) || Number.isNaN(year) || Number.isNaN(hour) || Number.isNaN(minute)) return null;

    const startDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (startDate.getFullYear() !== year || startDate.getMonth() !== month - 1 || startDate.getDate() !== day) return null;

    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const coupleNames = [config.firstName, config.secondName].filter(Boolean).join(" & ") || "Nuestra boda";
    const title = `Boda de ${coupleNames}`;
    const place = config.weddingPlace || "Lugar por confirmar";
    const description = [
      "Te esperamos para celebrar este momento especial.",
      formattedTime ? `Hora: ${formattedTime}` : "",
      config.weddingPlace ? `Lugar: ${config.weddingPlace}` : "",
    ].filter(Boolean).join("\n");

    return buildGoogleCalendarUrl({ title, description, place, startDate, endDate });
  }, [config, formattedTime]);

  const value = useMemo(() => ({
    config, formData, hasStoredConfig,
    isConfigLoading, configLoadError, inviteToken,
    setupToken, setupTokenInput, setSetupTokenInput,
    isTokenVerifying, isTokenVerified, tokenLoginUsername, setTokenLoginUsername,
    adminLoginUsername, setAdminLoginUsername, generatedToken,
    saveMessage, saveError,
    adminMessage,
    authMessage, authMessageType,
    rsvpEntries,
    previewBackgrounds, isPreviewLoading,
    locationMapContainerRef, locationMapError, setLocationMapError,
    locationMapLoading, setLocationMapLoading, locationMapTarget, setLocationMapTarget,
    rsvpForm, rsvpMessage, isRsvpSubmitting,
    maxAllowedYear, isAdminTokenLoggedIn,
    formattedDate, formattedTime, calendarLink,
    updateFormField, refreshSetupToken,
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
    setupToken, setupTokenInput,
    isTokenVerifying, isTokenVerified, tokenLoginUsername,
    adminLoginUsername, generatedToken,
    saveMessage, saveError,
    adminMessage,
    authMessage, authMessageType,
    rsvpEntries,
    previewBackgrounds, isPreviewLoading,
    locationMapContainerRef, locationMapError,
    locationMapLoading, locationMapTarget,
    rsvpForm, rsvpMessage, isRsvpSubmitting,
    maxAllowedYear, isAdminTokenLoggedIn,
    formattedDate, formattedTime, calendarLink,
    updateFormField, refreshSetupToken,
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

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de AppProvider");
  return context;
}
