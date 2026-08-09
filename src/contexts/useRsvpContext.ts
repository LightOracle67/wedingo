import { createContext, useContext } from "react";
import type { useRsvp } from "../hooks/useRsvp";

/**
 * Valor COMPARTIDO del RSVP: datos estables (respuestas, mensaje, estado de
 * envío). NO incluye el formulario (rsvpForm/updateRsvpField), que cambia por
 * tecla y vive en un contexto anidado consumido SOLO por RsvpSection — así los
 * demás consumidores (PublicInvitation, AdminPage, DataRequestModal,
 * AppContext) no re-renderizan con cada pulsación.
 */
export type RsvpValue = Pick<
  ReturnType<typeof useRsvp>,
  | "rsvpEntries"
  | "rsvpMessage"
  | "isRsvpSubmitting"
  | "hasSubmitted"
  | "alreadySubmittedEntry"
  | "rsvpLoadError"
  | "retryLoadRsvp"
  | "DIETARY_OPTIONS"
  | "handleDeleteRsvp"
  | "handleDeleteRsvpEntries"
  | "handleClearRsvpEntries"
>;

export const RsvpContext = createContext<RsvpValue | null>(null);

export function useRsvpContext() {
  const ctx = useContext(RsvpContext);
  if (!ctx) throw new Error("useRsvpContext debe usarse dentro de AppProvider");
  return ctx;
}

/**
 * Formulario RSVP (rsvpForm + updateRsvpField + submit + computeAge): cambia
 * con cada tecla y lo consume únicamente RsvpSection. Al estar aislado en su
 * propio contexto anidado, teclear en el formulario no re-renderiza el resto
 * del árbol (PublicInvitation dejó de re-renderizarse por tecla).
 */
export type RsvpFormValue = Pick<
  ReturnType<typeof useRsvp>,
  "rsvpForm" | "updateRsvpField" | "handleRsvpSubmit" | "computeAge"
>;

export const RsvpFormContext = createContext<RsvpFormValue | null>(null);

export function useRsvpFormContext() {
  const ctx = useContext(RsvpFormContext);
  if (!ctx) throw new Error("useRsvpFormContext debe usarse dentro de AppProvider");
  return ctx;
}
