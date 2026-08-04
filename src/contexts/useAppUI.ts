import { createContext, useContext } from "react";

export interface UIValue {
  legalModal: string;
  setLegalModal: (v: string) => void;
  saveMessage: string;
  setSaveMessage: (v: string) => void;
  saveError: string;
  setSaveError: (v: string) => void;
  adminMessage: string;
  setAdminMessage: (v: string) => void;
  adminMessageType: string;
  setAdminMessageType: (v: string) => void;
  locationMapContainerRef: React.RefObject<HTMLDivElement | null>;
  locationMapError: string;
  setLocationMapError: (v: string) => void;
  locationMapLoading: boolean;
  setLocationMapLoading: (v: boolean) => void;
  locationMapTarget: { latitude: number; longitude: number; label: string } | null;
  setLocationMapTarget: (v: { latitude: number; longitude: number; label: string } | null) => void;
}

export const UIContext = createContext<UIValue | null>(null);

export function useAppUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useAppUI debe usarse dentro de AppProvider");
  return ctx;
}
