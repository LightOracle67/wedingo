import { createContext, useContext, type FormEvent } from "react";
import type { ConfigContextValue } from "./useConfig";
import type { AuthValue } from "./useAuth";
import type { RsvpValue } from "./useRsvpContext";
import type { UIValue } from "./useAppUI";

export type AppValue = ConfigContextValue &
  AuthValue &
  RsvpValue &
  UIValue & {
    handleSaveSetup: (event: FormEvent) => Promise<void>;
  };

export const AppContext = createContext<AppValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de AppProvider");
  return context;
}
