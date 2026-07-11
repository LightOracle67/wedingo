/**
 * useSetupAuth.js
 * ─────────────────────────────────────────────────────────────
 * Hook de autenticación para el panel de configuración y admin.
 *
 * Gestiona:
 * - Generación y verificación de tokens de acceso únicos.
 * - Inicio de sesión con token (setup) o usuario + token (admin).
 * - Persistencia de sesión en sessionStorage + Firestore.
 * - Renovación automática de sesión cada 60 segundos.
 * - Cierre de sesión con limpieza de caché y estado.
 * - Restauración de sesión desde sessionStorage al recargar.
 *
 * @module useSetupAuth
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db, invitationDocRef } from "../lib/firebase";
import { defaultConfig } from "../lib/constants";
import { generateSetupToken, normalizeTokenValue } from "../lib/token-utils";
import { saveSession, getSession, renewSession, clearSession, firestoreSessionExpiry } from "../lib/sessionVars";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";

/**
 * Hook de autenticación del panel de configuración.
 *
 * @param {string} inviteToken - Token de la invitación.
 * @param {object} config - Configuración actual de la boda.
 * @param {function} setAdminMessage - Setter para mensajes del panel admin.
 * @param {function} setAdminMessageType - Setter para tipo de mensaje.
 * @param {function} setHasStoredConfig - Setter para indicar si hay config guardada.
 * @returns {object} Estado y handlers de autenticación.
 */
