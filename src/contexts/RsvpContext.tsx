import { useMemo } from "react";
import { useRsvp } from "../hooks/useRsvp";
import { useConfig } from "./useConfig";
import { useAppUI } from "./useAppUI";
import { useAuth } from "./useAuth";
import { RsvpContext, RsvpFormContext } from "./useRsvpContext";

export function RsvpProvider({ children }: { children: React.ReactNode }) {
  const { setAdminMessage, setAdminMessageType } = useAppUI();
  const { inviteToken, config } = useConfig();
  // Solo el admin con sesión puede leer respuestas (reglas): el invitado
  // envía sin leer.
  const { isAdminTokenLoggedIn } = useAuth();

  const rsvp = useRsvp(
    inviteToken,
    setAdminMessage,
    setAdminMessageType,
    config.menuEnabled === "true",
    isAdminTokenLoggedIn,
  );

  // Valor COMPARTIDO: estable durante la edición del formulario (sin
  // rsvpForm). El formulario vive en RsvpFormContext (solo RsvpSection).
  const rsvpValue = useMemo(
    () => ({
      rsvpEntries: rsvp.rsvpEntries,
      rsvpMessage: rsvp.rsvpMessage,
      isRsvpSubmitting: rsvp.isRsvpSubmitting,
      hasSubmitted: rsvp.hasSubmitted,
      alreadySubmittedEntry: rsvp.alreadySubmittedEntry,
      DIETARY_OPTIONS: rsvp.DIETARY_OPTIONS,
      rsvpLoadError: rsvp.rsvpLoadError,
      retryLoadRsvp: rsvp.retryLoadRsvp,
      handleDeleteRsvp: rsvp.handleDeleteRsvp,
      handleDeleteRsvpEntries: rsvp.handleDeleteRsvpEntries,
      handleClearRsvpEntries: rsvp.handleClearRsvpEntries,
    }),
    [rsvp],
  );

  // Valor del FORMULARIO: cambia por tecla; solo RsvpSection lo consume.
  const rsvpFormValue = useMemo(
    () => ({
      rsvpForm: rsvp.rsvpForm,
      updateRsvpField: rsvp.updateRsvpField,
      handleRsvpSubmit: rsvp.handleRsvpSubmit,
      computeAge: rsvp.computeAge,
    }),
    [rsvp],
  );

  return (
    <RsvpContext.Provider value={rsvpValue}>
      <RsvpFormContext.Provider value={rsvpFormValue}>{children}</RsvpFormContext.Provider>
    </RsvpContext.Provider>
  );
}
