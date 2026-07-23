import { createContext, useContext } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AppContext = createContext<any>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de AppProvider");
  return context;
}
