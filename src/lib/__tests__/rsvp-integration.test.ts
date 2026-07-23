import { describe, it, expect, vi, beforeEach } from "vitest";
import { addDoc, serverTimestamp } from "firebase/firestore";

// Mock Firebase
vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(() => Promise.resolve({ id: "rsvp-123" })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true, forEach: () => {} })),
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  doc: vi.fn(() => "doc-ref"),
  collection: vi.fn(() => "collection-ref"),
  query: vi.fn(() => "query-ref"),
  where: vi.fn(() => "where-ref"),
  orderBy: vi.fn(() => "order-ref"),
}));

vi.mock("../../lib/firebase", () => ({
  RSVP_COLLECTION_REF: "rsvpResponses",
  rsvpByInviteRef: vi.fn(() => "rsvpByInviteRef"),
  db: {},
  invitationDocRef: vi.fn(() => "invitation-ref"),
  INVITATIONS_COLLECTION_REF: "invitations",
}));

vi.mock("../../lib/crypto-utils", () => ({
  encrypt: vi.fn((text) => Promise.resolve(`encrypted-${text}`)),
  decrypt: vi.fn((text) => Promise.resolve(text.replace("encrypted-", ""))),
}));

import { useRsvp } from "../../hooks/useRsvp";
import { renderHook, act } from "@testing-library/react";

describe("RSVP Integration", () => {
  const setAdminMessage = vi.fn();
  const setAdminMessageType = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty form and one attendee slot", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    expect(result.current.rsvpForm.guestName).toBe("");
    expect(result.current.rsvpForm.attendance).toBe("yes");
    expect(result.current.rsvpForm.attendees).toHaveLength(1);
    expect(result.current.rsvpForm.attendees[0].name).toBe("");
    expect(result.current.rsvpForm.attendees[0].menu).toBe("");
  });

  it("updates attendee name", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => {
      const attendees = [...result.current.rsvpForm.attendees];
      attendees[0].name = "Juan";
      result.current.updateRsvpField("attendees", attendees);
    });
    expect(result.current.rsvpForm.attendees[0].name).toBe("Juan");
  });

  it("adds a new attendee", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => {
      const attendees = [...result.current.rsvpForm.attendees, { name: "", menu: "", allergies: [] }];
      result.current.updateRsvpField("attendees", attendees);
    });
    expect(result.current.rsvpForm.attendees).toHaveLength(2);
  });

  it("removes an attendee", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => {
      const attendees = [...result.current.rsvpForm.attendees, { name: "Ana", menu: "", allergies: [] }];
      result.current.updateRsvpField("attendees", attendees);
    });
    expect(result.current.rsvpForm.attendees).toHaveLength(2);
    act(() => {
      const remaining = result.current.rsvpForm.attendees.filter((_: any, i: number) => i !== 1);
      result.current.updateRsvpField("attendees", remaining);
    });
    expect(result.current.rsvpForm.attendees).toHaveLength(1);
  });

  it("submits RSVP successfully", async () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    
    act(() => { result.current.updateRsvpField("guestName", "García"); });
    act(() => {
      const attendees = [{ name: "Juan", menu: "", allergies: [] }];
      result.current.updateRsvpField("attendees", attendees);
    });
    act(() => { result.current.updateRsvpField("privacyConsent", true); });
    act(() => { result.current.updateRsvpField("birthDate", "1990-01-01"); });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
      await result.current.handleRsvpSubmit(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalled();
  });

  it("shows error when guestName is empty", async () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    const event = { preventDefault: vi.fn() };
    
    await act(async () => {
      await result.current.handleRsvpSubmit(event);
    });

    expect(result.current.rsvpMessage).toBeTruthy();
  });

  it("resets attendees when attendance changes to no", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => { result.current.updateRsvpField("attendance", "no"); });
    expect(result.current.rsvpForm.attendees).toEqual([]);
  });

  it("adds one attendee when changing back to yes", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => { result.current.updateRsvpField("attendance", "no"); });
    expect(result.current.rsvpForm.attendees).toEqual([]);
    act(() => { result.current.updateRsvpField("attendance", "yes"); });
    expect(result.current.rsvpForm.attendees).toHaveLength(1);
  });
});
