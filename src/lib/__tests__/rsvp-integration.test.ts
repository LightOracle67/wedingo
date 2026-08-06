import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeBatch } from "firebase/firestore";

let mockDocIdCounter = 0;

// Mock Firebase
vi.mock("firebase/firestore", () => ({
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({ count: 0 }) })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true, forEach: () => {} })),
  updateDoc: vi.fn(() => Promise.resolve()),
  increment: vi.fn((n: number) => n),
  onSnapshot: vi.fn(() => () => {}),
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
  rsvpResponseRef: vi.fn((_token: string, id: string) => ({ id, path: `rsvpResponses/${_token}/responses/${id}` })),
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
    act(() => { result.current.updateRsvpField("companionNames[0]", "Alice María Smith"); });
    act(() => { result.current.updateRsvpField("companionNames[1]", "Bob Carlos Jones"); });
    expect(result.current.rsvpForm.companionNames).toEqual(["Alice María Smith", "Bob Carlos Jones"]);
  });

  it("submits RSVP successfully", async () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    
    act(() => { result.current.updateRsvpField("guestName", "García Pérez López"); });
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
    
    act(() => { result.current.updateRsvpField("guestName", "García Pérez López"); });
    act(() => { result.current.updateRsvpField("attendance", "with"); });
    act(() => { result.current.updateRsvpField("companionCount", 2); });
    act(() => { result.current.updateRsvpField("companionNames[0]", "Alice María Smith"); });
    act(() => { result.current.updateRsvpField("companionNames[1]", "Bob Carlos Jones"); });
    act(() => { result.current.updateRsvpField("companionBirthDates", ["2000-01-01", "2000-01-01"]); });
    act(() => { result.current.updateRsvpField("companionAllergiesOther", ["", "alergia a mariscos"]); });
    act(() => { result.current.updateRsvpField("companionHealthConsents", [false, true]); });
    act(() => { result.current.updateRsvpField("privacyConsent", true); });
    act(() => { result.current.updateRsvpField("birthDate", "1990-01-01"); });
    act(() => { result.current.updateRsvpField("transportChoice", "0"); });
    act(() => { result.current.updateRsvpField("transportMode", "bus"); });
    act(() => { result.current.updateRsvpField("transportTime", "12:00"); });
    act(() => { result.current.updateRsvpField("transportPlace", "Plaza Mayor"); });
    act(() => { result.current.updateRsvpField("companionTransportChoices[0]", "own"); });
    act(() => { result.current.updateRsvpField("companionTransportModes[0]", "own"); });
    act(() => { result.current.updateRsvpField("companionTransportChoices[1]", "1"); });
    act(() => { result.current.updateRsvpField("companionTransportModes[1]", "taxi"); });
    act(() => { result.current.updateRsvpField("companionTransportTimes[1]", "14:30"); });
    act(() => { result.current.updateRsvpField("companionTransportPlaces[1]", "Estación Norte"); });

    const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => {
      await result.current.handleRsvpSubmit(event);
    });

    expect(writeBatch).toHaveBeenCalled();
    const batch = (writeBatch as any).mock.results[0]?.value;
    const payload = batch.set.mock.calls[0][1];
    expect(payload.rsvpType).toBe("main");
    expect(payload.companionCount).toBe(2);
    expect(payload.companionNames).toEqual(["Alice María Smith", "Bob Carlos Jones"]);
    expect(payload.attendance).toBe("yes");
    expect(payload.transportChoice).toBe("0");
    expect(payload.transportMode).toBe("bus");
    expect(payload.transportTime).toBe("12:00");
    expect(payload.transportPlace).toBe("Plaza Mayor");
    expect(payload.companionTransportChoices).toEqual(["own", "1"]);
    expect(payload.companionTransportModes).toEqual(["own", "taxi"]);
    expect(payload.companionTransportTimes).toEqual(["", "14:30"]);
    expect(payload.companionTransportPlaces).toEqual(["", "Estación Norte"]);
    expect(payload.companionAllergiesOther).toEqual(["", "alergia a mariscos"]);
    const compPayload = batch.set.mock.calls[1][1];
    expect(compPayload.transportChoice).toBe("own");
    expect(compPayload.transportMode).toBe("own");
    const compPayload2 = batch.set.mock.calls[2][1];
    expect(compPayload2.transportTime).toBe("14:30");
    expect(compPayload2.transportPlace).toBe("Estación Norte");
    expect(compPayload2.allergiesOther).toBe("alergia a mariscos");
    // 1 main + 2 companions = 3 set calls (el contador usa increment/update).
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
