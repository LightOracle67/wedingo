import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRsvp } from "../../hooks/useRsvp";

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(() => Promise.resolve({ id: "test-doc-id" })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
}));

vi.mock("../../lib/firebase", () => ({
  RSVP_COLLECTION_REF: "rsvpResponses",
  rsvpByInviteRef: vi.fn(() => "rsvpByInviteRef"),
}));

describe("useRsvp", () => {
  const setAdminMessage = vi.fn();
  const setAdminMessageType = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with empty form", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    expect(result.current.rsvpForm.guestName).toBe("");
    expect(result.current.rsvpForm.attendance).toBe("yes");
    expect(result.current.rsvpForm.attendees).toEqual([{ name: "", menu: "", allergies: [] }]);
    expect(result.current.rsvpEntries).toEqual([]);
    expect(result.current.hasSubmitted).toBe(false);
  });

  it("updates form field", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType));
    act(() => result.current.updateRsvpField("guestName", "Adrián"));
    expect(result.current.rsvpForm.guestName).toBe("Adrián");
  });

  it("resets attendees when attendance is no", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType));
    act(() => result.current.updateRsvpField("attendees", [{ name: "Juan", menu: "", allergies: [] }]));
    expect(result.current.rsvpForm.attendees).toHaveLength(1);
    act(() => result.current.updateRsvpField("attendance", "no"));
    expect(result.current.rsvpForm.attendance).toBe("no");
    expect(result.current.rsvpForm.attendees).toEqual([]);
  });
});
