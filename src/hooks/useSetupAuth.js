import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, deleteDoc, getDoc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db, invitationDocRef } from "../lib/firebase";
import { defaultConfig } from "../lib/constants";
import { generateSetupToken, normalizeTokenValue } from "../lib/token-utils";
import { saveSession, getSession, renewSession, clearSession } from "../lib/sessionVars";

export function useSetupAuth(inviteToken, config, setAdminMessage, setAdminMessageType, setHasStoredConfig) {
  const navigate = useNavigate();
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

  const renewRef = useRef(null);
  const sessionTypeRef = useRef("");

  const isAdminTokenLoggedIn = useMemo(() => isTokenVerified, [isTokenVerified]);

  useEffect(() => {
    const session = getSession();
    if (session && (session.type === "setup" || session.type === "admin")) {
      setTokenLoginUsername(session.identifier);
      sessionTypeRef.current = session.type;
      setSetupToken("");
      setSetupTokenInput("");
      setGeneratedToken("");
      setIsTokenVerified(true);

      if (inviteToken) {
        getDoc(doc(db, "sessions", inviteToken)).then(snap => {
          if (!snap.exists()) {
            clearSession();
            setIsTokenVerified(false);
            setTokenLoginUsername("");
            sessionTypeRef.current = "";
          }
        }).catch(() => {});
      }
    }
  }, [inviteToken]);

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
    if (isTokenVerified && tokenLoginUsername && sessionTypeRef.current) {
      saveSession(sessionTypeRef.current, tokenLoginUsername);
    }
  }, [isTokenVerified, tokenLoginUsername]);

  const refreshSetupToken = useCallback(async (oldToken) => {
    const storageKey = `wedin_setup_token_${inviteToken || ""}`;

    if (!oldToken && inviteToken) {
      try {
        const saved = sessionStorage.getItem(storageKey);
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

    const nextToken = generateSetupToken();
    const normalizedToken = normalizeTokenValue(nextToken);
    setSetupToken(normalizedToken);
    setSetupTokenInput(normalizedToken);
    if (inviteToken) sessionStorage.setItem(storageKey, normalizedToken);
    try {
      const payload = { used: false, autoGen: true, createdAt: serverTimestamp() };
      if (inviteToken) payload.inviteToken = inviteToken;
      await setDoc(doc(db, "setupTokens", normalizedToken), payload);
    } catch {}
    return nextToken;
  }, [inviteToken]);

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
      const sessionSnap = await getDoc(doc(db, "sessions", inviteToken));
      if (sessionSnap.exists()) {
        setIsTokenVerifying(false);
        if (!window.confirm("Ya hay una sesión activa para esta invitación. ¿Quieres iniciar sesión de todos modos? La sesión anterior se cerrará.")) {
          return;
        }
        setIsTokenVerifying(true);
      }

      const tokenDocRef = doc(db, "setupTokens", enteredToken);
      const sessionRef = doc(db, "sessions", inviteToken);
      const inviteRef = invitationDocRef(inviteToken);
      let tokenUsername = "";

      await runTransaction(db, async (transaction) => {
        const tokenDoc = await transaction.get(tokenDocRef);
        if (!tokenDoc.exists) {
          throw new Error("Token no válido");
        }
        tokenUsername = (tokenDoc.data().username || "").trim().toLowerCase();

        const inviteSnap = await transaction.get(inviteRef);
        if (!inviteSnap.exists()) {
          transaction.set(inviteRef, defaultConfig);
        }

        transaction.set(sessionRef, { createdAt: serverTimestamp() });
      });

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
  }, [setupTokenInput, inviteToken, setHasStoredConfig]);

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
      const sessionSnap = await getDoc(doc(db, "sessions", inviteToken));
      if (sessionSnap.exists()) {
        setIsTokenVerifying(false);
        if (!window.confirm("Ya hay una sesión activa para esta invitación. ¿Quieres iniciar sesión de todos modos? La sesión anterior se cerrará.")) {
          return;
        }
        setIsTokenVerifying(true);
      }

      const tokenDocRef = doc(db, "setupTokens", enteredToken);
      await runTransaction(db, async (transaction) => {
        const tokenDoc = await transaction.get(tokenDocRef);
        if (!tokenDoc.exists) {
          throw new Error("Código no válido.");
        }
        const tokenUsername = (tokenDoc.data().username || "").trim().toLowerCase();
        if (tokenUsername && tokenUsername !== username) {
          throw new Error("El código no corresponde a este usuario.");
        }

        const inviteSnap = await transaction.get(invitationDocRef(inviteToken));
        if (!inviteSnap.exists()) {
          transaction.set(invitationDocRef(inviteToken), defaultConfig);
        }

        transaction.set(doc(db, "sessions", inviteToken), { createdAt: serverTimestamp() });
      });

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
      if (message === "Código no válido." || message === "El código no corresponde a este usuario.") {
        setAuthMessage(message);
      } else {
        setAuthMessage("No se pudo verificar el código. Inténtalo de nuevo.");
      }
    } finally {
      setIsTokenVerifying(false);
    }
  }, [adminLoginUsername, setupTokenInput, config, inviteToken, setHasStoredConfig]);

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
        localStorage.removeItem(`wedin_invite_cache_${token}`);
        await deleteDoc(doc(db, "sessions", token));
      } catch {}
    }
    navigate("/");
  }, [inviteToken, navigate]);

  const handleResetSetupToken = useCallback(async () => {
    if (!setupToken || confirmTokenInput !== setupToken) {
      setAuthMessage("Escribe el código de acceso actual para generar uno nuevo.");
      return;
    }
    setAuthMessage("");
    await refreshSetupToken(setupToken);
    setAuthMessageType("success");
    setAuthMessage("Código nuevo generado. Cópialo del campo superior antes de guardar.");
    setConfirmTokenInput("");
  }, [refreshSetupToken, setupToken, confirmTokenInput]);

  const handleResetTokenFromAdmin = useCallback(async () => {
    if (!setupToken || confirmTokenInput !== setupToken) {
      setAdminMessageType("error");
      setAdminMessage("Escribe el código de acceso actual para generar uno nuevo.");
      return;
    }
    setAdminMessage("");
    await refreshSetupToken(setupToken);
    setAdminMessageType("success");
    setAdminMessage("Código renovado. Esto no cambia la contraseña de la aplicación.");
    setConfirmTokenInput("");
  }, [refreshSetupToken, setupToken, confirmTokenInput, setAdminMessage, setAdminMessageType]);

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
