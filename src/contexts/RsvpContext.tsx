import { useMemo } from "react";
import { useRsvp } from "../hooks/useRsvp";
import { useConfig } from "./useConfig";
import { useAppUI } from "./useAppUI";
import { useAuth } from "./useAuth";
import { RsvpContext } from "./useRsvpContext";

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

  const rsvpValue = useMemo(
    () => ({
      rsvpEntries: rsvp.rsvpEntries,
      rsvpForm: rsvp.rsvpForm,
      rsvpMessage: rsvp.rsvpMessage,
      isRsvpSubmitting: rsvp.isRsvpSubmitting,
      hasSubmitted: rsvp.hasSubmitted,
      alreadySubmittedEntry: rsvp.alreadySubmittedEntry,
      DIETARY_OPTIONS: rsvp.DIETARY_OPTIONS,
      rsvpLoadError: rsvp.rsvpLoadError,
      retryLoadRsvp: rsvp.retryLoadRsvp,
      updateRsvpField: rsvp.updateRsvpField,
      handleRsvpSubmit: rsvp.handleRsvpSubmit,
      handleDeleteRsvp: rsvp.handleDeleteRsvp,
      handleDeleteRsvpEntries: rsvp.handleDeleteRsvpEntries,
      computeAge: rsvp.computeAge,
      handleClearRsvpEntries: rsvp.handleClearRsvpEntries,
    }),
    [rsvp],
  );

  return <RsvpContext.Provider value={rsvpValue}>{children}</RsvpContext.Provider>;
}
