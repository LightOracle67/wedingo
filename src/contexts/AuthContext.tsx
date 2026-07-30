import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { serverTimestamp, updateDoc } from "firebase/firestore";
import { invitationDocRef } from "../lib/firebase";
import { firestoreSessionExpiry, saveSession } from "../lib/sessionVars";
import { useSetupAuth } from "../hooks/useSetupAuth";
import { useTranslation } from "react-i18next";
import { useConfig } from "./useConfig";
import { useAppUI } from "./useAppUI";
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log("[app]", "[AuthProvider]", "mount", {});
  const { t } = useTranslation();
  const { setAdminMessage, setAdminMessageType } = useAppUI();
  const { inviteToken, config, setHasStoredConfig, registerOnFirstSave } = useConfig();
  const location = useLocation();

  const auth = useSetupAuth(inviteToken, config, setAdminMessage, setAdminMessageType, setHasStoredConfig);

  // ── Auto-login after first save ──
  const onFirstSaveRef = useRef<() => void>(null!);
  onFirstSaveRef.current = () => {
    console.log("[app]", "[AuthProvider]", "onFirstSave triggered", { isTokenVerified: auth.isTokenVerified });
    if (auth.isTokenVerified) { console.log("[app]", "[AuthProvider]", "already verified, skip", {}); return; }
    auth.setSetupToken("");
    auth.setSetupTokenInput("");
    (async () => {
      try {
        console.log("[app]", "[AuthProvider]", "updating session in Firestore", {});
        await updateDoc(invitationDocRef(inviteToken), {
          activeSession: serverTimestamp(),
          sessionExpiresAt: firestoreSessionExpiry(),
        });
        auth.setIsTokenVerified(true);
        const displayName = config.adminUsername || inviteToken;
        if (displayName) {
          console.log("[app]", "[AuthProvider]", "setting tokenLoginUsername and saving session", { displayName });
          auth.setTokenLoginUsername(displayName);
          saveSession("admin", displayName);
        }
        console.log("[app]", "[AuthProvider]", "onFirstSave success", {});
      } catch (err) {
        console.error("[app]", "[AuthProvider]", "onFirstSave error", { error: err });
        if (setAdminMessage && setAdminMessageType) {
          setAdminMessageType("error");
          setAdminMessage(t("auth.sessionUpdateFailed"));
        }
      }
    })();
  };

  useEffect(() => {
    console.log("[app]", "[AuthProvider]", "registerOnFirstSave callback", {});
    registerOnFirstSave(() => onFirstSaveRef.current());
  }, [registerOnFirstSave]);

  // ── Token regeneration effect ──
  const refreshToken = auth.refreshSetupToken;
  useEffect(() => {
    console.log("[app]", "[AuthProvider]", "token regeneration effect", { inviteToken });
    if (!inviteToken) return;
    (async () => { try { await refreshToken(); console.log("[app]", "[AuthProvider]", "token refresh done", {}); } catch (err) { console.log("[app]", "[AuthProvider]", "token refresh error", { error: err }); } })();
  }, [inviteToken, refreshToken]);

  // ── Clear auth messages on route change ──
  useEffect(() => {
    console.log("[app]", "[AuthProvider]", "clearing auth messages on route change", { pathname: location.pathname });
    auth.setAuthMessage("");
  }, [location.pathname, auth]);

  const authValue = useMemo(() => ({
    setupToken: auth.setupToken, setupTokenInput: auth.setupTokenInput,
    isTokenVerifying: auth.isTokenVerifying, isTokenVerified: auth.isTokenVerified,
    tokenLoginUsername: auth.tokenLoginUsername, adminLoginUsername: auth.adminLoginUsername,
    isAdminTokenLoggedIn: auth.isAdminTokenLoggedIn, isRestoringSession: auth.isRestoringSession,
    confirmTokenInput: auth.confirmTokenInput,
    authMessage: auth.authMessage, authMessageType: auth.authMessageType,
    refreshSetupToken: auth.refreshSetupToken, generateNewToken: auth.generateNewToken,
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


