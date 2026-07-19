import { createContext, useContext, useMemo } from "react";
import { useRsvp } from "../hooks/useRsvp";
import { useConfig } from "./ConfigContext";
import { useAppUI } from "./UIContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RsvpContext = createContext<any>(null);

export function RsvpProvider({ children }: any) {
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

export function useRsvpContext() {
  const ctx = useContext(RsvpContext);
  if (!ctx) throw new Error("useRsvpContext debe usarse dentro de AppProvider");
  return ctx;
}
