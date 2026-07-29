import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeBatch } from "firebase/firestore";

let mockDocIdCounter = 0;

// Mock Firebase
vi.mock("firebase/firestore", () => ({
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true, forEach: () => {} })),
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  doc: vi.fn((_col?: unknown, id?: string) =>
    id ? { id } : { id: `auto-doc-${++mockDocIdCounter}` },
  ),
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

vi.mock("../../lib/date-utils", () => ({
  computeAge: vi.fn(() => 25),
}));

import { useRsvp } from "../../hooks/useRsvp";
import { renderHook, act } from "@testing-library/react";

describe("RSVP Integration", () => {
  const setAdminMessage = vi.fn();
  const setAdminMessageType = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with default empty form", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    expect(result.current.rsvpForm.guestName).toBe("");
    expect(result.current.rsvpForm.attendance).toBe("alone");
    expect(result.current.rsvpForm.companionCount).toBe(0);
    expect(result.current.rsvpForm.companionNames).toEqual([]);
    expect(result.current.rsvpForm.privacyConsent).toBe(false);
  });

  it("sets companion count and fills names", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => { result.current.updateRsvpField("companionCount", 2); });
    expect(result.current.rsvpForm.companionCount).toBe(2);
    expect(result.current.rsvpForm.companionNames).toHaveLength(2);
    act(() => { result.current.updateRsvpField("companionNames[0]", "Alice"); });
    act(() => { result.current.updateRsvpField("companionNames[1]", "Bob"); });
    expect(result.current.rsvpForm.companionNames).toEqual(["Alice", "Bob"]);
  });

  it("submits RSVP successfully", async () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    
    act(() => { result.current.updateRsvpField("guestName", "García"); });
    act(() => { result.current.updateRsvpField("privacyConsent", true); });
    act(() => { result.current.updateRsvpField("birthDate", "1990-01-01"); });

    const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => {
      await result.current.handleRsvpSubmit(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(writeBatch).toHaveBeenCalled();
    const batch = (writeBatch as any).mock.results[0]?.value;
    expect(batch.commit).toHaveBeenCalled();
  });

  it("submits with companions", async () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    
    act(() => { result.current.updateRsvpField("guestName", "García"); });
    act(() => { result.current.updateRsvpField("attendance", "with"); });
    act(() => { result.current.updateRsvpField("companionCount", 2); });
    act(() => { result.current.updateRsvpField("companionNames[0]", "Alice"); });
    act(() => { result.current.updateRsvpField("companionNames[1]", "Bob"); });
    act(() => { result.current.updateRsvpField("privacyConsent", true); });
    act(() => { result.current.updateRsvpField("birthDate", "1990-01-01"); });

    const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => {
      await result.current.handleRsvpSubmit(event);
    });

    expect(writeBatch).toHaveBeenCalled();
    const batch = (writeBatch as any).mock.results[0]?.value;
    const payload = batch.set.mock.calls[0][1];
    expect(payload.rsvpType).toBe("main");
    expect(payload.companionCount).toBe(2);
    expect(payload.companionNames).toEqual(["Alice", "Bob"]);
    expect(payload.attendance).toBe("yes");
    // 1 main + 2 companions
    expect(batch.set).toHaveBeenCalledTimes(3);
  });

  it("shows error when guestName is empty", async () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    
    await act(async () => {
      await result.current.handleRsvpSubmit(event);
    });

    expect(result.current.rsvpMessage).toBeTruthy();
  });

  it("resets companionCount when attendance changes to no", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => { result.current.updateRsvpField("attendance", "no"); });
    expect(result.current.rsvpForm.companionCount).toBe(0);
    expect(result.current.rsvpForm.companionNames).toEqual([]);
  });

  it("sets companionCount to 1 when changing to with", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => { result.current.updateRsvpField("attendance", "no"); });
    expect(result.current.rsvpForm.companionCount).toBe(0);
    act(() => { result.current.updateRsvpField("attendance", "with"); });
    expect(result.current.rsvpForm.companionCount).toBe(1);
  });
});
