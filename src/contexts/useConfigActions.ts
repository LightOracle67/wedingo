/**
 * useConfigActions.ts (v2.192, rama firebase-lazy)
 * ─────────────────────────────────────────────────────────────
 * Contexto y hook de las ACCIONES ESTABLES del editor, extraídos de
 * ConfigContext.tsx. Razón: el barrel `contexts/index.ts` re-exportaba
 * useConfigActions DESDE ConfigContext, que importa Firebase y ejecuta
 * initializeFirestore a nivel de módulo — cualquier import del barrel
 * arrastraba vendor-firebase al entry. Este módulo es ligero (sin Firebase).
 */

import { createContext, useContext } from "react";

export interface ConfigActionsValue {
  /** Escribe un campo del formulario en la tienda granular (FormStore). */
  updateFormField: (field: string, value: string) => void;
  handleDayChange: (value: string) => void;
  handleTimeChange: (value: string) => void;
  handleTimeBlur: (value: string) => void;
  handleYearChange: (value: string) => void;
  /** Año máximo permitido al guardar la fecha de la boda. */
  maxAllowedYear: number;
  /** Token de la invitación en curso (cambia solo al navegar de ruta). */
  inviteToken: string;
  /** Indica si la invitación ya tiene configuración guardada. */
  hasStoredConfig: boolean;
}

export const ConfigActionsContext = createContext<ConfigActionsValue | null>(null);

/** Hook para leer las acciones estables del editor (error si no hay provider). */
export function useConfigActions(): ConfigActionsValue {
  const ctx = useContext(ConfigActionsContext);
  if (!ctx) throw new Error("useConfigActions debe usarse dentro de ConfigProvider");
  return ctx;
}