export function useSetupAuth(inviteToken, config, setAdminMessage, setAdminMessageType, setHasStoredConfig) {
  const navigate = useNavigate();
  // ─── Estados de autenticación ──────────────────────────
  const [setupToken, setSetupToken] = useState("");
  const [setupTokenInput, setSetupTokenInput] = useState("");
  const [isTokenVerifying, setIsTokenVerifying] = useState(false);
  const [isTokenVerified, setIsTokenVerified] = useState(false);
  const [tokenLoginUsername, setTokenLoginUsername] = useState("");
  const [adminLoginUsername, setAdminLoginUsername] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authMessageType, setAuthMessageType] = useState("error");
  const [confirmTokenInput, setConfirmTokenInput] = useState("");

  /** Intervalo de renovación de sesión. */
  const renewRef = useRef(null);
  /** Tipo de sesión actual: "setup" o "admin". */
  const sessionTypeRef = useRef("");

  /** Derivado: el usuario está autenticado si el token fue verificado. */
  const isAdminTokenLoggedIn = useMemo(() => isTokenVerified, [isTokenVerified]);

  /**
   * Al montar el hook, intenta restaurar la sesión desde sessionStorage.
   * Si hay una sesión guardada, la reactiva sin pedir token.
   * Verifica que la sesión siga activa en Firestore.
   */
  useEffect(() => {
    const session = getSession();
    if (!session || (session.type !== "setup" && session.type !== "admin")) return;
    if (!inviteToken) return;

    // Verifica primero en Firestore que la sesión siga activa antes de restaurar
    getDoc(invitationDocRef(inviteToken)).then(snap => {
      if (snap.exists() && snap.data().activeSession) {
        setTokenLoginUsername(session.identifier);
        sessionTypeRef.current = session.type;
        setSetupToken("");
        setSetupTokenInput("");
        setGeneratedToken("");
        setIsTokenVerified(true);
      } else {
        clearSession();
      }
    }).catch(() => {
      clearSession();
    });
  }, [inviteToken]);

  /**
   * Renueva la sesión periódicamente cada 60 segundos mientras esté activa.
   * Esto actualiza el timestamp en sessionStorage para mantener la sesión viva.
   */
  useEffect(() => {
    if (isTokenVerified) {
      renewSession();
      renewRef.current = setInterval(() => renewSession(), 60_000);
    } else {
      if (renewRef.current) clearInterval(renewRef.current);
    }
    return () => { if (renewRef.current) clearInterval(renewRef.current); };
  }, [isTokenVerified]);

  /**
   * Persiste la sesión en sessionStorage cuando cambia el estado de autenticación.
   */
  useEffect(() => {
    if (isTokenVerified && tokenLoginUsername && sessionTypeRef.current) {
      saveSession(sessionTypeRef.current, tokenLoginUsername);
    }
  }, [isTokenVerified, tokenLoginUsername]);

  /**
   * Genera un nuevo token de acceso para el setup.
   * Si ya existe un token en sessionStorage para esta invitación, lo reutiliza.
   * Si se pasa un oldToken, fuerza la regeneración.
   *
   * @param {string} [oldToken] - Token anterior a reemplazar.
   * @returns {Promise<string>} El nuevo token generado.
   */
  const refreshSetupToken = useCallback(async (oldToken) => {
    const storageKey = `wedin_setup_token_${inviteToken || ""}`;

    // Intenta recuperar el token existente de sessionStorage
    if (!oldToken && inviteToken) {
      try {
        const saved = safeGetItem(storageKey, sessionStorage);
        if (saved) {
          const snap = await getDoc(doc(db, "setupTokens", saved));
          if (snap.exists()) {
            setSetupToken(saved);
            setSetupTokenInput(saved);
            return saved;
          }
        }
      } catch {}
    }

    // Genera un nuevo token y lo guarda en Firestore + sessionStorage
    const nextToken = generateSetupToken();
    const normalizedToken = normalizeTokenValue(nextToken);
    setSetupToken(normalizedToken);
    setSetupTokenInput(normalizedToken);
    if (inviteToken) safeSetItem(storageKey, normalizedToken, sessionStorage);
    try {
      const payload = { used: false, autoGen: true, createdAt: serverTimestamp() };
      if (inviteToken) payload.inviteToken = inviteToken;
      await setDoc(doc(db, "setupTokens", normalizedToken), payload);
    } catch {}
    return nextToken;
  }, [inviteToken]);

  /**
   * Intenta activar la sesión usando un token de setup.
   * Retorna el username del token (si existe) o lanza error.
   */
  const activateSessionWithToken = useCallback(async (enteredToken, validateToken) => {
    const inviteSnapActive = await getDoc(invitationDocRef(inviteToken));
    if (inviteSnapActive.exists() && inviteSnapActive.data().activeSession) {
      setIsTokenVerifying(false);
      if (!window.confirm("Ya hay una sesión activa para esta invitación. ¿Quieres iniciar sesión de todos modos? La sesión anterior se cerrará.")) {
        return null;
      }
      setIsTokenVerifying(true);
    }

    const tokenDocRef = doc(db, "setupTokens", enteredToken);
    const inviteRef = invitationDocRef(inviteToken);
    let tokenUsername = "";

    await runTransaction(db, async (transaction) => {
      const tokenDoc = await transaction.get(tokenDocRef);
      if (!tokenDoc.exists) throw new Error("Token no válido");
      tokenUsername = (tokenDoc.data().username || "").trim().toLowerCase();
      if (validateToken) validateToken(tokenDoc, tokenUsername);

      const inviteSnap = await transaction.get(inviteRef);
      if (!inviteSnap.exists()) {
        transaction.set(inviteRef, { ...defaultConfig, activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry() });
      } else {
        transaction.update(inviteRef, { activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry() });
      }
    });
    return tokenUsername;
  }, [inviteToken]);

  /**
   * Inicia sesión con token de setup (sin usuario).
   * Verifica el token en Firestore y activa la sesión.
   * Si ya hay una sesión activa, pide confirmación para sobrescribir.
   */
  const handleTokenLogin = useCallback(async () => {
    setAuthMessageType("error");
    setAuthMessage("");

    const enteredToken = normalizeTokenValue(setupTokenInput);
    if (!enteredToken) {
      setAuthMessage("Introduce el código de acceso.");
      return;
    }

    setIsTokenVerifying(true);
    try {
      const tokenUsername = await activateSessionWithToken(enteredToken);
      if (tokenUsername === null) return; // Usuario canceló

      const displayName = tokenUsername || inviteToken;
      setTokenLoginUsername(displayName);
      sessionTypeRef.current = tokenUsername ? "admin" : "setup";
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      setHasStoredConfig(true);
      saveSession(sessionTypeRef.current, displayName);
      setAuthMessageType("success");
      setAuthMessage("Código verificado correctamente.");
    } catch {
      setAuthMessage("No se pudo verificar el código. Inténtalo de nuevo.");
    } finally {
      setIsTokenVerifying(false);
    }
  }, [activateSessionWithToken, setupTokenInput, inviteToken, setHasStoredConfig]);

  /**
   * Inicia sesión como administrador (requiere usuario + token).
   * Verifica que el usuario coincida con el configurado y que el token sea válido.
   */
  const handleAdminTokenLogin = useCallback(async () => {
    setAuthMessageType("error");
    setAuthMessage("");

    const username = adminLoginUsername.trim().toLowerCase();
    const enteredToken = normalizeTokenValue(setupTokenInput);
    if (!username || !enteredToken) {
      setAuthMessage("Escribe tu usuario y el código de acceso.");
      return;
    }

    // Verifica que el usuario coincida con el configurado en la invitación
    const configuredUsername = (config.adminUsername || "").trim().toLowerCase();
    if (configuredUsername && username !== configuredUsername) {
      setAuthMessage("Usuario o código incorrecto.");
      return;
    }

    setIsTokenVerifying(true);
    try {
      const tokenUsername = await activateSessionWithToken(enteredToken, (tokenDoc, tu) => {
        if (tu && tu !== username) {
          throw new Error("El código no corresponde a este usuario.");
        }
      });
      if (tokenUsername === null) return;

      setTokenLoginUsername(username);
      sessionTypeRef.current = "admin";
      setSetupToken("");
      setSetupTokenInput("");
      setGeneratedToken("");
      setIsTokenVerified(true);
      setHasStoredConfig(true);
      saveSession("admin", username);
      setAuthMessageType("success");
      setAuthMessage("Has entrado correctamente.");
    } catch (err) {
      const message = err?.message;
      if (message === "El código no corresponde a este usuario.") {
        setAuthMessage(message);
      } else {
        setAuthMessage("No se pudo verificar el código. Inténtalo de nuevo.");
      }
    } finally {
      setIsTokenVerifying(false);
    }
  }, [activateSessionWithToken, adminLoginUsername, setupTokenInput, config, inviteToken, setHasStoredConfig]);

  /**
   * Genera un nuevo token de acceso vinculado a un usuario administrador.
   * Requiere escribir "CONFIRMAR" y que el usuario esté registrado.
   */
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

  /**
   * Cierra la sesión actual.
   * Limpia el estado local, la sesión en Firestore y la caché.
   * Redirige a la página principal.
   */
  const handleAdminLogout = useCallback(async () => {
    const token = inviteToken;
    setIsTokenVerified(false);
    setTokenLoginUsername("");
    sessionTypeRef.current = "";
    setSetupToken("");
    setSetupTokenInput("");
    setGeneratedToken("");
    setAuthMessage("");
    clearSession();
    if (token) {
      try {
        safeRemoveItem(`wedin_invite_cache_${token}`);
        await updateDoc(invitationDocRef(token), { activeSession: null, sessionExpiresAt: null });
      } catch {}
    }
    navigate("/");
  }, [inviteToken, navigate]);

  /**
   * Regenera el token de setup desde la página de configuración.
   * Requiere confirmar el token actual.
   */
  const handleResetSetupToken = useCallback(async () => {
    const storageKey = `wedin_setup_token_${inviteToken || ""}`;
    const storedToken = safeGetItem(storageKey, sessionStorage) || "";
    const currentToken = setupToken || storedToken;
    if (!currentToken || confirmTokenInput !== currentToken) {
      setAuthMessage("Escribe el código de acceso actual para generar uno nuevo.");
      return;
    }
    setAuthMessage("");
    await refreshSetupToken(currentToken);
    setAuthMessageType("success");
    setAuthMessage("Código nuevo generado. Cópialo del campo superior antes de guardar.");
    setConfirmTokenInput("");
  }, [refreshSetupToken, setupToken, confirmTokenInput, inviteToken]);

  /**
   * Regenera el token desde el panel de administración.
   * Similar a handleResetSetupToken pero con mensajes dirigidos al admin.
   */
  const handleResetTokenFromAdmin = useCallback(async () => {
    const storageKey = `wedin_setup_token_${inviteToken || ""}`;
    const storedToken = safeGetItem(storageKey, sessionStorage) || "";
    const currentToken = setupToken || storedToken;
    if (!currentToken || confirmTokenInput !== currentToken) {
      setAdminMessageType("error");
      setAdminMessage("Escribe el código de acceso actual para generar uno nuevo.");
      return;
    }
    setAdminMessage("");
    await refreshSetupToken(currentToken);
    setAdminMessageType("success");
    setAdminMessage("Código renovado. Esto no cambia la contraseña de la aplicación.");
    setConfirmTokenInput("");
  }, [refreshSetupToken, setupToken, confirmTokenInput, setAdminMessage, setAdminMessageType, inviteToken]);

  return {
    setupToken, setSetupToken,
    setupTokenInput, setSetupTokenInput,
    isTokenVerifying, isTokenVerified, setIsTokenVerified,
    tokenLoginUsername, setTokenLoginUsername,
    adminLoginUsername, setAdminLoginUsername,
    generatedToken, setGeneratedToken,
    authMessage, setAuthMessage,
    authMessageType, setAuthMessageType,
    confirmTokenInput, setConfirmTokenInput,
    isAdminTokenLoggedIn,
    refreshSetupToken,
    handleTokenLogin, handleAdminTokenLogin,
    handleGenerateToken, handleAdminLogout,
    handleResetSetupToken, handleResetTokenFromAdmin,
  };
}
