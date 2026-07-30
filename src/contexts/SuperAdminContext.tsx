import { createContext, useContext, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { saveSession, getSession, renewSession, clearSession } from "../lib/sessionVars";

const SUPERADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAILS?.split(",")[0]?.trim() || "adriancl2001@gmail.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SuperAdminContext = createContext<any>(null);

export function SuperAdminProvider({ children }: { children: React.ReactNode }) {
  console.log("[app]", "[SuperAdminContext]", "mount");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const renewRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Flag para evitar que onAuthStateChanged cierre sesión durante el login. */
  const loggingInRef = useRef(false);

  useEffect(() => {
    console.log("[app]", "[SuperAdminContext]", "subscribe to auth state changes");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const local = getSession();
      console.log("[app]", "[SuperAdminContext]", "auth state changed", { firebaseUser: firebaseUser?.email, localSessionType: local?.type, loggingIn: loggingInRef.current });
      if (firebaseUser && firebaseUser.email === SUPERADMIN_EMAIL && local?.type === "superadmin") {
        console.log("[app]", "[SuperAdminContext]", "auth state: valid superadmin");
        setUser(firebaseUser);
      } else if (firebaseUser && firebaseUser.email === SUPERADMIN_EMAIL && loggingInRef.current) {
        // Login en curso: no forzar cierre, esperar a que login() guarde la sesión
        console.log("[app]", "[SuperAdminContext]", "auth state: login in progress, keeping user");
        setUser(firebaseUser);
      } else {
        if (firebaseUser && firebaseUser.email === SUPERADMIN_EMAIL) {
          console.log("[app]", "[SuperAdminContext]", "auth state: no session, signing out");
          signOut(auth).catch(() => {});
        }
        console.log("[app]", "[SuperAdminContext]", "auth state: no user");
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => {
      console.log("[app]", "[SuperAdminContext]", "unsubscribe from auth state changes");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      console.log("[app]", "[SuperAdminContext]", "user set, starting session renewal", { email: user.email });
      renewSession();
      renewRef.current = setInterval(() => {
        console.log("[app]", "[SuperAdminContext]", "renewing session");
        renewSession();
      }, 60_000);
    } else {
      if (renewRef.current) {
        console.log("[app]", "[SuperAdminContext]", "no user, clearing renewal interval");
        clearInterval(renewRef.current);
      }
    }
    return () => {
      if (renewRef.current) {
        console.log("[app]", "[SuperAdminContext]", "cleanup renewal interval");
        clearInterval(renewRef.current);
      }
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    console.log("[app]", "[SuperAdminContext]", "login start", { email });
    setError("");
    loggingInRef.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user.email !== SUPERADMIN_EMAIL) {
        console.error("[app]", "[SuperAdminContext]", "login error: no permissions", { email: result.user.email });
        await signOut(auth);
        setError(t("auth.superadminNoPermissions"));
        loggingInRef.current = false;
        return false;
      }
      saveSession("superadmin", result.user.email ?? "", { uid: result.user.uid });
      setUser(result.user);
      loggingInRef.current = false;
      console.log("[app]", "[SuperAdminContext]", "login success", { email: result.user.email, uid: result.user.uid });
      try {
        const cred = new PasswordCredential({ id: email, password, name: email });
        navigator.credentials.store(cred);
      } catch {}
      return true;
    } catch (err) {
      loggingInRef.current = false;
      const code = err && typeof err === "object" && "code" in err ? String((err as Record<string, unknown>).code) : "";
      console.error("[app]", "[SuperAdminContext]", "login error", { code });
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError(t("auth.superadminWrongCredentials"));
      } else if (code === "auth/too-many-requests") {
        setError(t("auth.superadminTooManyAttempts"));
      } else if (code === "auth/invalid-email") {
        setError(t("auth.superadminInvalidEmail"));
      } else {
        setError(t("auth.superadminLoginError"));
      }
      return false;
    }
  }, [t]);

  const logout = useCallback(async () => {
    console.log("[app]", "[SuperAdminContext]", "logout start");
    clearSession();
    await signOut(auth);
    setUser(null);
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("wedin_invite_cache_"));
      console.log("[app]", "[SuperAdminContext]", "clearing invite cache", { keys });
      keys.forEach((k: string) => localStorage.removeItem(k));
    } catch {}
    console.log("[app]", "[SuperAdminContext]", "logout complete, navigating to /");
    navigate("/");
  }, [navigate]);

  const value = useMemo(() => ({
    isSuperAdmin: user !== null,
    user,
    email: SUPERADMIN_EMAIL,
    isLoading,
    error,
    login,
    logout,
  }), [user, isLoading, error, login, logout]);

  return <SuperAdminContext.Provider value={value}>{children}</SuperAdminContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useSuperAdmin() {
  const context = useContext(SuperAdminContext);
  if (!context) throw new Error("useSuperAdmin debe usarse dentro de SuperAdminProvider");
  return context;
}
