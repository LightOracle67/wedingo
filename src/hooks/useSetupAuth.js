import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, deleteDoc, getDoc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db, invitationDocRef } from "../lib/firebase";
import { defaultConfig } from "../lib/constants";
import { normalizeConfig } from "../lib/normalize-config";
import { generateSetupToken, normalizeTokenValue } from "../lib/token-utils";
import { saveSession, getSession, renewSession, clearSession } from "../lib/sessionVars";

export function useSetupAuth(inviteToken, config, setAdminMessage, setAdminMessageType, setConfig, setHasStoredConfig) {
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

  const isAdminTokenLoggedIn = useMemo(() => isTokenVerified, [isTokenVerified]);

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
    if (isTokenVerified && tokenLoginUsername) {
      saveSession("setup", tokenLoginUsername);
    }
  }, [isTokenVerified, tokenLoginUsername]);

  const refreshSetupToken = useCallback(async () => {
    const nextToken = generateSetupToken();
    const normalizedToken = normalizeTokenValue(nextToken);
    setSetupToken(normalizedToken);
    setSetupTokenInput(normalizedToken);
    try {
      const payload = {
        used: false,
        autoGen: true,
        createdAt: serverTimestamp(),
      };
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
      const tokenDocRef = doc(db, "setupTokens", enteredToken);
      await runTransaction(db, async (transaction) => {
        const tokenDoc = await transaction.get(tokenDocRef);
        if (!tokenDoc.exists || tokenDoc.data().used === true) {
          throw new Error("Token ya usado");
        }
        transaction.update(tokenDocRef, {
          used: true,
          usedAt: serverTimestamp(),
        });
      });

      await setDoc(doc(db, "sessions", inviteToken), { createdAt: serverTimestamp() });

      const inviteSnap = await getDoc(invitationDocRef(inviteToken));
      if (!inviteSnap.exists()) {
        await setDoc(invitationDocRef(inviteToken), defaultConfig);
        const hydrated = { ...defaultConfig, ...normalizeConfig(defaultConfig) };
        setConfig(hydrated);
        setHasStoredConfig(true);
      }

      setTokenLoginUsername(inviteToken);
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      saveSession("setup", inviteToken);
      setAuthMessageType("success");
      setAuthMessage("Código verificado correctamente.");
    } catch {
      setAuthMessage("No se pudo verificar el código. Inténtalo de nuevo.");
    } finally {
      setIsTokenVerifying(false);
    }
  }, [setupTokenInput, inviteToken, setConfig, setHasStoredConfig]);

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
      await runTransaction(db, async (transaction) => {
        const tokenDoc = await transaction.get(tokenDocRef);
        if (!tokenDoc.exists || tokenDoc.data().used === true) {
          throw new Error("Código no válido o ya ha sido usado.");
        }
        const tokenUsername = (tokenDoc.data().username || "").trim().toLowerCase();
        if (tokenUsername && tokenUsername !== username) {
          throw new Error("El código no corresponde a este usuario.");
        }
        transaction.update(tokenDocRef, {
          username,
          used: true,
          usedAt: serverTimestamp(),
        });
      });

      const inviteSnap = await getDoc(invitationDocRef(inviteToken));
      if (!inviteSnap.exists()) {
        await setDoc(invitationDocRef(inviteToken), defaultConfig);
        const hydrated = { ...defaultConfig, ...normalizeConfig(defaultConfig) };
        setConfig(hydrated);
        setHasStoredConfig(true);
      }

      await setDoc(doc(db, "sessions", inviteToken), { createdAt: serverTimestamp() });

      setTokenLoginUsername(username);
      setSetupToken("");
      setSetupTokenInput("");
      setGeneratedToken("");
      setIsTokenVerified(true);
      saveSession("admin", username);
      setAuthMessageType("success");
      setAuthMessage("Has entrado correctamente.");
    } catch (err) {
      const message = err?.message;
      if (message === "Código no válido o ya ha sido usado." || message === "El código no corresponde a este usuario.") {
        setAuthMessage(message);
      } else {
        setAuthMessage("No se pudo verificar el código. Inténtalo de nuevo.");
      }
    } finally {
      setIsTokenVerifying(false);
    }
  }, [adminLoginUsername, setupTokenInput, config, inviteToken, setConfig, setHasStoredConfig]);

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
    const username = tokenLoginUsername;
    const token = inviteToken;
    setIsTokenVerified(false);
    setTokenLoginUsername("");
    setSetupToken("");
    setSetupTokenInput("");
    setGeneratedToken("");
    setAuthMessage("");
    clearSession();
    if (token) {
      try { localStorage.removeItem(`wedin_invite_cache_${token}`); } catch {}
    }
    if (username) {
      try {
        await deleteDoc(doc(db, "sessions", username));
      } catch {}
    }
    navigate("/");
  }, [tokenLoginUsername, inviteToken, navigate]);

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
      setAdminMessageType("error");
      setAdminMessage("Escribe el código de acceso actual para generar uno nuevo.");
      return;
    }
    setAdminMessage("");
    await refreshSetupToken();
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
