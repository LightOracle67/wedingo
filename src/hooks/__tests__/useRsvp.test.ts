import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(() => Promise.resolve({ id: "test-doc-id" })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  doc: vi.fn(() => "doc-ref"),
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
}));

vi.mock("../../lib/firebase", () => ({
  RSVP_COLLECTION_REF: "rsvpResponses",
  rsvpByInviteRef: vi.fn(() => "rsvpByInviteRef"),
}));

import { useRsvp } from "../useRsvp";

describe("useRsvp", () => {
  const setAdminMessage = vi.fn();
  const setAdminMessageType = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with default form state", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    expect(result.current.rsvpForm.guestName).toBe("");
    expect(result.current.rsvpForm.attendance).toBe("yes");
    expect(result.current.rsvpForm.attendees).toEqual([{ name: "", menu: "", allergies: [] }]);
    expect(result.current.rsvpForm.privacyConsent).toBe(false);
    expect(result.current.rsvpEntries).toEqual([]);
    expect(result.current.hasSubmitted).toBe(false);
  });

  it("updates a form field via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("guestName", "Adrián"));
    expect(result.current.rsvpForm.guestName).toBe("Adrián");
  });

  it("resets attendees when attendance is set to no", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("attendees", [{ name: "Juan", menu: "", allergies: [] }]));
    expect(result.current.rsvpForm.attendees).toHaveLength(1);
    act(() => result.current.updateRsvpField("attendance", "no"));
    expect(result.current.rsvpForm.attendance).toBe("no");
    expect(result.current.rsvpForm.attendees).toEqual([]);
  });

  it("adds an attendee via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => {
      const current = result.current.rsvpForm.attendees;
      result.current.updateRsvpField("attendees", [...current, { name: "María", menu: "", allergies: [] }]);
    });
    expect(result.current.rsvpForm.attendees.length).toBe(2);
    expect(result.current.rsvpForm.attendees[1].name).toBe("María");
  });

  it("removes an attendee via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => {
      result.current.updateRsvpField("attendees", [
        { name: "Juan", menu: "", allergies: [] },
        { name: "María", menu: "", allergies: [] },
      ]);
    });
    expect(result.current.rsvpForm.attendees.length).toBe(2);
    act(() => {
      result.current.updateRsvpField(
        "attendees",
        result.current.rsvpForm.attendees.filter((_, i) => i !== 0),
      );
    });
    expect(result.current.rsvpForm.attendees.length).toBe(1);
    expect(result.current.rsvpForm.attendees[0].name).toBe("María");
  });
});
