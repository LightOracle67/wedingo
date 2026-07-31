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
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { getDoc, runTransaction, serverTimestamp, setDoc, updateDoc, type DocumentData } from "firebase/firestore";
import { db, invitationDocRef } from "../lib/firebase";
import { defaultConfig } from "../lib/constants";
import { generateSetupToken, normalizeTokenValue } from "../lib/token-utils";
import { saveSession, getSession, renewSession, clearSession, firestoreSessionExpiry } from "../lib/sessionVars";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";
import type { InvitationConfig } from "../types";

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
export function useSetupAuth(
  inviteToken: string,
  config: InvitationConfig,
  setAdminMessage: (msg: string) => void,
  setAdminMessageType: (type: string) => void,
  setHasStoredConfig: (v: boolean) => void,
) {
  console.log("[app]", "[useSetupAuth]", "hook mount", { inviteToken });
  const { t } = useTranslation();
  const navigate = useNavigate();
  // ─── Estados de autenticación ──────────────────────────
  const [setupToken, setSetupToken] = useState("");
  const [setupTokenInput, setSetupTokenInput] = useState("");
  const [isTokenVerifying, setIsTokenVerifying] = useState(false);
  const [isTokenVerified, setIsTokenVerified] = useState(false);
  const [tokenLoginUsername, setTokenLoginUsername] = useState("");
  const [adminLoginUsername, setAdminLoginUsername] = useState("");

  const [authMessage, setAuthMessage] = useState("");
  const [authMessageType, setAuthMessageType] = useState("error");
  const [confirmTokenInput, setConfirmTokenInput] = useState("");
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  /** Intervalo de renovación de sesión. */
  const renewRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Tipo de sesión actual: "setup" o "admin". */
  const sessionTypeRef = useRef("");
  /** Previene doble clic en reseteo de token. */
  const resettingRef = useRef(false);

  /** Derivado: el usuario está autenticado si el token fue verificado. */
  const isAdminTokenLoggedIn = useMemo(() => isTokenVerified, [isTokenVerified]);

  /**
   * Al montar el hook, intenta restaurar la sesión desde sessionStorage.
   * Si hay una sesión guardada, la reactiva sin pedir token.
   * Verifica que la sesión siga activa en Firestore.
   */
  useEffect(() => {
    console.log("[app]", "[useSetupAuth]", "session restoration effect", { inviteToken });
    const session = getSession();
    console.log("[session-restore] getSession:", session, "inviteToken:", inviteToken);
    if (!session || (session.type !== "setup" && session.type !== "admin")) {
      console.log("[app]", "[useSetupAuth]", "no valid session in localStorage", { session });
      console.log("[session-restore] no valid session in localStorage");
      return;
    }
    if (!inviteToken) {
      console.log("[app]", "[useSetupAuth]", "inviteToken empty, waiting...", {});
      console.log("[session-restore] inviteToken empty, waiting...");
      return;
    }

    console.log("[app]", "[useSetupAuth]", "session restoration start", { sessionType: session.type, identifier: session.identifier });
    setIsRestoringSession(true);

    getDoc(invitationDocRef(inviteToken)).then(async (snap) => {
      const data = snap.data();
      const sessionExpiresAt = data?.sessionExpiresAt?.toDate?.() ?? data?.sessionExpiresAt;
      const isValid = snap.exists()
        && data?.activeSession
        && sessionExpiresAt
        && new Date(sessionExpiresAt).getTime() > Date.now();
      console.log("[app]", "[useSetupAuth]", "session check result", { isValid, exists: snap.exists(), hasActiveSession: !!data?.activeSession });
      console.log("[session-restore] Firestore doc:", { exists: snap.exists(), activeSession: data?.activeSession, sessionExpiresAt, isValid });
      if (isValid) {
        setTokenLoginUsername(session.identifier);
        sessionTypeRef.current = session.type;
        setSetupToken("");
        setSetupTokenInput("");
        setIsTokenVerified(true);
        console.log("[app]", "[useSetupAuth]", "session restored successfully", { identifier: session.identifier, type: session.type });
        console.log("[session-restore] ✅ session restored for", session.identifier, "type:", session.type);
      } else if (snap.exists()) {
        console.log("[app]", "[useSetupAuth]", "Firestore session invalid, attempting repair", {});
        console.log("[session-restore] ⚠️ Firestore session invalid, attempting repair...");
        try {
          await updateDoc(invitationDocRef(inviteToken), {
            activeSession: serverTimestamp(),
            sessionExpiresAt: firestoreSessionExpiry(),
          });
          setTokenLoginUsername(session.identifier);
          sessionTypeRef.current = session.type;
          setSetupToken("");
          setSetupTokenInput("");
          setIsTokenVerified(true);
          console.log("[app]", "[useSetupAuth]", "session repaired successfully", { identifier: session.identifier });
          console.log("[session-restore] ✅ session repaired for", session.identifier);
        } catch (repairErr) {
          console.error("[app]", "[useSetupAuth]", "session repair failed", { error: repairErr });
          console.log("[session-restore] ❌ repair failed:", repairErr);
          clearSession();
        }
      } else {
        clearSession();
        console.log("[app]", "[useSetupAuth]", "Firestore doc missing, cleared session", {});
        console.log("[session-restore] ❌ Firestore session invalid, cleared localStorage");
      }
      console.log("[app]", "[useSetupAuth]", "session restoration end", {});
      setIsRestoringSession(false);
    }).catch((err) => {
      console.error("[app]", "[useSetupAuth]", "session restoration Firestore error", { error: err });
      console.log("[session-restore] ❌ Firestore error:", err);
      setIsRestoringSession(false);
    });
  }, [inviteToken]);

  /**
   * Renueva la sesión periódicamente cada 60 segundos mientras esté activa.
   * Esto actualiza el timestamp en sessionStorage para mantener la sesión viva.
   */
  useEffect(() => {
    console.log("[app]", "[useSetupAuth]", "session renewal effect", { isTokenVerified });
    if (isTokenVerified) {
      const doRenew = async () => {
        console.log("[app]", "[useSetupAuth]", "session renewal tick", {});
        renewSession();
        try {
          await updateDoc(invitationDocRef(inviteToken), {
            activeSession: serverTimestamp(),
            sessionExpiresAt: firestoreSessionExpiry(),
          });
          console.log("[app]", "[useSetupAuth]", "session renewal success", {});
        } catch (err) {
          console.error("[app]", "[useSetupAuth]", "session renewal error", { error: err });
          if (setAdminMessage && setAdminMessageType) {
            setAdminMessageType("error");
            setAdminMessage(t("auth.sessionUpdateFailed"));
          }
        }
      };
      doRenew();
      renewRef.current = setInterval(() => doRenew(), 60_000);
      console.log("[app]", "[useSetupAuth]", "session renewal interval started", {});
    } else {
      if (renewRef.current) { console.log("[app]", "[useSetupAuth]", "clearing renewal interval", {}); clearInterval(renewRef.current); }
    }
    return () => { if (renewRef.current) { console.log("[app]", "[useSetupAuth]", "renewal cleanup", {}); clearInterval(renewRef.current); } };
  }, [isTokenVerified, inviteToken, setAdminMessage, setAdminMessageType, t]);

  /**
   * Persiste la sesión en sessionStorage cuando cambia el estado de autenticación.
   */
  useEffect(() => {
    console.log("[app]", "[useSetupAuth]", "session persistence effect", { isTokenVerified, tokenLoginUsername, sessionType: sessionTypeRef.current });
    if (isTokenVerified && tokenLoginUsername && sessionTypeRef.current) {
      console.log("[app]", "[useSetupAuth]", "saving session", { type: sessionTypeRef.current, username: tokenLoginUsername });
      saveSession(sessionTypeRef.current, tokenLoginUsername);
    }
  }, [isTokenVerified, tokenLoginUsername]);

  /**
   * Recupera o genera un token de acceso para el setup.
   *
   * Orden de comprobación para evitar duplicados:
   * 1. Si se pasa oldToken, fuerza la regeneración (lo borra y crea uno nuevo).
   * 2. Busca en sessionStorage un token guardado para esta invitación.
   * 3. Busca en el documento de la invitación el campo _activeSetupToken.
   * 4. Si nada funciona, genera uno nuevo y lo persiste en la invitación.
   *
   * @param {string} [oldToken] - Token anterior a reemplazar (opcional).
   * @returns {Promise<string>} El token activo.
   */
  const refreshSetupToken = useCallback(async (_oldToken?: string) => {
    console.log("[app]", "[useSetupAuth]", "refreshSetupToken start", { inviteToken, hasOldToken: !!_oldToken });
    const storageKey = `wedin_setup_token_${inviteToken || ""}`;

    if (inviteToken) {
      const saved = safeGetItem(storageKey, sessionStorage);
      if (saved) {
        console.log("[app]", "[useSetupAuth]", "token restored from sessionStorage", {});
        setSetupToken(saved);
        setSetupTokenInput(saved);
        return saved;
      }
      console.log("[app]", "[useSetupAuth]", "no token in sessionStorage, checking Firestore", {});

      try {
        const inviteSnap = await getDoc(invitationDocRef(inviteToken));
        if (inviteSnap.exists()) {
          const activeToken = inviteSnap.data()._activeSetupToken;
          if (activeToken) {
            console.log("[app]", "[useSetupAuth]", "token found in Firestore", {});
            setSetupToken(activeToken);
            setSetupTokenInput(activeToken);
            safeSetItem(storageKey, activeToken, sessionStorage);
            return activeToken;
          } else {
            console.log("[app]", "[useSetupAuth]", "no _activeSetupToken in Firestore", {});
          }
        } else {
          console.log("[app]", "[useSetupAuth]", "Firestore doc not found", {});
        }
      } catch (err) {
        console.error("[app]", "[useSetupAuth]", "token lookup failed", { error: err });
        if (setAdminMessage && setAdminMessageType) {
          setAdminMessageType("error");
          setAdminMessage(t("auth.tokenLookupFailed"));
        }
      }
    }

    console.log("[app]", "[useSetupAuth]", "no existing token found, returning empty", {});
    return "";
  }, [inviteToken, setAdminMessage, setAdminMessageType, t]);

  /**
   * Genera un token nuevo, lo persiste en Firestore y sessionStorage.
   * Se llama solo al primer guardado o cuando el usuario solicita explícitamente un cambio.
   */
  const generateNewToken = useCallback(async () => {
    console.log("[app]", "[useSetupAuth]", "generateNewToken start", {});
    const storageKey = `wedin_setup_token_${inviteToken || ""}`;
    const nextToken = generateSetupToken();
    const normalizedToken = normalizeTokenValue(nextToken);
    console.log("[app]", "[useSetupAuth]", "new token generated", { normalizedToken });
    setSetupToken(normalizedToken);
    setSetupTokenInput(normalizedToken);
    if (inviteToken) {
      safeSetItem(storageKey, normalizedToken, sessionStorage);
      try {
        await setDoc(invitationDocRef(inviteToken), { _activeSetupToken: normalizedToken }, { merge: true });
        console.log("[app]", "[useSetupAuth]", "token saved to Firestore", {});
      } catch (err) {
        console.error("[app]", "[useSetupAuth]", "token save to Firestore failed", { error: err });
        if (setAdminMessage && setAdminMessageType) {
          setAdminMessageType("error");
          setAdminMessage(t("auth.tokenCreateFailed"));
        }
      }
    }
    console.log("[app]", "[useSetupAuth]", "generateNewToken done", {});
    return normalizedToken;
  }, [inviteToken, setAdminMessage, setAdminMessageType, t]);

  /**
   * Intenta activar la sesión usando un token de setup.
   * Retorna el username del token (si existe) o lanza error.
   */
  const activateSessionWithToken = useCallback(async (enteredToken: string, _validateToken?: (tokenDoc: DocumentData, tu: string) => void) => {
    const inviteRef = invitationDocRef(inviteToken);

    // Early check: validate token before entering transaction
    const inviteSnapActive = await getDoc(inviteRef);
    if (inviteSnapActive.exists() && inviteSnapActive.data()._activeSetupToken !== enteredToken) {
      throw new Error("Token no válido");
    }

    let userConfirmed = false;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await runTransaction(db, async (transaction) => {
          const inviteSnap = await transaction.get(inviteRef);
          if (!inviteSnap.exists()) {
            transaction.set(inviteRef, { ...defaultConfig, activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry() });
            return "";
          }

          const data = inviteSnap.data();
          if (data.activeSession && !userConfirmed) {
            throw new Error("sessionExists");
          }
          if (data._activeSetupToken !== enteredToken) throw new Error("Token no válido");
          if (_validateToken) _validateToken(data, data.adminUsername);
          transaction.update(inviteRef, { activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry() });
          return "";
        });
      } catch (err) {
        if ((err as Error)?.message === "sessionExists") {
          setIsTokenVerifying(false);
          userConfirmed = window.confirm(t("auth.sessionExists"));
          setIsTokenVerifying(true);
          if (!userConfirmed) return null;
        } else {
          throw err;
        }
      }
    }
  }, [inviteToken, t]);

  /**
   * Inicia sesión con token de setup (sin usuario).
   * Verifica el token en Firestore y activa la sesión.
   * Si ya hay una sesión activa, pide confirmación para sobrescribir.
   */
  const handleTokenLogin = useCallback(async () => {
    console.log("[app]", "[useSetupAuth]", "handleTokenLogin start", {});
    setAuthMessageType("error");
    setAuthMessage("");

    const enteredToken = normalizeTokenValue(setupTokenInput);
    if (!enteredToken) {
      console.log("[app]", "[useSetupAuth]", "no token entered", {});
      setAuthMessage(t("auth.enterCode"));
      return;
    }

    setIsTokenVerifying(true);
    console.log("[app]", "[useSetupAuth]", "verifying token", {});
    try {
      const result = await activateSessionWithToken(enteredToken);
      if (result === null) { console.log("[app]", "[useSetupAuth]", "session exists, user cancelled", {}); setIsTokenVerifying(false); return; }

      const displayName = config.adminUsername || adminLoginUsername || inviteToken;
      setTokenLoginUsername(displayName);
      sessionTypeRef.current = config.adminUsername ? "admin" : "setup";
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      setHasStoredConfig(true);
      saveSession(sessionTypeRef.current, displayName);
      setAuthMessageType("success");
      setAuthMessage(t("auth.codeVerified"));
      console.log("[app]", "[useSetupAuth]", "token login success", { displayName, sessionType: sessionTypeRef.current });
    } catch (err) {
      console.error("[app]", "[useSetupAuth]", "token login failed", { error: err });
      setAuthMessage(t("auth.codeVerifyError"));
    } finally {
      setIsTokenVerifying(false);
      console.log("[app]", "[useSetupAuth]", "handleTokenLogin done", {});
    }
  }, [activateSessionWithToken, setupTokenInput, inviteToken, setHasStoredConfig, config, adminLoginUsername, t]);

  /**
   * Inicia sesión como administrador (requiere usuario + token).
   * Verifica que el usuario coincida con el configurado y que el token sea válido.
   */
  const handleAdminTokenLogin = useCallback(async () => {
    console.log("[app]", "[useSetupAuth]", "handleAdminTokenLogin start", {});
    setAuthMessageType("error");
    setAuthMessage("");

    const username = adminLoginUsername.trim().toLowerCase();
    const enteredToken = normalizeTokenValue(setupTokenInput);
    if (!username || !enteredToken) {
      console.log("[app]", "[useSetupAuth]", "missing username or token", {});
      setAuthMessage(t("auth.enterUserAndCode"));
      return;
    }

    const configuredUsername = (config.adminUsername || "").trim().toLowerCase();
    if (configuredUsername && username !== configuredUsername) {
      console.log("[app]", "[useSetupAuth]", "username mismatch", { entered: username, configured: configuredUsername });
      setAuthMessage(t("auth.invalidCredentials"));
      return;
    }

    console.log("[app]", "[useSetupAuth]", "credentials valid, verifying token", { username });
    setIsTokenVerifying(true);
    try {
      const tokenUsername = await activateSessionWithToken(enteredToken, (_tokenDoc, tu) => {
        if (tu && tu !== username) {
          throw new Error("codeUserMismatch");
        }
      });
      if (tokenUsername === null) { console.log("[app]", "[useSetupAuth]", "session exists, user cancelled", {}); return; }

      setTokenLoginUsername(username);
      sessionTypeRef.current = "admin";
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      setHasStoredConfig(true);
      saveSession("admin", username);
      setAuthMessageType("success");
      setAuthMessage(t("auth.loginSuccess"));
      console.log("[app]", "[useSetupAuth]", "admin login success", { username });
    } catch (err) {
      const key = (err as Error)?.message;
      console.error("[app]", "[useSetupAuth]", "admin login failed", { key });
      if (key === "codeUserMismatch") {
        setAuthMessage(t("auth.codeUserMismatch"));
      } else {
      setAuthMessage(t("auth.codeVerifyError"));
      }
    } finally {
      setIsTokenVerifying(false);
      console.log("[app]", "[useSetupAuth]", "handleAdminTokenLogin done", {});
    }
  }, [activateSessionWithToken, adminLoginUsername, setupTokenInput, config, setHasStoredConfig, t]);

  /**
   * Genera un nuevo token de acceso vinculado a un usuario administrador.
   * Requiere escribir "CONFIRMAR" y que el usuario esté registrado.
   */
  /**
   * Cierra la sesión actual.
   * Limpia el estado local, la sesión en Firestore y la caché.
   * Redirige a la página principal.
   */
  const handleAdminLogout = useCallback(async () => {
    console.log("[app]", "[useSetupAuth]", "handleAdminLogout start", {});
    const token = inviteToken;
    setIsTokenVerified(false);
    setTokenLoginUsername("");
    sessionTypeRef.current = "";
    setSetupToken("");
    setSetupTokenInput("");
    setAuthMessage("");
    clearSession();
    if (token) {
      try {
        safeRemoveItem(`wedin_invite_cache_${token}`);
        await updateDoc(invitationDocRef(token), { activeSession: null, sessionExpiresAt: null });
        console.log("[app]", "[useSetupAuth]", "Firestore session cleared", {});
      } catch (err) {
        console.error("[app]", "[useSetupAuth]", "logout Firestore update failed", { error: err });
        if (setAdminMessage && setAdminMessageType) {
          setAdminMessageType("error");
          setAdminMessage(t("auth.logoutFailed"));
        }
      }
    }
    console.log("[app]", "[useSetupAuth]", "navigating to /", {});
    navigate("/");
  }, [inviteToken, navigate, setAdminMessage, setAdminMessageType, t]);

  /**
   * Regenera el token de setup desde la página de configuración.
   * Requiere confirmar el token actual.
   */
  const handleResetSetupToken = useCallback(async () => {
    console.log("[app]", "[useSetupAuth]", "handleResetSetupToken start", {});
    if (resettingRef.current) { console.log("[app]", "[useSetupAuth]", "already resetting, skip", {}); return; }
    resettingRef.current = true;
    try {
      const storageKey = `wedin_setup_token_${inviteToken || ""}`;
      const storedToken = safeGetItem(storageKey, sessionStorage) || "";
      const currentToken = setupToken || storedToken;
      if (!currentToken || confirmTokenInput !== currentToken) {
        console.log("[app]", "[useSetupAuth]", "token mismatch or missing", { hasCurrent: !!currentToken, inputMatch: confirmTokenInput === currentToken });
        setAuthMessage(t("auth.currentTokenRequired"));
        return;
      }
      setAuthMessage("");
      console.log("[app]", "[useSetupAuth]", "current token valid, generating new", {});
      await generateNewToken();
      setAuthMessageType("success");
      setAuthMessage(t("auth.tokenRenewed"));
      setConfirmTokenInput("");
      console.log("[app]", "[useSetupAuth]", "setup token reset success", {});
    } finally {
      resettingRef.current = false;
    }
  }, [generateNewToken, setupToken, confirmTokenInput, inviteToken, t]);

  /**
   * Regenera el token desde el panel de administración.
   * Similar a handleResetSetupToken pero con mensajes dirigidos al admin.
   */
  const handleResetTokenFromAdmin = useCallback(async () => {
    console.log("[app]", "[useSetupAuth]", "handleResetTokenFromAdmin start", {});
    if (resettingRef.current) { console.log("[app]", "[useSetupAuth]", "already resetting, skip", {}); return; }
    resettingRef.current = true;
    try {
      setAdminMessage("");
      await generateNewToken();
      setAdminMessageType("success");
      setAdminMessage(t("auth.tokenRenewedAdmin"));
      setConfirmTokenInput("");
      console.log("[app]", "[useSetupAuth]", "admin token reset success", {});
    } finally {
      resettingRef.current = false;
    }
  }, [generateNewToken, setAdminMessage, setAdminMessageType, t]);

  return {
    setupToken, setSetupToken,
    setupTokenInput, setSetupTokenInput,
    isTokenVerifying, isTokenVerified, setIsTokenVerified,
    tokenLoginUsername, setTokenLoginUsername,
    adminLoginUsername, setAdminLoginUsername,
    authMessage, setAuthMessage,
    authMessageType, setAuthMessageType,
    confirmTokenInput, setConfirmTokenInput,
    isAdminTokenLoggedIn, isRestoringSession,
    refreshSetupToken, generateNewToken,
    handleTokenLogin, handleAdminTokenLogin,
    handleAdminLogout,
    handleResetSetupToken, handleResetTokenFromAdmin,
  };
}
