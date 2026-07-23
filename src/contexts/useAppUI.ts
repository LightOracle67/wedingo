import { createContext, useContext } from "react";

export const UIContext = createContext<any>(null);

export function useAppUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useAppUI debe usarse dentro de AppProvider");
  return ctx;
}
