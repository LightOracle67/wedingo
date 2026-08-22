import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { privateSessionDocRef } from "../lib/firebase";
import { firestoreSessionExpiry, saveSession } from "../lib/sessionVars";
import { hashSetupToken } from "../lib/setup-token";
import { safeGetItem } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/storage-keys";
import { useSetupAuth } from "../hooks/useSetupAuth";
import { useTranslation } from "react-i18next";
import { useConfig } from "./useConfig";
import { useAppUI } from "./useAppUI";
import { AuthContext } from "./useAuth";
import { safeLogError } from "../lib/safe-error";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { setAdminMessage, setAdminMessageType } = useAppUI();
  const { inviteToken, config, setHasStoredConfig, registerOnFirstSave } = useConfig();
  const location = useLocation();

  const auth = useSetupAuth(inviteToken, config, setAdminMessage, setAdminMessageType, setHasStoredConfig);

  // ── Auto-login after first save ──
  const onFirstSaveRef = useRef<() => void>(null!);
  onFirstSaveRef.current = () => {
    if (auth.isTokenVerified) {
      return;
    }
    (async () => {
try {
        // El token de setup se obtiene de sessionStorage y se envía su hash
        // para que las reglas verifiquen la prueba de conocimiento del token.
        // Es el MISMO token mostrado en el formulario: no se regenera.
        const storedToken = safeGetItem(STORAGE_KEYS.setupToken(inviteToken), sessionStorage) || "";
        const tokenHash = storedToken ? await hashSetupToken(storedToken) : "";

        await setDoc(privateSessionDocRef(inviteToken), {
          // Timestamp EXPLÍCITO del cliente, no serverTimestamp(): la regla de
          // sesión exige `activeSession is timestamp` y en el runtime real de
          // Firestore un valor REQUEST_TIME (serverTimestamp) NO satisface esa
          // comprobación (el emulador sí, por qué el bug pasó los tests). El
          // alcance sigue seguro: sessionExpiresAt queda acotado por las reglas
          // y la escritura exige prueba de token (setupTokenValid).
          activeSession: new Date(),
          sessionExpiresAt: firestoreSessionExpiry(),
          setupTokenHash: tokenHash,
          createdAt: serverTimestamp(),
        });
        // Solo marcar como verificado si el guardado en Firestore fue exitoso
        auth.setIsTokenVerified(true);
        const displayName = config.adminUsername || inviteToken;
        if (displayName) {
          auth.setTokenLoginUsername(displayName);
          saveSession("admin", displayName, { inviteToken });
        }
      } catch (err) {
        safeLogError(["[app]", "[AuthProvider]", "onFirstSave error"], err);
        if (setAdminMessage && setAdminMessageType) {
          setAdminMessageType("error");
          setAdminMessage(t("auth.sessionUpdateFailed"));
        }
      }
    })();
  };

  useEffect(() => {
    registerOnFirstSave(() => onFirstSaveRef.current());
  }, [registerOnFirstSave]);

  // ── Token regeneration effect ──
  const refreshToken = auth.refreshSetupToken;
  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      try {
        await refreshToken();
      } catch (err) {
        safeLogError(["[app]", "[AuthProvider]", "refreshToken failed"], err);
      }
    })();
  }, [inviteToken, refreshToken]);

  // ── Clear auth messages on route change ──
  useEffect(() => {
    auth.setAuthMessage("");
  }, [location.pathname, auth]);

  const authValue = useMemo(
    () => ({
      setupToken: auth.setupToken,
      setupTokenInput: auth.setupTokenInput,
      isTokenVerifying: auth.isTokenVerifying,
      isTokenVerified: auth.isTokenVerified,
      tokenLoginUsername: auth.tokenLoginUsername,
      adminLoginUsername: auth.adminLoginUsername,
      isAdminTokenLoggedIn: auth.isAdminTokenLoggedIn,
      isRestoringSession: auth.isRestoringSession,
      sessionExpired: auth.sessionExpired,
      clearSessionExpired: auth.clearSessionExpired,
      confirmTokenInput: auth.confirmTokenInput,
      authMessage: auth.authMessage,
      authMessageType: auth.authMessageType,
      refreshSetupToken: auth.refreshSetupToken,
      generateNewToken: auth.generateNewToken,
      handleTokenLogin: auth.handleTokenLogin,
      handleAdminTokenLogin: auth.handleAdminTokenLogin,
      handleAdminLogout: auth.handleAdminLogout,
      handleResetSetupToken: auth.handleResetSetupToken,
      handleResetTokenFromAdmin: auth.handleResetTokenFromAdmin,
      setSetupTokenInput: auth.setSetupTokenInput,
      setIsTokenVerified: auth.setIsTokenVerified,
      setTokenLoginUsername: auth.setTokenLoginUsername,
      setAdminLoginUsername: auth.setAdminLoginUsername,
      setConfirmTokenInput: auth.setConfirmTokenInput,
    }),
    [auth],
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}
