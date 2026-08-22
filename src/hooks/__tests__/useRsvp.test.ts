import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

let mockDocIdCounter = 0;
const mockDeleteDoc = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockGetDocs = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ docs: [] as Array<{ id: string; ref?: unknown; data: () => any }>, forEach: vi.fn() })),
);
const mockDoc = vi.hoisted(() =>
  vi.fn((_col?: unknown, id?: string) => (id ? { id } : { id: `auto-doc-${++mockDocIdCounter}` })),
);
const mockWriteBatch = vi.hoisted(() =>
  vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
);
const mockGetDoc = vi.hoisted(() => vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({ count: 0 }) })));
const mockSetDoc = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockEncrypt = vi.hoisted(() => vi.fn((v: string) => Promise.resolve(v)));
const mockDecrypt = vi.hoisted(() => vi.fn((v: string) => Promise.resolve(v)));
const mockComputeAge = vi.hoisted(() => vi.fn(() => 25));
const mockParseDietaryInfo = vi.hoisted(() =>
  vi.fn(() => ({ mealChoice: "", dietarySelection: [] as string[], dietaryOther: "" })),
);
type SnapshotCb = (snap: unknown) => void;
const mockOnSnapshot = vi.hoisted(() => vi.fn((_q: unknown, _cb?: SnapshotCb) => () => {}));

vi.mock("firebase/firestore", () => ({
  writeBatch: mockWriteBatch,
  deleteDoc: mockDeleteDoc,
  getDocs: mockGetDocs,
  doc: mockDoc,
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  increment: vi.fn((n: number) => n),
  updateDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: mockOnSnapshot,
}));

vi.mock("../../lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("../../lib/firebase", () => ({
  db: {},
  RSVP_COLLECTION_REF: "rsvpResponses",
  rsvpByInviteRef: vi.fn(() => "rsvpByInviteRef"),
  rsvpResponseRef: vi.fn((_token: string, id: string) => ({ id, path: `rsvpResponses/${_token}/responses/${id}` })),
}));

vi.mock("../../lib/crypto-utils", () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt,
}));

vi.mock("../../lib/date-utils", () => ({
  computeAge: mockComputeAge,
}));

vi.mock("../../lib/rsvp-utils", () => ({
  DIETARY_OPTIONS: [],
  parseDietaryInfo: mockParseDietaryInfo,
}));

// Mock de storage: sin caché real para mantener los tests deterministas.
const mockSafeGetItem = vi.hoisted(() => vi.fn(() => null));
vi.mock("../../lib/storage", () => ({
  safeGetItem: mockSafeGetItem,
  safeSetItem: vi.fn(),
}));

import { useRsvp } from "../useRsvp";

