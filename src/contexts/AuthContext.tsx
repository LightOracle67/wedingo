import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { updateDoc, serverTimestamp } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { firestoreSessionExpiry, saveSession } from "../lib/sessionVars";
import { useSetupAuth } from "../hooks/useSetupAuth";
import { useConfig } from "./ConfigContext";
import { useTranslation } from "react-i18next";
import { useAppUI } from "./UIContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: any) {
  const { t } = useTranslation();
  const { setAdminMessage, setAdminMessageType } = useAppUI();
  const { inviteToken, config, setHasStoredConfig, registerOnFirstSave } = useConfig();
  const location = useLocation();

  const auth = useSetupAuth(inviteToken, config, setAdminMessage, setAdminMessageType, setHasStoredConfig);

  // ── Auto-login after first save ──
  const onFirstSaveRef = useRef<any>(null);
  onFirstSaveRef.current = () => {
    if (auth.isTokenVerified) return;
    auth.setSetupToken("");
    auth.setSetupTokenInput("");
    (async () => {
      try {
        await updateDoc(invitationDocRef(inviteToken), {
          activeSession: serverTimestamp(),
          sessionExpiresAt: firestoreSessionExpiry(),
        });
      } catch {
        if (setAdminMessage && setAdminMessageType) {
          setAdminMessageType("error");
          setAdminMessage(t("errors.sessionUpdateFailed"));
        }
      }
    })();
    auth.setIsTokenVerified(true);
    auth.setTokenLoginUsername(config.adminUsername || inviteToken);
    saveSession("admin", config.adminUsername || inviteToken);
  };

  useEffect(() => {
    registerOnFirstSave(() => onFirstSaveRef.current());
  }, [registerOnFirstSave]);

  // ── Token regeneration effect ──
  const refreshToken = auth.refreshSetupToken;
  useEffect(() => {
    if (!inviteToken) return;
    (async () => { await refreshToken(); })();
  }, [inviteToken, refreshToken]);

  // ── Clear auth messages on route change ──
  useEffect(() => {
    auth.setAuthMessage("");
  }, [location.pathname, auth]);

  const authValue = useMemo(() => ({
    setupToken: auth.setupToken, setupTokenInput: auth.setupTokenInput,
    isTokenVerifying: auth.isTokenVerifying, isTokenVerified: auth.isTokenVerified,
    tokenLoginUsername: auth.tokenLoginUsername, adminLoginUsername: auth.adminLoginUsername,
    isAdminTokenLoggedIn: auth.isAdminTokenLoggedIn, confirmTokenInput: auth.confirmTokenInput,
    authMessage: auth.authMessage, authMessageType: auth.authMessageType,
    refreshSetupToken: auth.refreshSetupToken,
    handleTokenLogin: auth.handleTokenLogin, handleAdminTokenLogin: auth.handleAdminTokenLogin,
    handleAdminLogout: auth.handleAdminLogout,
    handleResetSetupToken: auth.handleResetSetupToken, handleResetTokenFromAdmin: auth.handleResetTokenFromAdmin,
    setSetupTokenInput: auth.setSetupTokenInput, setIsTokenVerified: auth.setIsTokenVerified,
    setTokenLoginUsername: auth.setTokenLoginUsername,
    setAdminLoginUsername: auth.setAdminLoginUsername, setConfirmTokenInput: auth.setConfirmTokenInput,
  }), [auth]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AppProvider");
  return ctx;
}
