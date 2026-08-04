import { createContext, useContext } from "react";
import type { useRsvp } from "../hooks/useRsvp";

export type RsvpValue = Pick<
  ReturnType<typeof useRsvp>,
  | "rsvpEntries"
  | "rsvpForm"
  | "rsvpMessage"
  | "isRsvpSubmitting"
  | "hasSubmitted"
  | "alreadySubmittedEntry"
  | "DIETARY_OPTIONS"
  | "updateRsvpField"
  | "handleRsvpSubmit"
  | "handleDeleteRsvp"
  | "handleDeleteRsvpEntries"
  | "computeAge"
  | "handleClearRsvpEntries"
>;

export const RsvpContext = createContext<RsvpValue | null>(null);

export function useRsvpContext() {
  const ctx = useContext(RsvpContext);
  if (!ctx) throw new Error("useRsvpContext debe usarse dentro de AppProvider");
  return ctx;
}
