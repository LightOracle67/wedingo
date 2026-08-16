/**
 * useSetupAuth.js
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Hook de autenticaciÃ³n para el panel de configuraciÃ³n y admin.
 *
 * Gestiona:
 * - GeneraciÃ³n y verificaciÃ³n de tokens de acceso Ãºnicos.
 * - Inicio de sesiÃ³n con token (setup) o usuario + token (admin).
 * - Persistencia de sesiÃ³n en sessionStorage + Firestore.
 * - RenovaciÃ³n automÃ¡tica de sesiÃ³n cada 60 segundos.
 * - Cierre de sesiÃ³n con limpieza de cachÃ© y estado.
 * - RestauraciÃ³n de sesiÃ³n desde sessionStorage al recargar.
 *
 * @module useSetupAuth
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { getDoc, runTransaction, serverTimestamp, updateDoc, addDoc, collection, type DocumentData } from "firebase/firestore";
import { db, invitationDocRef } from "../lib/firebase";
import { generateSetupToken, normalizeTokenValue } from "../lib/token-utils";
import { createSetupTokenRecord, deleteSetupTokenRecord, hashSetupToken, setupTokenRef } from "../lib/setup-token";
import { saveSession, getSession, clearSession, firestoreSessionExpiry } from "../lib/sessionVars";
import { useSessionRenewal } from "../hooks/useSessionRenewal";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/storage-keys";
import type { InvitationConfig } from "../types";

/**
 * Hook de autenticaciÃ³n del panel de configuraciÃ³n.
 *
 * @param {string} inviteToken - Token de la invitaciÃ³n.
 * @param {object} config - ConfiguraciÃ³n actual de la boda.
 * @param {function} setAdminMessage - Setter para mensajes del panel admin.
 * @param {function} setAdminMessageType - Setter para tipo de mensaje.
 * @param {function} setHasStoredConfig - Setter para indicar si hay config guardada.
 * @returns {object} Estado y handlers de autenticaciÃ³n.
 */
/** Registra un intento de acceso al setup/admin en la subcolección
 *  accessLog de la invitación (F4-2/F4-8): sin IP, solo userAgent. Best-effort. */
function logAccess(inviteToken: string | undefined, action: string, detail = "") {
  if (!inviteToken) return;
  addDoc(collection(db, "invitations", inviteToken, "accessLog"), {
    action,
    detail: detail.slice(0, 200),
    ts: serverTimestamp(),
    userAgent: navigator.userAgent.slice(0, 200),
  }).catch(() => {});
}