describe("useRsvp", () => {
  const setAdminMessage = vi.fn();
  const setAdminMessageType = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockDocIdCounter = 0;
    mockDeleteDoc.mockResolvedValue(undefined);
    mockGetDocs.mockResolvedValue({ docs: [], forEach: vi.fn() });
    mockSafeGetItem.mockImplementation(() => null);
    mockDoc.mockImplementation((_col?: unknown, id?: string) =>
      id ? { id } : { id: `auto-doc-${++mockDocIdCounter}` },
    );
    mockOnSnapshot.mockClear();
    mockOnSnapshot.mockImplementation(() => () => {});
    mockWriteBatch.mockReturnValue({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve()),
    });
    mockEncrypt.mockImplementation((v: string) => Promise.resolve(v));
    mockDecrypt.mockImplementation((v: string) => Promise.resolve(v));
    mockComputeAge.mockReturnValue(25);
    mockParseDietaryInfo.mockReturnValue({ mealChoice: "", dietarySelection: [], dietaryOther: "" });
    window.confirm = vi.fn(() => true);
  });

  it("initializes with default form state", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    expect(result.current.rsvpForm.guestName).toBe("");
    expect(result.current.rsvpForm.attendance).toBe("alone");
    expect(result.current.rsvpForm.companionCount).toBe(0);
    expect(result.current.rsvpForm.companionNames).toEqual([]);
        expect(result.current.rsvpForm.companionAllergies).toEqual([]);
    expect(result.current.rsvpForm.menuSelection).toBe("");
    expect(result.current.rsvpForm.allergies).toEqual([]);
    expect(result.current.rsvpForm.privacyConsent).toBe(false);
    expect(result.current.rsvpEntries).toEqual([]);
    expect(result.current.hasSubmitted).toBe(false);
  });

  it("updates a form field via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("guestName", "Adrián"));
    expect(result.current.rsvpForm.guestName).toBe("Adrián");
  });

  it("sets companionCount and resizes companionNames", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("companionCount", 3));
    expect(result.current.rsvpForm.companionCount).toBe(3);
    expect(result.current.rsvpForm.companionNames).toHaveLength(3);
  });

  it("sets individual companion name via companionNames[N]", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("companionCount", 2));
    act(() => result.current.updateRsvpField("companionNames[0]", "Alice María Smith"));
    act(() => result.current.updateRsvpField("companionNames[1]", "Bob Carlos Jones"));
    expect(result.current.rsvpForm.companionNames).toEqual(["Alice María Smith", "Bob Carlos Jones"]);
  });

  it("trims companionNames when companionCount decreases", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("companionCount", 3));
    act(() => result.current.updateRsvpField("companionNames[0]", "Alice María Smith"));
    act(() => result.current.updateRsvpField("companionNames[1]", "Bob Carlos Jones"));
    act(() => result.current.updateRsvpField("companionNames[2]", "Charlie Brown Smith"));
    act(() => result.current.updateRsvpField("companionCount", 2));
    expect(result.current.rsvpForm.companionNames).toEqual(["Alice María Smith", "Bob Carlos Jones"]);
  });

  it("clamps companionCount between 0 and 10", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("companionCount", 15));
    expect(result.current.rsvpForm.companionCount).toBe(10);
    act(() => result.current.updateRsvpField("companionCount", -1));
    expect(result.current.rsvpForm.companionCount).toBe(0);
  });

  it("resets companionCount to 0 when attendance is set to alone", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("companionCount", 3));
    act(() => result.current.updateRsvpField("attendance", "alone"));
    expect(result.current.rsvpForm.attendance).toBe("alone");
    expect(result.current.rsvpForm.companionCount).toBe(0);
  });

  it("resets companionCount to 0 when attendance is set to no", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("companionCount", 3));
    act(() => result.current.updateRsvpField("attendance", "no"));
    expect(result.current.rsvpForm.attendance).toBe("no");
    expect(result.current.rsvpForm.companionCount).toBe(0);
    expect(result.current.rsvpForm.companionNames).toEqual([]);
  });

  it("sets companionCount to 1 when switching from no/alone to with", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("attendance", "no"));
    act(() => result.current.updateRsvpField("attendance", "with"));
    expect(result.current.rsvpForm.attendance).toBe("with");
    expect(result.current.rsvpForm.companionCount).toBe(1);
  });

  it("preserves companionCount when switching from with to with", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("companionCount", 3));
    act(() => result.current.updateRsvpField("attendance", "with"));
    expect(result.current.rsvpForm.companionCount).toBe(3);
  });

  it("clears guestName prefill ref when guestName field is updated", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("guestName", "Alice María Smith"));
    act(() => result.current.updateRsvpField("guestName", "Bob Carlos Jones"));
    expect(result.current.rsvpForm.guestName).toBe("Bob Carlos Jones");
  });

  it("updates allergies via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("allergies", ["sin gluten"]));
    expect(result.current.rsvpForm.allergies).toEqual(["sin gluten"]);
  });

      it("handles companionAllergies[N] field updates", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    act(() => result.current.updateRsvpField("companionCount", 2));
    act(() => result.current.updateRsvpField("companionAllergies[0]", ["sin gluten"]));
    act(() => result.current.updateRsvpField("companionAllergies[1]", ["sin lactosa", "alergia a frutos secos"]));
    expect(result.current.rsvpForm.companionAllergies[0]).toEqual(["sin gluten"]);
    expect(result.current.rsvpForm.companionAllergies[1]).toEqual(["sin lactosa", "alergia a frutos secos"]);
  });

  });
