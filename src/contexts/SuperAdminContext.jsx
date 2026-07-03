import { createContext, useContext, useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { saveSession, getSession, renewSession, clearSession } from "../lib/sessionVars";

const SUPERADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAILS?.split(",")[0]?.trim() || "";

const SuperAdminContext = createContext(null);

export function SuperAdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const renewRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const local = getSession();
      if (firebaseUser && firebaseUser.email === SUPERADMIN_EMAIL && local?.type === "superadmin") {
        setUser(firebaseUser);
      } else {
        if (firebaseUser && firebaseUser.email === SUPERADMIN_EMAIL) {
          signOut(auth).catch(() => {});
        }
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      renewSession();
      renewRef.current = setInterval(() => renewSession(), 60_000);
    } else {
      if (renewRef.current) clearInterval(renewRef.current);
    }
    return () => { if (renewRef.current) clearInterval(renewRef.current); };
  }, [user]);

  const login = useCallback(async (email, password) => {
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user.email !== SUPERADMIN_EMAIL) {
        await signOut(auth);
        setError("Esta cuenta no tiene permisos de administración.");
        return false;
      }
      saveSession("superadmin", result.user.email, { uid: result.user.uid });
      setUser(result.user);
      return true;
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Credenciales incorrectas.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiados intentos. Espera un momento e inténtalo de nuevo.");
      } else if (err.code === "auth/invalid-email") {
        setError("El formato del email no es válido.");
      } else {
        setError("Error al iniciar sesión. Comprueba tu conexión.");
      }
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    await signOut(auth);
    setUser(null);
  }, []);

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

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext);
  if (!context) throw new Error("useSuperAdmin debe usarse dentro de SuperAdminProvider");
  return context;
}
