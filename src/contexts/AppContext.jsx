import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, INVITATION_DOC_REF, RSVP_COLLECTION_REF } from "../lib/firebase";
import { ALLOWED_UPLOAD_TYPES, defaultConfig, MAX_UPLOAD_SIZE_BYTES, MONTH_OPTIONS, MONTH_VALUE_TO_NUMBER, THEME_VALUES } from "../lib/constants";
import {
  buildGoogleCalendarUrl,
  compressImage,
  generateSetupToken,
  getValidCoordinates,
  normalizeConfig,
  normalizeTokenValue,
  resolveLocationTarget,
  buildOpenFreeMapPreviewUrl,
} from "../lib/utils";


const AppContext = createContext(null);

export function AppProvider({ children }) {
  const maxAllowedYear = new Date().getFullYear() + 4;

  const [config, setConfig] = useState(defaultConfig);
  const [formData, setFormData] = useState(defaultConfig);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configLoadError, setConfigLoadError] = useState("");

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
    note: "",
  });
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const rsvpSubmitTimeoutRef = useRef(null);

  const previewRequestRef = useRef(0);

  const isAdminTokenLoggedIn = isTokenVerified && tokenLoginUsername && (
    config.adminUsername === tokenLoginUsername
  );

  useEffect(() => {
    const hydrateConfig = async () => {
      setConfigLoadError("");
      try {
        const snapshot = await getDoc(INVITATION_DOC_REF);
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
  }, []);

  useEffect(() => {
    const hydrateRsvp = async () => {
      try {
        const snapshot = await getDocs(RSVP_COLLECTION_REF);
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
  }, []);

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

  const updateFormField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const applyBackgroundImage = (backgroundImage, backgroundImageLabel, backgroundImageSource) => {
    setFormData((current) => ({
      ...current,
      backgroundImage,
      backgroundImageLabel,
      backgroundImageSource,
    }));
  };

  const refreshSetupToken = async () => {
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
  };

  const handleSaveSetup = async (event) => {
    event.preventDefault();
    setSaveError("");
    setSaveMessage("");

    if (!hasStoredConfig && !isTokenVerified) {
      setSaveError("Verifica el código de acceso antes de guardar.");
      return;
    }

    const sanitized = normalizeConfig(formData);

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

    if (!THEME_VALUES.has(sanitized.theme)) {
      setSaveError("Selecciona un tema válido.");
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

    const parsedYear = Number.parseInt(sanitized.weddingYear, 10);
    if (Number.isNaN(parsedYear) || parsedYear > maxAllowedYear) {
      setSaveError(`El año no puede ser mayor a ${maxAllowedYear}.`);
      return;
    }

    const payload = { ...defaultConfig, ...sanitized };

    try {
      await setDoc(INVITATION_DOC_REF, payload);
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
  };

  const handleRsvpSubmit = async (event) => {
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

    if (rsvpForm.attendance === "yes" && companionsCount > 10) {
      setRsvpMessage("El número de acompañantes no puede ser mayor a 10.");
      return;
    }
    const responsePayload = {
      guestName,
      attendance: rsvpForm.attendance,
      companions: companionsCount,
      note: rsvpForm.note.trim(),
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
  };

  const updateRsvpField = (field, value) => {
    if (field === "attendance" && value === "no") {
      setRsvpForm((current) => ({ ...current, attendance: value, companions: "0" }));
      return;
    }
    setRsvpForm((current) => ({ ...current, [field]: value }));
  };

  const handleTokenLogin = async () => {
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
      const tokenDoc = await getDoc(tokenDocRef);

      if (!tokenDoc.exists || tokenDoc.data().used === true) {
        setAuthMessage("Código de acceso no válido o ya ha sido usado.");
        setIsTokenVerifying(false);
        return;
      }

      await setDoc(tokenDocRef, {
        used: true,
        username,
        createdAt: tokenDoc.data().createdAt,
        usedAt: serverTimestamp(),
      });

      setTokenLoginUsername(username);
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      setAuthMessageType("success");
      setAuthMessage("Código verificado correctamente.");
    } catch {
      setAuthMessage("No se pudo verificar el código. Inténtalo de nuevo.");
    } finally {
      setIsTokenVerifying(false);
    }
  };

  const handleGenerateToken = async () => {
    setAuthMessageType("error");
    setAuthMessage("");
    setGeneratedToken("");

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
    } catch {
      setAuthMessage("No se pudo generar el código. Inténtalo de nuevo.");
    }
  };

  const handleAdminTokenLogin = async () => {
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
      setAuthMessageType("success");
      setAuthMessage("Has entrado correctamente.");
    } catch {
      setAuthMessage("No se pudo verificar el código. Inténtalo de nuevo.");
    } finally {
      setIsTokenVerifying(false);
    }
  };

  const handleAdminLogout = () => {
    setIsTokenVerified(false);
    setTokenLoginUsername("");
    setSetupToken("");
    setSetupTokenInput("");
    setGeneratedToken("");
    setAuthMessage("");
  };

  const handleResetSetupToken = async () => {
    const shouldResetToken = window.confirm("¿Quieres generar un código nuevo? El actual dejará de ser válido.");
    if (!shouldResetToken) return;

    setAuthMessage("");
    await refreshSetupToken();
    setAuthMessageType("success");
    setAuthMessage("Código nuevo generado. Cópialo del campo superior antes de guardar.");
  };

  const handleResetTokenFromAdmin = async () => {
    const shouldResetToken = window.confirm("¿Quieres generar un código nuevo? El actual dejará de ser válido.");
    if (!shouldResetToken) return;

    setAdminMessage("");
    await refreshSetupToken();
    setAdminMessage("Código renovado. Esto no cambia la contraseña de la aplicación.");
  };

  const handleClearRsvpEntries = async () => {
    if (!window.confirm("¿Borrar todas las respuestas de asistencia? Esta acción no se puede deshacer.")) return;
    try {
      const snapshot = await getDocs(RSVP_COLLECTION_REF);
      await Promise.all(snapshot.docs.map((entryDoc) => deleteDoc(entryDoc.ref)));
      setRsvpEntries([]);
      setAdminMessage("Se vació el registro de asistencia.");
    } catch {
      setAdminMessage("No se pudo vaciar el registro de asistencia.");
    }
  };

  const handleBackgroundUpload = (event) => {
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
  };

  const handleClearBackground = () => {
    applyBackgroundImage("", "", "");
  };

  const handleSelectPreviewBackground = (backgroundImage, backgroundImageLabel, backgroundImageSource = "openfreemap") => {
    applyBackgroundImage(backgroundImage, backgroundImageLabel, backgroundImageSource);
  };

  const handleDayChange = (value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingDay", "");
      return;
    }
    const numericDay = Number.parseInt(digits, 10);
    const clamped = Math.min(31, Math.max(1, numericDay));
    updateFormField("weddingDay", String(clamped));
  };

  const handleHourChange = (value) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingHour", "");
      return;
    }
    const numericHour = Number.parseInt(digits, 10);
    const clamped = Math.min(23, Math.max(0, numericHour));
    updateFormField("weddingHour", String(clamped));
  };

  const handleMinuteChange = (value) => {
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
  };

  const handleMinuteBlur = () => {
    const digits = formData.weddingMinute.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      updateFormField("weddingMinute", "");
      return;
    }
    const numericMinute = Number.parseInt(digits, 10);
    const clamped = Math.min(59, Math.max(0, numericMinute));
    updateFormField("weddingMinute", String(clamped).padStart(2, "0"));
  };

  const handleYearChange = (value) => {
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
  };

  const handleCoordinateChange = (field, value) => {
    const normalized = value.replace(/,/g, ".").replace(/[^0-9.-]/g, "");
    updateFormField(field, normalized.slice(0, 18));
  };

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
    isConfigLoading, configLoadError,
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
  }), [
    config, formData, hasStoredConfig,
    isConfigLoading, configLoadError,
    setupToken, setupTokenInput, setSetupTokenInput,
    isTokenVerifying, isTokenVerified, tokenLoginUsername,
    adminLoginUsername, generatedToken,
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
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de AppProvider");
  return context;
}
