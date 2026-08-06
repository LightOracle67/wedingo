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
import { getDoc, runTransaction, serverTimestamp, updateDoc, type DocumentData } from "firebase/firestore";
import { db, invitationDocRef } from "../lib/firebase";
import { defaultConfig } from "../lib/constants";
import { generateSetupToken, normalizeTokenValue } from "../lib/token-utils";
import { createSetupTokenRecord, deleteSetupTokenRecord, hashSetupToken, setupTokenRef } from "../lib/setup-token";
import { saveSession, getSession, renewSession, clearSession, firestoreSessionExpiry } from "../lib/sessionVars";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/storage-keys";
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

    const session = getSession();

    if (!session || (session.type !== "setup" && session.type !== "admin")) {


      return;
    }
    if (!inviteToken) {


      return;
    }

    // La sesión local debe pertenecer a ESTA invitación: si se abre la URL
    // de otra boda, no se otorga admin cruzado.
    if (session.inviteToken && session.inviteToken !== inviteToken) {
      clearSession();
      setIsRestoringSession(false);
      return;
    }

    setIsRestoringSession(true);

    getDoc(invitationDocRef(inviteToken)).then(async (snap) => {
      const data = snap.data();
      const sessionExpiresAt = data?.sessionExpiresAt?.toDate?.() ?? data?.sessionExpiresAt;
      const isValid = snap.exists()
        && data?.activeSession
        && sessionExpiresAt
        && new Date(sessionExpiresAt).getTime() > Date.now();


      if (isValid) {
        setTokenLoginUsername(session.identifier);
        sessionTypeRef.current = session.type;
        setSetupToken("");
        setSetupTokenInput("");
        setIsTokenVerified(true);


      } else if (snap.exists()) {


        try {
          // La reparación/renovación de sesión necesita la prueba de
          // conocimiento del token (hash) para que las reglas la acepten.
          const storageKey = STORAGE_KEYS.setupToken(inviteToken || "");
          const storedToken = safeGetItem(storageKey, sessionStorage) || "";
          const tokenHash = storedToken ? await hashSetupToken(storedToken) : "";
          const repairPayload: Record<string, unknown> = {
            activeSession: serverTimestamp(),
            sessionExpiresAt: firestoreSessionExpiry(),
            setupTokenHash: tokenHash,
          };
          await updateDoc(invitationDocRef(inviteToken), repairPayload);
          setTokenLoginUsername(session.identifier);
          sessionTypeRef.current = session.type;
          setSetupToken("");
          setSetupTokenInput("");
          setIsTokenVerified(true);


        } catch (repairErr) {
          console.error("[app]", "[useSetupAuth]", "session repair failed", { error: repairErr });

          clearSession();
        }
      } else {
        clearSession();


      }

      setIsRestoringSession(false);
    }).catch((err) => {
      console.error("[app]", "[useSetupAuth]", "session restoration Firestore error", { error: err });

      setIsRestoringSession(false);
    });
  }, [inviteToken]);

  /**
   * Renueva la sesión periódicamente cada 60 segundos mientras esté activa.
   * Para que las reglas permitan la renovación se adjunta el hash del token
   * de setup (prueba de conocimiento). Nunca se persiste el token en claro
   * en el documento público.
   */
  useEffect(() => {

    if (isTokenVerified) {
      const doRenew = async () => {

        renewSession();
        try {
          const storageKey = STORAGE_KEYS.setupToken(inviteToken || "");
          const storedToken = safeGetItem(storageKey, sessionStorage) || "";
          const tokenHash = storedToken ? await hashSetupToken(storedToken) : "";
          const renewPayload: Record<string, unknown> = {
            activeSession: serverTimestamp(),
            sessionExpiresAt: firestoreSessionExpiry(),
            setupTokenHash: tokenHash,
          };
          await updateDoc(invitationDocRef(inviteToken), renewPayload);

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

    } else {
      if (renewRef.current) { ; clearInterval(renewRef.current); }
    }
    return () => { if (renewRef.current) { ; clearInterval(renewRef.current); } };
  }, [isTokenVerified, inviteToken, setAdminMessage, setAdminMessageType, t]);

  /**
   * Persiste la sesión en sessionStorage cuando cambia el estado de autenticación.
   */
  useEffect(() => {

    if (isTokenVerified && tokenLoginUsername && sessionTypeRef.current) {

      saveSession(sessionTypeRef.current, tokenLoginUsername);
    }
  }, [isTokenVerified, tokenLoginUsername]);

  /**
   * Recupera el token de setup desde sessionStorage (única fuente fiable).
   *
   * El token NO se lee del documento público de la invitación (seguridad):
   * se persiste en sessionStorage por invitación y solo puede recuperarse
   * desde Firestore (colección setupTokens) con sesión activa, por lo que
   * aquí se devuelve lo que haya en sessionStorage o vacío.
   *
   * @param {string} [_oldToken] - Sin uso funcional (API estable).
   * @returns {Promise<string>} El token activo o cadena vacía.
   */
  const refreshSetupToken = useCallback(async (_oldToken?: string) => {

    const storageKey = STORAGE_KEYS.setupToken(inviteToken || "");

    if (inviteToken) {
      const saved = safeGetItem(storageKey, sessionStorage);
      if (saved) {

        setSetupToken(saved);
        setSetupTokenInput(saved);
        return saved;
      }
    }

    return "";
  }, [inviteToken]);

  /**
   * Genera un token nuevo y lo registra en la colección setupTokens
   * (documentId = hash SHA-256), no en el documento público.
   *
   * Si se pasa `oldToken`, elimina su registro (rotación segura).
   *
   * @param {string} [oldToken] - Token anterior a rotar (opcional).
   * @returns {Promise<string>} El token normalizado generado.
   */
  const generateNewToken = useCallback(async (oldToken?: string) => {

    const storageKey = STORAGE_KEYS.setupToken(inviteToken || "");
    const nextToken = generateSetupToken();
    const normalizedToken = normalizeTokenValue(nextToken);

    setSetupToken(normalizedToken);
    setSetupTokenInput(normalizedToken);
    if (inviteToken) {
      safeSetItem(storageKey, normalizedToken, sessionStorage);
      try {
        await createSetupTokenRecord(inviteToken, normalizedToken);
        if (oldToken) {
          try { await deleteSetupTokenRecord(oldToken); } catch { }
        }
      } catch (err) {
        console.error("[app]", "[useSetupAuth]", "token save to Firestore failed", { error: err });
        if (setAdminMessage && setAdminMessageType) {
          setAdminMessageType("error");
          setAdminMessage(t("auth.tokenCreateFailed"));
        }
      }
    }

    return normalizedToken;
  }, [inviteToken, setAdminMessage, setAdminMessageType, t]);

  /**
   * Intenta activar la sesión usando un token de setup.
   * Verifica el token contra la colección setupTokens (hash) y activa la
   * sesión. Retorna el username del token (si existe) o lanza error.
   */
  const activateSessionWithToken = useCallback(async (enteredToken: string, _validateToken?: (tokenDoc: DocumentData, tu: string) => void) => {
    const inviteRef = invitationDocRef(inviteToken);
    const normalized = normalizeTokenValue(enteredToken);
    const tokenHash = await hashSetupToken(normalized);

    // Verificación temprana: el token debe tener registro en setupTokens.
    const tokenRecord = await getDoc(setupTokenRef(tokenHash));
    if (!tokenRecord.exists()) {
      throw new Error("Token no válido");
    }

    let userConfirmed = false;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const outcome = await runTransaction(db, async (transaction) => {
          const inviteSnap = await transaction.get(inviteRef);
          if (!inviteSnap.exists()) {
            transaction.set(inviteRef, { ...defaultConfig, activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry(), setupTokenHash: tokenHash });
            return "";
          }

          const data = inviteSnap.data();
          if (data.activeSession && !userConfirmed) {
            throw new Error("sessionExists");
          }
          if (!tokenRecord.exists()) throw new Error("Token no válido");
          if (_validateToken) _validateToken(data, data.adminUsername);
          const sessionUpdate: Record<string, unknown> = {
            activeSession: serverTimestamp(),
            sessionExpiresAt: firestoreSessionExpiry(),
            setupTokenHash: tokenHash,
          };
          transaction.update(inviteRef, sessionUpdate);
          return "";
        });
        return outcome;
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

    setAuthMessageType("error");
    setAuthMessage("");

    const enteredToken = normalizeTokenValue(setupTokenInput);
    if (!enteredToken) {

      setAuthMessage(t("auth.enterCode"));
      return;
    }

    setIsTokenVerifying(true);

    try {
      const result = await activateSessionWithToken(enteredToken);
      if (result === null) { ; setIsTokenVerifying(false); return; }

      const displayName = config.adminUsername || adminLoginUsername || inviteToken;
      setTokenLoginUsername(displayName);
      sessionTypeRef.current = config.adminUsername ? "admin" : "setup";
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      setHasStoredConfig(true);
      // Persiste el token en sessionStorage para renovaciones y recuperación.
      safeSetItem(STORAGE_KEYS.setupToken(inviteToken), enteredToken, sessionStorage);
      saveSession(sessionTypeRef.current, displayName);
      setAuthMessageType("success");
      setAuthMessage(t("auth.codeVerified"));

    } catch (err) {
      console.error("[app]", "[useSetupAuth]", "token login failed", { error: err });
      setAuthMessage(t("auth.codeVerifyError"));
    } finally {
      setIsTokenVerifying(false);

    }
  }, [activateSessionWithToken, setupTokenInput, inviteToken, setHasStoredConfig, config, adminLoginUsername, t]);

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

      setAuthMessage(t("auth.enterUserAndCode"));
      return;
    }

    const configuredUsername = (config.adminUsername || "").trim().toLowerCase();
    if (configuredUsername && username !== configuredUsername) {

      setAuthMessage(t("auth.invalidCredentials"));
      return;
    }

    setIsTokenVerifying(true);
    try {
      const tokenUsername = await activateSessionWithToken(enteredToken, (_tokenDoc, tu) => {
        if (tu && tu !== username) {
          throw new Error("codeUserMismatch");
        }
      });
      if (tokenUsername === null) { ; return; }

      setTokenLoginUsername(username);
      sessionTypeRef.current = "admin";
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      setHasStoredConfig(true);
      // Persiste el token en sessionStorage para renovaciones y recuperación.
      safeSetItem(STORAGE_KEYS.setupToken(inviteToken), enteredToken, sessionStorage);
      saveSession("admin", username, { inviteToken });
      setAuthMessageType("success");
      setAuthMessage(t("auth.loginSuccess"));

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

    }
  }, [activateSessionWithToken, adminLoginUsername, setupTokenInput, config, setHasStoredConfig, inviteToken, t]);

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
        safeRemoveItem(STORAGE_KEYS.inviteCache(token));
        await updateDoc(invitationDocRef(token), { activeSession: null, sessionExpiresAt: null });

      } catch (err) {
        console.error("[app]", "[useSetupAuth]", "logout Firestore update failed", { error: err });
        if (setAdminMessage && setAdminMessageType) {
          setAdminMessageType("error");
          setAdminMessage(t("auth.logoutFailed"));
        }
      }
    }

    navigate("/");
  }, [inviteToken, navigate, setAdminMessage, setAdminMessageType, t]);

  /**
   * Regenera el token de setup desde la página de configuración.
   * Requiere confirmar el token actual.
   */
  const handleResetSetupToken = useCallback(async () => {

    if (resettingRef.current) { ; return; }
    resettingRef.current = true;
    try {
      const storageKey = STORAGE_KEYS.setupToken(inviteToken || "");
      const storedToken = safeGetItem(storageKey, sessionStorage) || "";
      const currentToken = setupToken || storedToken;
      if (!currentToken || confirmTokenInput !== currentToken) {

        setAuthMessage(t("auth.currentTokenRequired"));
        return;
      }
      setAuthMessage("");

      await generateNewToken(currentToken);
      setAuthMessageType("success");
      setAuthMessage(t("auth.tokenRenewed"));
      setConfirmTokenInput("");

    } finally {
      resettingRef.current = false;
    }
  }, [generateNewToken, setupToken, confirmTokenInput, inviteToken, t]);

  /**
   * Regenera el token desde el panel de administración.
   * Similar a handleResetSetupToken pero con mensajes dirigidos al admin.
   */
  const handleResetTokenFromAdmin = useCallback(async () => {

    if (resettingRef.current) { ; return; }
    resettingRef.current = true;
    try {
      setAdminMessage("");
      const storageKey = STORAGE_KEYS.setupToken(inviteToken || "");
      const oldToken = setupToken || safeGetItem(storageKey, sessionStorage) || "";
      await generateNewToken(oldToken);
      setAdminMessageType("success");
      setAdminMessage(t("auth.tokenRenewedAdmin"));
      setConfirmTokenInput("");

    } finally {
      resettingRef.current = false;
    }
  }, [generateNewToken, setAdminMessage, setAdminMessageType, t, inviteToken, setupToken]);

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
