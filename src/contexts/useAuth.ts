import { createContext, useContext } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AuthContext = createContext<any>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AppProvider");
  return ctx;
}
