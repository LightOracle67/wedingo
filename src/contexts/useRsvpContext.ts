import { createContext, useContext } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RsvpContext = createContext<any>(null);

export function useRsvpContext() {
  const ctx = useContext(RsvpContext);
  if (!ctx) throw new Error("useRsvpContext debe usarse dentro de AppProvider");
  return ctx;
}
