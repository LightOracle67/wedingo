import { useMemo } from "react";
import { useRsvp } from "../hooks/useRsvp";
import { useConfig } from "./useConfig";
import { useAppUI } from "./useAppUI";
import { RsvpContext } from "./useRsvpContext";

export function RsvpProvider({ children }: { children: React.ReactNode }) {
  const { setAdminMessage, setAdminMessageType } = useAppUI();
  const { inviteToken, config } = useConfig();

  const rsvp = useRsvp(inviteToken, setAdminMessage, setAdminMessageType, config.menuEnabled === "true");

  const rsvpValue = useMemo(() => ({
    rsvpEntries: rsvp.rsvpEntries, rsvpForm: rsvp.rsvpForm, rsvpMessage: rsvp.rsvpMessage,
    isRsvpSubmitting: rsvp.isRsvpSubmitting, hasSubmitted: rsvp.hasSubmitted,
    alreadySubmittedEntry: rsvp.alreadySubmittedEntry, DIETARY_OPTIONS: rsvp.DIETARY_OPTIONS,
    updateRsvpField: rsvp.updateRsvpField, handleRsvpSubmit: rsvp.handleRsvpSubmit,
    handleDietaryToggle: rsvp.handleDietaryToggle,
    handleDeleteRsvp: rsvp.handleDeleteRsvp, computeAge: rsvp.computeAge,
    handleClearRsvpEntries: rsvp.handleClearRsvpEntries,
  }), [rsvp]);

  return (
    <RsvpContext.Provider value={rsvpValue}>
      {children}
    </RsvpContext.Provider>
  );
}


