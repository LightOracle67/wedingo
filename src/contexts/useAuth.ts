import { createContext, useContext } from "react";
import type { useSetupAuth } from "../hooks/useSetupAuth";

export type AuthValue = Pick<
  ReturnType<typeof useSetupAuth>,
  | "setupToken"
  | "setupTokenInput"
  | "isTokenVerifying"
  | "isTokenVerified"
  | "tokenLoginUsername"
  | "adminLoginUsername"
  | "isAdminTokenLoggedIn"
  | "isRestoringSession"
  | "sessionExpired"
  | "clearSessionExpired"
  | "confirmTokenInput"
  | "authMessage"
  | "authMessageType"
  | "refreshSetupToken"
  | "generateNewToken"
  | "handleTokenLogin"
  | "handleAdminTokenLogin"
  | "handleAdminLogout"
  | "handleResetSetupToken"
  | "handleResetTokenFromAdmin"
  | "setSetupTokenInput"
  | "setIsTokenVerified"
  | "setTokenLoginUsername"
  | "setAdminLoginUsername"
  | "setConfirmTokenInput"
>;

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AppProvider");
  return ctx;
}
