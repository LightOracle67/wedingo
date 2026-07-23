import { createContext, useContext } from "react";
import type { InvitationConfig } from "../types";

interface ConfigContextValue {
  config: InvitationConfig;
  formData: InvitationConfig;
  hasStoredConfig: boolean;
  isConfigLoading: boolean;
  configLoadError: string;
  inviteToken: string;
  maxAllowedYear: number;
  previewBackgrounds: { id: string; src: string; label: string; description: string }[];
  isPreviewLoading: boolean;
  formattedDate: string;
  formattedTime: string;
  calendarLink: string | null;
  visitCount: number;
  updateFormField: (field: string, value: string) => void;
  reloadConfig: () => Promise<void>;
  handleSaveSetup: (event: React.FormEvent) => Promise<void>;
  handleDayChange: (value: string) => void;
  handleHourChange: (value: string) => void;
  handleMinuteChange: (value: string) => void;
  handleMinuteBlur: () => void;
  handleYearChange: (value: string) => void;
  handleCoordinateChange: (field: string, value: string) => void;
  handleDeleteInvitation: () => Promise<void>;
  setHasStoredConfig: (v: boolean) => void;
  registerOnFirstSave: (cb: () => void) => void;
}

export const ConfigContext = createContext<ConfigContextValue | null>(null);

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig debe usarse dentro de AppProvider");
  return ctx;
}
