import { createContext, useContext, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import type { User } from "firebase/auth";
import { getAuthInstance } from "../lib/firebase";
import { INVITE_CACHE_PREFIX } from "../lib/storage-keys";
import { saveSession, getSession, renewSession, clearSession } from "../lib/sessionVars";
import { SUPERADMIN_EMAIL, SUPERADMIN_ROUTE } from "../lib/superadmin";

export interface SuperAdminValue {
  isSuperAdmin: boolean;
  user: User | null;
  email: string;
  isLoading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminValue | null>(null);

export function SuperAdminProvider({ children }: { children: React.ReactNode }) {

  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const renewRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Flag para evitar que onAuthStateChanged cierre sesión durante el login. */
  const loggingInRef = useRef(false);

  useEffect(() => {

    let unsubscribe: (() => void) | null = null;
    // El SDK de auth solo se carga si el usuario está en la consola de
    // superadmin o tiene una sesión superadmin persistida: un invitado en
    // una invitación pública no debe descargar firebase/auth (~25 KB gzip).
    // La ruta se lee de la configuración (no hardcodeada) para que el guard
    // funcione en el primer acceso.
    const isConsoleRoute = window.location.pathname.startsWith(SUPERADMIN_ROUTE);
    const hasStoredSession = getSession()?.type === "superadmin";
    if (!isConsoleRoute && !hasStoredSession) {
      setIsLoading(false);
      return;
    }
    // Auth se inicializa de forma diferida (solo ruta de superadmin); el
    // SDK se importa aquí para no cargarlo en el arranque de la app.
    getAuthInstance().then(async (instance) => {
      const { onAuthStateChanged, signOut } = await import("firebase/auth");
      unsubscribe = onAuthStateChanged(instance, (firebaseUser) => {
        const local = getSession();

        if (firebaseUser && firebaseUser.email === SUPERADMIN_EMAIL && local?.type === "superadmin") {

          setUser(firebaseUser);
        } else if (firebaseUser && firebaseUser.email === SUPERADMIN_EMAIL && loggingInRef.current) {
          // Login en curso: no forzar cierre, esperar a que login() guarde la sesión

          setUser(firebaseUser);
        } else {
          if (firebaseUser && firebaseUser.email === SUPERADMIN_EMAIL) {

            signOut(instance).catch(() => {});
          }

          setUser(null);
        }
        setIsLoading(false);
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {

      renewSession();
      renewRef.current = setInterval(() => {

        renewSession();
      }, 60_000);
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
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {

    setError("");
    loggingInRef.current = true;
    try {
      const authInstance = await getAuthInstance();
      const { signInWithEmailAndPassword, signOut } = await import("firebase/auth");
      const result = await signInWithEmailAndPassword(authInstance, email, password);
      if (result.user.email !== SUPERADMIN_EMAIL) {
        console.error("[app]", "[SuperAdminContext]", "login error: no permissions", { email: result.user.email });
        await signOut(authInstance);
        setError(t("auth.superadminNoPermissions"));
        loggingInRef.current = false;
        return false;
      }
      saveSession("superadmin", result.user.email ?? "", { uid: result.user.uid });
      setUser(result.user);
      loggingInRef.current = false;

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

    clearSession();
    const authInstance = await getAuthInstance();
    const { signOut } = await import("firebase/auth");
    await signOut(authInstance);
    setUser(null);
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(INVITE_CACHE_PREFIX));

      keys.forEach((k: string) => localStorage.removeItem(k));
    } catch {}

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