export function useSetupAuth(
  inviteToken: string,
  config: InvitationConfig,
  setAdminMessage: (msg: string) => void,
  setAdminMessageType: (type: string) => void,
  setHasStoredConfig: (v: boolean) => void,
) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // â”€â”€â”€ Estados de autenticaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  /** True si habÃ­a una sesiÃ³n local que expirÃ³/no se pudo restaurar (para
   *  mostrar un aviso en lugar de redirigir en silencio). */
  const [sessionExpired, setSessionExpired] = useState(() => {
    try {
      return sessionStorage.getItem("wedin_session_expired") === "1";
    } catch {
      return false;
    }
  });

  /** Intervalo de renovaciÃ³n de sesiÃ³n. */
  const renewRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Tipo de sesiÃ³n actual: "setup" o "admin". */
  const sessionTypeRef = useRef("");
  /** Previene doble clic en reseteo de token. */
  const resettingRef = useRef(false);
  /** Fallos consecutivos de renovaciÃ³n: al segundo se corta la sesiÃ³n. */
  const renewFailureRef = useRef(false);

  /** Derivado: el usuario estÃ¡ autenticado si el token fue verificado. */
  const isAdminTokenLoggedIn = useMemo(() => isTokenVerified, [isTokenVerified]);

  /** Marca que la sesiÃ³n expirÃ³ (estado + sessionStorage) para avisar en el
   *  siguiente render del admin/login. */
  const markSessionExpired = useCallback(() => {
    setSessionExpired(true);
    try {
      sessionStorage.setItem("wedin_session_expired", "1");
    } catch {}
  }, []);
  /** Limpia la marca de expiraciÃ³n tras mostrarla. */
  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
    try {
      sessionStorage.removeItem("wedin_session_expired");
    } catch {}
  }, []);

  /**
   * Al montar el hook, intenta restaurar la sesiÃ³n desde sessionStorage.
   * Si hay una sesiÃ³n guardada, la reactiva sin pedir token.
   * Verifica que la sesiÃ³n siga activa en Firestore.
   */
  useEffect(() => {
    const session = getSession();

    if (!session || (session.type !== "setup" && session.type !== "admin")) {
      return;
    }
    if (!inviteToken) {
      return;
    }

    // La sesiÃ³n local debe pertenecer a ESTA invitaciÃ³n: si se abre la URL
    // de otra boda, no se otorga admin cruzado. AdemÃ¡s de borrar la sesiÃ³n,
    // se invalida isTokenVerified: sin esto, al navegar de A/admin a B/admin
    // el admin quedaba "verificado" para B sin haber iniciado sesiÃ³n ahÃ­
    // (panel cruzado / formulario de setup bloqueado).
    if (session.inviteToken && session.inviteToken !== inviteToken) {
      clearSession();
      setIsTokenVerified(false);
      setIsRestoringSession(false);
      return;
    }

    setIsRestoringSession(true);

    getDoc(invitationDocRef(inviteToken))
      .then(async (snap) => {
        const data = snap.data();
        const sessionExpiresAt = data?.sessionExpiresAt?.toDate?.() ?? data?.sessionExpiresAt;
        const isValid =
          snap.exists() && data?.activeSession && sessionExpiresAt && new Date(sessionExpiresAt).getTime() > Date.now();

        if (isValid) {
          setTokenLoginUsername(session.identifier);
          sessionTypeRef.current = session.type;
          setSetupToken("");
          setSetupTokenInput("");
          setIsTokenVerified(true);
        } else if (snap.exists()) {
          try {
            // La reparaciÃ³n/renovaciÃ³n de sesiÃ³n necesita la prueba de
            // conocimiento del token (hash) para que las reglas la acepten.
            const storageKey = STORAGE_KEYS.setupToken(inviteToken || "");
            const storedToken = safeGetItem(storageKey, sessionStorage) || "";
            const tokenHash = storedToken ? await hashSetupToken(storedToken) : "";
            const repairPayload: Record<string, unknown> = {
              // Timestamp explícito: la regla exige `activeSession is timestamp`
              // y serverTimestamp() (REQUEST_TIME) no lo satisface en producción.
              activeSession: new Date(),
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
            markSessionExpired();
          }
        } else {
          clearSession();
          // HabÃ­a una sesiÃ³n local guardada pero expirÃ³: se avisa en el login.
          if (safeGetItem(STORAGE_KEYS.setupToken(inviteToken || ""), sessionStorage)) {
            markSessionExpired();
          }
        }

        setIsRestoringSession(false);
      })
      .catch((err) => {
        console.error("[app]", "[useSetupAuth]", "session restoration Firestore error", { error: err });

        setIsRestoringSession(false);
      });
  }, [inviteToken, markSessionExpired]);

  /**
   * Renueva la sesiÃ³n periÃ³dicamente cada 60 segundos mientras estÃ© activa.
   * La renovaciÃ³n LOCAL (sessionStorage) la gestiona useSessionRenewal; aquÃ­
   * solo se renueva en FIRESTORE, adjuntando el hash del token de setup
   * (prueba de conocimiento) para que las reglas lo permitan. Nunca se
   * persiste el token en claro en el documento pÃºblico.
   */
  useSessionRenewal(isTokenVerified);
  useEffect(() => {
    if (isTokenVerified) {
      const doRenew = async () => {
        try {
          const storageKey = STORAGE_KEYS.setupToken(inviteToken || "");
          const storedToken = safeGetItem(storageKey, sessionStorage) || "";
          const tokenHash = storedToken ? await hashSetupToken(storedToken) : "";
          const renewPayload: Record<string, unknown> = {
            // Timestamp explícito del cliente (ver comentario de repair):
            // serverTimestamp() no cumple `is timestamp` en el runtime real.
            activeSession: new Date(),
            sessionExpiresAt: firestoreSessionExpiry(),
            setupTokenHash: tokenHash,
          };
          await updateDoc(invitationDocRef(inviteToken), renewPayload);
          // RenovaciÃ³n correcta: se reinicia el contador de fallos.
          renewFailureRef.current = false;
        } catch (err) {
          console.error("[app]", "[useSetupAuth]", "session renewal error", { error: err });
          if (setAdminMessage && setAdminMessageType) {
            setAdminMessageType("error");
            setAdminMessage(t("auth.sessionUpdateFailed"));
          }
          // SesiÃ³n zombi: si la renovaciÃ³n de Firestore falla de forma
          // continuada, la UI quedarÃ­a "logada" pero sin permisos. Se corta.
          if (renewFailureRef.current) {
            clearSession();
            setIsTokenVerified(false);
            setTokenLoginUsername("");
            // Marca la expiraciÃ³n para que la redirecciÃ³n a la vista pÃºblica
            // no sea silenciosa (antes solo se avisaba en la restauraciÃ³n).
            markSessionExpired();
          } else {
            renewFailureRef.current = true;
          }
        }
      };
      doRenew();
      renewRef.current = setInterval(() => doRenew(), 60_000);
    } else {
      if (renewRef.current) {
        clearInterval(renewRef.current);
      }
    }
    return () => {
      if (renewRef.current) {
        clearInterval(renewRef.current);
      }
    };
  }, [isTokenVerified, inviteToken, setAdminMessage, setAdminMessageType, t, markSessionExpired]);

  /**
   * Persiste la sesiÃ³n en sessionStorage cuando cambia el estado de autenticaciÃ³n.
   */
  useEffect(() => {
    if (isTokenVerified && tokenLoginUsername && sessionTypeRef.current) {
      saveSession(sessionTypeRef.current, tokenLoginUsername, { inviteToken });
    }
  }, [isTokenVerified, tokenLoginUsername, inviteToken]);

  /**
   * Recupera el token de setup desde sessionStorage (Ãºnica fuente fiable).
   *
   * El token NO se lee del documento pÃºblico de la invitaciÃ³n (seguridad):
   * se persiste en sessionStorage por invitaciÃ³n y solo puede recuperarse
   * desde Firestore (colecciÃ³n setupTokens) con sesiÃ³n activa, por lo que
   * aquÃ­ se devuelve lo que haya en sessionStorage o vacÃ­o.
   *
   * @param {string} [_oldToken] - Sin uso funcional (API estable).
   * @returns {Promise<string>} El token activo o cadena vacÃ­a.
   */
  const refreshSetupToken = useCallback(
    async (_oldToken?: string) => {
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
    },
    [inviteToken],
  );

  /**
   * Genera un token nuevo y lo registra en la colecciÃ³n setupTokens
   * (documentId = hash SHA-256), no en el documento pÃºblico.
   *
   * Si se pasa `oldToken`, elimina su registro (rotaciÃ³n segura).
   *
   * @param {string} [oldToken] - Token anterior a rotar (opcional).
   * @returns {Promise<string>} El token normalizado generado.
   */
  const generateNewToken = useCallback(
    async (oldToken?: string) => {
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
            try {
              await deleteSetupTokenRecord(oldToken);
            } catch {}
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
    },
    [inviteToken, setAdminMessage, setAdminMessageType, t],
  );

  /**
   * Intenta activar la sesiÃ³n usando un token de setup.
   * Verifica el token contra la colecciÃ³n setupTokens (hash) y activa la
   * sesiÃ³n. Retorna el username del token (si existe) o lanza error.
   */
  const activateSessionWithToken = useCallback(
    async (enteredToken: string, _validateToken?: (tokenDoc: DocumentData, tu: string) => void) => {
      const inviteRef = invitationDocRef(inviteToken);
      const normalized = normalizeTokenValue(enteredToken);
      const tokenHash = await hashSetupToken(normalized);

      // VerificaciÃ³n temprana: el token debe tener registro en setupTokens.
      const tokenRecord = await getDoc(setupTokenRef(tokenHash));
      if (!tokenRecord.exists()) {
        throw new Error("Token no vÃ¡lido");
      }

      let userConfirmed = false;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const outcome = await runTransaction(db, async (transaction) => {
            const inviteSnap = await transaction.get(inviteRef);
            if (!inviteSnap.exists()) {
              // La invitaciÃ³n se crea en la landing antes del login: si no
              // existe (borrada o token huÃ©rfano) no se recrea con defaultConfig
              // (firstName vacÃ­o) porque las reglas lo rechazarÃ­an. Mejor un
              // error claro que una escritura denegada en bucle.
              throw new Error("inviteNotFound");
            }

            const data = inviteSnap.data();
            if (data.activeSession && !userConfirmed) {
              throw new Error("sessionExists");
            }
            if (!tokenRecord.exists()) throw new Error("Token no vÃ¡lido");
            if (_validateToken) _validateToken(data, data.adminUsername);
            const sessionUpdate: Record<string, unknown> = {
              // Timestamp explícito del cliente (ver comentario de repair).
              activeSession: new Date(),
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
          } else if ((err as Error)?.message === "inviteNotFound") {
            // Token huÃ©rfano: la invitaciÃ³n ya no existe (borrada o nunca
            // guardada). No se puede abrir sesiÃ³n sobre un doc inexistente.
            setIsTokenVerifying(false);
            throw new Error("inviteNotFound");
          } else {
            throw err;
          }
        }
      }
    },
    [inviteToken, t],
  );

  /**
   * Inicia sesiÃ³n con token de setup (sin usuario).
   * Verifica el token en Firestore y activa la sesiÃ³n.
   * Si ya hay una sesiÃ³n activa, pide confirmaciÃ³n para sobrescribir.
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
      if (result === null) {
        setIsTokenVerifying(false);
        return;
      }

      const displayName = config.adminUsername || adminLoginUsername || inviteToken;
      setTokenLoginUsername(displayName);
      sessionTypeRef.current = config.adminUsername ? "admin" : "setup";
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      setHasStoredConfig(true);
      logAccess(inviteToken, "login_success", "setup");
      // Persiste el token en sessionStorage para renovaciones y recuperaciÃ³n.
      safeSetItem(STORAGE_KEYS.setupToken(inviteToken), enteredToken, sessionStorage);
      saveSession(sessionTypeRef.current, displayName, { inviteToken });
      setAuthMessageType("success");
      setAuthMessage(t("auth.codeVerified"));
    } catch (err) {
      logAccess(inviteToken, "login_failed", "setup");
      console.error("[app]", "[useSetupAuth]", "token login failed", { error: err });
      setAuthMessage(
        (err as Error)?.message === "inviteNotFound" ? t("auth.inviteNotFound") : t("auth.codeVerifyError"),
      );
    } finally {
      setIsTokenVerifying(false);
    }
  }, [activateSessionWithToken, setupTokenInput, inviteToken, setHasStoredConfig, config, adminLoginUsername, t]);

  /**
   * Inicia sesiÃ³n como administrador (requiere usuario + token).
   * Verifica que el usuario coincida con el configurado y que el token sea vÃ¡lido.
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
      if (tokenUsername === null) {
        return;
      }

      setTokenLoginUsername(username);
      sessionTypeRef.current = "admin";
      setSetupToken("");
      setSetupTokenInput("");
      setIsTokenVerified(true);
      setHasStoredConfig(true);
      // Persiste el token en sessionStorage para renovaciones y recuperaciÃ³n.
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
   * Requiere escribir "CONFIRMAR" y que el usuario estÃ© registrado.
   */
  /**
   * Cierra la sesiÃ³n actual.
   * Limpia el estado local, la sesiÃ³n en Firestore y la cachÃ©.
   * Redirige a la pÃ¡gina principal.
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
   * Regenera el token de setup desde la pÃ¡gina de configuraciÃ³n.
   * Requiere confirmar el token actual.
   */
  const handleResetSetupToken = useCallback(async () => {
    if (resettingRef.current) {
      return;
    }
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
   * Regenera el token desde el panel de administraciÃ³n.
   * Similar a handleResetSetupToken pero con mensajes dirigidos al admin.
   */
  const handleResetTokenFromAdmin = useCallback(async () => {
    if (resettingRef.current) {
      return;
    }
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
    setupToken,
    setSetupToken,
    setupTokenInput,
    setSetupTokenInput,
    isTokenVerifying,
    isTokenVerified,
    setIsTokenVerified,
    tokenLoginUsername,
    setTokenLoginUsername,
    adminLoginUsername,
    setAdminLoginUsername,
    authMessage,
    setAuthMessage,
    authMessageType,
    setAuthMessageType,
    confirmTokenInput,
    setConfirmTokenInput,
    isAdminTokenLoggedIn,
    isRestoringSession,
    sessionExpired,
    clearSessionExpired,
    refreshSetupToken,
    generateNewToken,
    handleTokenLogin,
    handleAdminTokenLogin,
    handleAdminLogout,
    handleResetSetupToken,
    handleResetTokenFromAdmin,
  };
}
