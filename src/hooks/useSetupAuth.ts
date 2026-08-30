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
import { getDoc, serverTimestamp, updateDoc, addDoc, collection, setDoc, type DocumentData } from "firebase/firestore";
import { db, invitationDocRef, privateSessionDocRef } from "../lib/firebase";
import { generateSetupToken, normalizeTokenValue } from "../lib/token-utils";
import { createSetupTokenRecord, deleteSetupTokenRecord, hashSetupToken, setupTokenRef } from "../lib/setup-token";
import { saveSession, getSession, clearSession, firestoreSessionExpiry } from "../lib/sessionVars";
import { useSessionRenewal } from "../hooks/useSessionRenewal";
import { safeSetItem, safeGetItem, safeRemoveItem } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/storage-keys";
import type { InvitationConfig } from "../types";
import { safeLogError } from "../lib/safe-error";

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
  /** True si había una sesión local que expiró/no se pudo restaurar (para
   *  mostrar un aviso en lugar de redirigir en silencio). */
  const [sessionExpired, setSessionExpired] = useState(() => {
    try {
      return sessionStorage.getItem("wedin_session_expired") === "1";
    } catch {
      return false;
    }
  });

  /** Intervalo de renovación de sesión. */
  const renewRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Tipo de sesión actual: "setup" o "admin". */
  const sessionTypeRef = useRef("");
  /** Previene doble clic en reseteo de token. */
  const resettingRef = useRef(false);
  /** Fallos consecutivos de renovación: al segundo se corta la sesión. */
  const renewFailureRef = useRef(false);
  /** Ref de "sesión viva": el logout lo pone a false ANTES del updateDoc, y el
   *  renew lo comprueba antes de escribir; evita que una renovación en vuelo
   *  resucite la sesión Firestore tras un logout explícito (sesión zombi). */
  const sessionAliveRef = useRef(false);

  /** Derivado: el usuario está autenticado si el token fue verificado. */
  const isAdminTokenLoggedIn = useMemo(() => isTokenVerified, [isTokenVerified]);

  /** Marca que la sesión expiró (estado + sessionStorage) para avisar en el
   *  siguiente render del admin/login. */
  const markSessionExpired = useCallback(() => {
    setSessionExpired(true);
    try {
      sessionStorage.setItem("wedin_session_expired", "1");
    } catch {}
  }, []);
  /** Limpia la marca de expiración tras mostrarla. */
  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
    try {
      sessionStorage.removeItem("wedin_session_expired");
    } catch {}
  }, []);

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
    // de otra boda, no se otorga admin cruzado. Además de borrar la sesión,
    // se invalida isTokenVerified: sin esto, al navegar de A/admin a B/admin
    // el admin quedaba "verificado" para B sin haber iniciado sesión ahí
    // (panel cruzado / formulario de setup bloqueado).
    if (session.inviteToken && session.inviteToken !== inviteToken) {
      clearSession();
      setIsTokenVerified(false);
      setIsRestoringSession(false);
      return;
    }

    setIsRestoringSession(true);

    getDoc(privateSessionDocRef(inviteToken))
      .then(async (snap) => {
        const data = snap.data();
        const sessionExpiresAt = data?.sessionExpiresAt?.toDate?.() ?? data?.sessionExpiresAt;
        const isValid = snap.exists() && sessionExpiresAt && new Date(sessionExpiresAt).getTime() > Date.now();

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
              // Timestamp explícito: la regla exige `activeSession is timestamp`
              // y serverTimestamp() (REQUEST_TIME) no lo satisface en producción.
              activeSession: new Date(),
              sessionExpiresAt: firestoreSessionExpiry(),
              setupTokenHash: tokenHash,
              createdAt: serverTimestamp(),
            };
            // Sin token de invitación no existe documento privado de sesión
            // (ruta inválida invitations/_private/session): la consola
            // superadmin usa Firebase Auth y no necesita esta reparación.
            if (!inviteToken) throw new Error("session-repair-skipped-no-invite-token");
            await setDoc(privateSessionDocRef(inviteToken), repairPayload);
            setTokenLoginUsername(session.identifier);
            sessionTypeRef.current = session.type;
            setSetupToken("");
            setSetupTokenInput("");
            setIsTokenVerified(true);
          } catch (repairErr) {
            safeLogError(["[app]", "[useSetupAuth]", "session repair failed"], repairErr);

            clearSession();
            markSessionExpired();
          }
        } else {
          clearSession();
          // Había una sesión local guardada pero expiró: se avisa en el login.
          if (safeGetItem(STORAGE_KEYS.setupToken(inviteToken || ""), sessionStorage)) {
            markSessionExpired();
          }
        }

        setIsRestoringSession(false);
      })
      .catch((err) => {
        safeLogError(["[app]", "[useSetupAuth]", "session restoration Firestore error"], err);

        setIsRestoringSession(false);
      });
  }, [inviteToken, markSessionExpired]);

  /**
   * Renueva la sesión periódicamente cada 60 segundos mientras esté activa.
   * La renovación LOCAL (sessionStorage) la gestiona useSessionRenewal; aquí
   * solo se renueva en FIRESTORE, adjuntando el hash del token de setup
   * (prueba de conocimiento) para que las reglas lo permitan. Nunca se
   * persiste el token en claro en el documento público.
   */
  useSessionRenewal(isTokenVerified);
  useEffect(() => {
    if (isTokenVerified) {
      // Marca la sesión como viva: el logout la apagará antes de borrar.
      sessionAliveRef.current = true;
      const doRenew = async () => {
        // No renovar si la sesión ya se cerró (logout en vuelo): un renew
        // tardío no debe resucitar la sesión Firestore.
        if (!sessionAliveRef.current) return;
        // Sin token de invitación no se renueva: privateSessionDocRef("")
        // construiría una ruta inválida (3 segmentos) y fallaría siempre.
        if (!inviteToken) return;
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
          await updateDoc(privateSessionDocRef(inviteToken), renewPayload);
          // Renovación correcta: se reinicia el contador de fallos.
          renewFailureRef.current = false;
        } catch (err) {
          safeLogError(["[app]", "[useSetupAuth]", "session renewal error"], err);
          if (setAdminMessage && setAdminMessageType) {
            setAdminMessageType("error");
            setAdminMessage(t("auth.sessionUpdateFailed"));
          }
          // Sesión zombi: si la renovación de Firestore falla de forma
          // continuada, la UI quedaría "logada" pero sin permisos. Se corta.
          if (renewFailureRef.current) {
            clearSession();
            setIsTokenVerified(false);
            setTokenLoginUsername("");
            // Marca la expiración para que la redirección a la vista pública
            // no sea silenciosa (antes solo se avisaba en la restauración).
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
   * Persiste la sesión en sessionStorage cuando cambia el estado de autenticación.
   */
  useEffect(() => {
    if (isTokenVerified && tokenLoginUsername && sessionTypeRef.current) {
      saveSession(sessionTypeRef.current, tokenLoginUsername, { inviteToken });
    }
  }, [isTokenVerified, tokenLoginUsername, inviteToken]);

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
   * Genera un token nuevo y lo registra en la colección setupTokens
   * (documentId = hash SHA-256), no en el documento público.
   *
   * Si se pasa `oldToken`, elimina su registro (rotación segura).
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
          safeLogError(["[app]", "[useSetupAuth]", "token save to Firestore failed"], err);
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
   * Intenta activar la sesión usando un token de setup.
   * Verifica el token contra la colección setupTokens (hash) y activa la
   * sesión. Retorna el username del token (si existe) o lanza error.
   */
  const activateSessionWithToken = useCallback(
    async (enteredToken: string, _validateToken?: (tokenDoc: DocumentData, tu: string) => void) => {
      const inviteRef = invitationDocRef(inviteToken);
      const normalized = normalizeTokenValue(enteredToken);
      const tokenHash = await hashSetupToken(normalized);

      // Verificación temprana: el token debe tener registro en setupTokens.
      const tokenRecord = await getDoc(setupTokenRef(tokenHash));
      if (!tokenRecord.exists()) {
        throw new Error("Token no válido");
      }

      // Lectura previa del documento (NO transacción): una escritura de sesión
      // vía runTransaction con currentDocument.updateTime sobre una sesión YA
      // existente es rechazada por las reglas en el runtime real de Firestore
      // (el emulador sí la acepta). updateDoc funciona en todos los casos y la
      // activación sigue siendo idempotente (las reglas exigen setupTokenValid).
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) {
        throw new Error("inviteNotFound");
      }
      const data = inviteSnap.data();
      if (data.activeSession) {
        setIsTokenVerifying(false);
        const userConfirmed = window.confirm(t("auth.sessionExists"));
        setIsTokenVerifying(true);
        if (!userConfirmed) return null;
      }
      if (!tokenRecord.exists()) throw new Error("Token no válido");
      if (_validateToken) _validateToken(data, data.adminUsername);

      // Timestamp explícito del cliente (ver comentario en repair): la regla
      // exige `activeSession is timestamp` y serverTimestamp() no lo cumple.
      await setDoc(privateSessionDocRef(inviteToken), {
        activeSession: new Date(),
        sessionExpiresAt: firestoreSessionExpiry(),
        setupTokenHash: tokenHash,
        createdAt: serverTimestamp(),
      });
      return "";
    },
    [inviteToken, t],
  );

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
      // Persiste el token en sessionStorage para renovaciones y recuperación.
      safeSetItem(STORAGE_KEYS.setupToken(inviteToken), enteredToken, sessionStorage);
      saveSession(sessionTypeRef.current, displayName, { inviteToken });
      setAuthMessageType("success");
      setAuthMessage(t("auth.codeVerified"));
    } catch (err) {
      logAccess(inviteToken, "login_failed", "setup");
      safeLogError(["[app]", "[useSetupAuth]", "token login failed"], err);
      setAuthMessage(
        (err as Error)?.message === "inviteNotFound" ? t("auth.inviteNotFound") : t("auth.codeVerifyError"),
      );
    } finally {
      setIsTokenVerifying(false);
    }
  }, [activateSessionWithToken, setupTokenInput, inviteToken, setHasStoredConfig, config.adminUsername, adminLoginUsername, t]);

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
      if (tokenUsername === null) {
        return;
      }

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
      safeLogError(["[app]", "[useSetupAuth]", "admin login failed"], err);
      if (key === "codeUserMismatch") {
        setAuthMessage(t("auth.codeUserMismatch"));
      } else {
        setAuthMessage(t("auth.codeVerifyError"));
      }
    } finally {
      setIsTokenVerifying(false);
    }
  }, [activateSessionWithToken, adminLoginUsername, setupTokenInput, config.adminUsername, setHasStoredConfig, inviteToken, t]);

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
    // Apaga la "sesión viva" ANTES de borrar: cualquier renovación en vuelo
    // no resucitará la sesión Firestore (fix sesión zombi).
    sessionAliveRef.current = false;
    // Reinicia el contador de fallos de renovación para el próximo login.
    renewFailureRef.current = false;
    if (renewRef.current) clearInterval(renewRef.current);
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
        await updateDoc(privateSessionDocRef(token), { activeSession: null, sessionExpiresAt: null });
      } catch (err) {
        safeLogError(["[app]", "[useSetupAuth]", "logout Firestore update failed"], err);
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
   * Regenera el token desde el panel de administración.
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

  // Return memoizado: AuthContext hace `useMemo(() => ({...auth}), [auth])`,
  // así que la identidad de este objeto determina si TODOS los consumidores
  // de useAuth() re-renderizan. Sin este useMemo, cada render del provider
  // (p. ej. cada tecla del editor) invalidaba el memo y provocaba una cascada
  // de re-renders en AppShell/AdminPage/PublicInvitation/RsvpSection…
  // Los setters de useState y los callbacks ya son estables (useCallback).
  return useMemo(
    () => ({
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
    }),
    [
      setupToken,
      setupTokenInput,
      isTokenVerifying,
      isTokenVerified,
      tokenLoginUsername,
      adminLoginUsername,
      authMessage,
      authMessageType,
      confirmTokenInput,
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
    ],
  );
}
