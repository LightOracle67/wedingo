import { createContext, useContext } from "react";

/** Estado poco frecuente de la UI (modales de legalidad/cookies y mapa de
 *  ubicación). v2.187: se separa de los MENSAJES (useUIMessages) porque los
 *  mensajes cambian a menudo (autosave cada 1,5 s, acciones admin) y su
 *  antiguo value único re-renderizaba a TODOS los consumidores de useAppUI. */
export interface UIValue {
  legalModal: string;
  setLegalModal: (v: string) => void;
  /** Abre el banner de cookies en modo preferencias (GDPR art. 7.3: retirar el
   *  consentimiento debe ser tan fácil como otorgarlo). */
  cookiePrefsOpen: boolean;
  setCookiePrefsOpen: (v: boolean) => void;
  locationMapContainerRef: React.RefObject<HTMLDivElement | null>;
  locationMapError: string;
  setLocationMapError: (v: string) => void;
  locationMapLoading: boolean;
  setLocationMapLoading: (v: boolean) => void;
  locationMapTarget: { latitude: number; longitude: number; label: string } | null;
  setLocationMapTarget: (v: { latitude: number; longitude: number; label: string } | null) => void;
}

/** Mensajes frecuentes de la UI (guardado, acciones admin). Los consumidores
 *  que SOLO leen esto usan useUIMessages() y no se re-renderizan cuando se
 *  abre/cierra un modal (ni al revés). */
export interface UIMessagesValue {
  saveMessage: string;
  setSaveMessage: (v: string) => void;
  saveError: string;
  setSaveError: (v: string) => void;
  adminMessage: string;
  setAdminMessage: (v: string) => void;
  adminMessageType: string;
  setAdminMessageType: (v: string) => void;
}

export const UIContext = createContext<UIValue | null>(null);
export const UIMessagesContext = createContext<UIMessagesValue | null>(null);

export function useAppUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useAppUI debe usarse dentro de AppProvider");
  return ctx;
}

/** Hook de los mensajes frecuentes (contexto separado): evita re-renderizar
 *  a los consumidores de useAppUI por cada toast de autosave/acción. */
export function useUIMessages(): UIMessagesValue {
  const ctx = useContext(UIMessagesContext);
  if (!ctx) throw new Error("useUIMessages debe usarse dentro de AppProvider");
  return ctx;
}
