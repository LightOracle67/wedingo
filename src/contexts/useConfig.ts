import { createContext, useContext } from "react";
import type { InvitationConfig } from "../types";

export interface ConfigContextValue {
  config: InvitationConfig;
  hasStoredConfig: boolean;
  isConfigLoading: boolean;
  configLoadError: string;
  inviteToken: string;
  maxAllowedYear: number;
  formattedDate: string;
  formattedTime: string;
  calendarLink: string | null;
  visitCount: number;
  reloadConfig: () => Promise<void>;
  handleSaveSetup: (event: React.FormEvent) => Promise<void>;
  handleDayChange: (value: string) => void;
  handleTimeChange: (value: string) => void;
  handleTimeBlur: (value: string) => void;
  handleYearChange: (value: string) => void;
  /** Restablece el formulario a los valores por defecto (conserva el token
   *  de acceso en el setup inicial). */
  handleResetForm: () => void;
  handleDeleteInvitation: () => Promise<void>;
  setHasStoredConfig: (v: boolean) => void;
  registerOnFirstSave: (cb: () => void) => void;
  /** Indica si hay un guardado manual en curso (habilita el botón Guardar). */
  isSaving: boolean;
}

export const ConfigContext = createContext<ConfigContextValue | null>(null);

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig debe usarse dentro de AppProvider");
  return ctx;
}

/**
 * InviteToken OPCIONAL (v2.192, rama firebase-lazy): componentes globales del
 * shell (banner de cookies, modal de borrado de datos) pueden existir fuera
 * de los providers de ruta. Sin ConfigProvider devuelven "" y los flujos se
 * degradan con elegancia (consentimiento sin token de invitación = solo
 * local).
 */
export function useOptionalInviteToken(): string {
  const ctx = useContext(ConfigContext);
  return ctx?.inviteToken ?? "";
}

/**
 * Contexto separado del estado del EDITOR (formData + updateFormField).
 *
 * Razón (v2.185): formData cambia de identidad en CADA tecla del editor. Si
 * vivera dentro del value principal de ConfigContext, los 16 consumidores de
 * useConfig() (AppShell, RsvpProvider, AuthProvider, PrintPage, secciones…)
 * se re-renderizaban por keystroke aunque no tocaran el formulario — un
 * desperdicio enorme en las rutas de edición. Los consumidores que SÍ
 * necesitan el borrador en vivo (AdminPage/SetupPage: aviso beforeunload,
 * test de cambios) se suscriben de forma explícita con useFormData().
 */
export interface FormDataContextValue {
  formData: InvitationConfig;
  updateFormField: (field: string, value: string) => void;
}

export const FormDataContext = createContext<FormDataContextValue | null>(null);

export function useFormData(): FormDataContextValue {
  const ctx = useContext(FormDataContext);
  if (!ctx) throw new Error("useFormData debe usarse dentro de ConfigProvider");
  return ctx;
}
