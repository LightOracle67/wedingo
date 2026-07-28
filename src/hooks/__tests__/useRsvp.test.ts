import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockAddDoc = vi.hoisted(() => vi.fn(() => Promise.resolve({ id: "test-doc-id" })));
const mockDeleteDoc = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockGetDocs = vi.hoisted(() => vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })));
const mockDoc = vi.hoisted(() => vi.fn(() => "doc-ref"));
const mockEncrypt = vi.hoisted(() => vi.fn((v: string) => Promise.resolve(v)));
const mockDecrypt = vi.hoisted(() => vi.fn((v: string) => Promise.resolve(v)));
const mockComputeAge = vi.hoisted(() => vi.fn(() => 25));
const mockParseDietaryInfo = vi.hoisted(() => vi.fn(() => ({ mealChoice: "", dietarySelection: [], dietaryOther: "" })));

vi.mock("firebase/firestore", () => ({
  addDoc: mockAddDoc,
  deleteDoc: mockDeleteDoc,
  getDocs: mockGetDocs,
  doc: mockDoc,
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
}));

vi.mock("../../lib/firebase", () => ({
  RSVP_COLLECTION_REF: "rsvpResponses",
  rsvpByInviteRef: vi.fn(() => "rsvpByInviteRef"),
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

import { useRsvp } from "../useRsvp";

function createMockDoc(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      guestName: "",
      attendance: "no",
      dietaryInfo: "",
      attendees: [],
      companions: undefined,
      mealChoice: "",
      guestNames: "",
      note: "",
      submittedAt: new Date().toISOString(),
      ...overrides,
    }),
  };
}

describe("useRsvp", () => {
  const setAdminMessage = vi.fn();
  const setAdminMessageType = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it("initializes with default form state", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    expect(result.current.rsvpForm.guestName).toBe("");
    expect(result.current.rsvpForm.attendance).toBe("yes");
    expect(result.current.rsvpForm.attendees).toEqual([{ name: "", menu: "", allergies: [] as string[] }]);
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
    act(() => result.current.updateRsvpField("attendees", [{ name: "Juan", menu: "", allergies: [] as string[] }]));
    expect(result.current.rsvpForm.attendees).toHaveLength(1);
    act(() => result.current.updateRsvpField("attendance", "no"));
    expect(result.current.rsvpForm.attendance).toBe("no");
    expect(result.current.rsvpForm.attendees).toEqual([]);
  });

  it("adds an attendee via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => {
      const current = result.current.rsvpForm.attendees;
      result.current.updateRsvpField("attendees", [...current, { name: "María", menu: "", allergies: [] as string[] }]);
    });
    expect(result.current.rsvpForm.attendees.length).toBe(2);
    expect(result.current.rsvpForm.attendees[1].name).toBe("María");
  });

  it("removes an attendee via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => {
      result.current.updateRsvpField("attendees", [
        { name: "Juan", menu: "", allergies: [] as string[] },
        { name: "María", menu: "", allergies: [] as string[] },
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

  it("clears guestName prefill ref when guestName field is updated", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("guestName", "Alice"));
    act(() => result.current.updateRsvpField("guestName", "Bob"));
    expect(result.current.rsvpForm.guestName).toBe("Bob");
  });

  it("sets attendance back to yes with a default attendee when switching from no to yes", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("attendance", "no"));
    expect(result.current.rsvpForm.attendees).toEqual([]);
    act(() => result.current.updateRsvpField("attendance", "yes"));
    expect(result.current.rsvpForm.attendees).toEqual([{ name: "", menu: "", allergies: [] as string[] }]);
  });

  it("preserves existing attendees when switching from yes to yes", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => {
      result.current.updateRsvpField("attendees", [
        { name: "Alice", menu: "carne", allergies: [] },
      ]);
    });
    act(() => result.current.updateRsvpField("attendance", "yes"));
    expect(result.current.rsvpForm.attendees).toHaveLength(1);
    expect(result.current.rsvpForm.attendees[0].name).toBe("Alice");
  });

  describe("validation", () => {
    it("returns error when guestName is empty on submit", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });
      expect(result.current.rsvpMessage).toMatch(/nameRequired/i);
    });
  });

  describe("handleDietaryToggle", () => {
    it("is a no-op function", () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      const before = result.current.rsvpForm;
      act(() => result.current.handleDietaryToggle());
      expect(result.current.rsvpForm).toEqual(before);
    });
  });

  function setupFormWithAttendees(result: ReturnType<typeof renderHook<ReturnType<typeof useRsvp>>>["result"]) {
    act(() => result.current.updateRsvpField("guestName", "Alice"));
    act(() => result.current.updateRsvpField("attendees", [{ name: "Alice", menu: "", allergies: [] }]));
    act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
    act(() => result.current.updateRsvpField("privacyConsent", true));
  }

  describe("handleRsvpSubmit", () => {
    it("calls preventDefault on the event", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      const preventDefault = vi.fn();
      setupFormWithAttendees(result);
      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault } as any);
      });
      expect(preventDefault).toHaveBeenCalled();
    });

    it("submits valid RSVP data successfully", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      setupFormWithAttendees(result);
      act(() => result.current.updateRsvpField("healthConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalled();
      });
      expect(result.current.hasSubmitted).toBe(true);
      expect(result.current.rsvpForm.guestName).toBe("");
    });

    it("submits with menuEnabled requiring menu selection", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, true));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("attendees", [{ name: "Alice", menu: "", allergies: [] }]));
      act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
      act(() => result.current.updateRsvpField("privacyConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.rsvpMessage).toMatch(/menuHeadcountRequired/i);
      expect(mockAddDoc).not.toHaveBeenCalled();
    });

    it("handles submission error gracefully", async () => {
      mockAddDoc.mockRejectedValueOnce(new Error("Firestore error"));
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      setupFormWithAttendees(result);
      act(() => result.current.updateRsvpField("healthConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(result.current.isRsvpSubmitting).toBe(false);
      });
    });

    it("returns error for missing privacy consent", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("attendees", [{ name: "Alice", menu: "", allergies: [] }]));
      act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.rsvpMessage).toMatch(/privacyRequired/i);
    });

    it("returns error for missing birthDate", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      act(() => result.current.updateRsvpField("guestName", "Alice"));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.rsvpMessage).toMatch(/birthDateRequired/i);
    });

    it("returns error for attendee with empty name", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("attendees", [{ name: "", menu: "", allergies: [] }]));
      act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
      act(() => result.current.updateRsvpField("privacyConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.rsvpMessage).toMatch(/nameRequired/i);
    });

    it("returns error for age under 14 without parentalConsent", async () => {
      mockComputeAge.mockReturnValue(12);
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("attendees", [{ name: "Alice", menu: "", allergies: [] }]));
      act(() => result.current.updateRsvpField("birthDate", "2012-01-01"));
      act(() => result.current.updateRsvpField("privacyConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.rsvpMessage).toMatch(/ageUnder14/i);
    });

    it("returns error for healthConsent when attendees have allergies", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("attendees", [{ name: "Alice", menu: "", allergies: ["gluten"] }]));
      act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
      act(() => result.current.updateRsvpField("privacyConsent", true));
      act(() => result.current.updateRsvpField("parentalConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.rsvpMessage).toMatch(/healthConsentRequired/i);
    });
  });

  describe("handleDeleteRsvp", () => {
    it("does nothing when alreadySubmittedEntry is null", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      await act(async () => {
        await result.current.handleDeleteRsvp();
      });
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it("deletes the submitted entry when confirmed", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: "entry-1",
          data: () => ({
            guestName: "Alice",
            attendance: "yes",
            attendees: [{ name: "Alice", menu: "", allergies: [] }],
            submittedAt: new Date().toISOString(),
            dietaryInfo: "",
            companions: 1,
          }),
        }],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await act(async () => {
        result.current.updateRsvpField("guestName", "Alice");
      });

      await waitFor(() => {
        expect(result.current.alreadySubmittedEntry).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleDeleteRsvp();
      });

      expect(mockDeleteDoc).toHaveBeenCalled();
      expect(result.current.hasSubmitted).toBe(false);
    });

    it("does not delete when confirm is cancelled", async () => {
      window.confirm = vi.fn(() => false);
      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: "entry-1",
          data: () => ({
            guestName: "Bob",
            attendance: "yes",
            attendees: [{ name: "Bob", menu: "", allergies: [] }],
            submittedAt: new Date().toISOString(),
            dietaryInfo: "",
            companions: 1,
          }),
        }],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await act(async () => {
        result.current.updateRsvpField("guestName", "Bob");
      });

      await waitFor(() => {
        expect(result.current.alreadySubmittedEntry).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleDeleteRsvp();
      });

      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it("handles delete error gracefully", async () => {
      mockDeleteDoc.mockRejectedValueOnce(new Error("Delete error"));
      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: "entry-1",
          data: () => ({
            guestName: "Charlie",
            attendance: "no",
            attendees: [],
            submittedAt: new Date().toISOString(),
            dietaryInfo: "",
            companions: 0,
          }),
        }],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await act(async () => {
        result.current.updateRsvpField("guestName", "Charlie");
      });

      await waitFor(() => {
        expect(result.current.alreadySubmittedEntry).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleDeleteRsvp();
      });

      expect(result.current.rsvpMessage).toMatch(/withdrawError/i);
    });
  });

  describe("handleClearRsvpEntries", () => {
    it("clears all entries and sets admin message", async () => {
      // hydrate effect consumes first mockResolvedValue, clear consumes second
      mockGetDocs
        .mockResolvedValueOnce({ docs: [], forEach: vi.fn() })
        .mockResolvedValueOnce({
          docs: [{ id: "e1", ref: "ref1", data: () => ({}) }],
          forEach: vi.fn(),
        });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await act(async () => {
        await result.current.handleClearRsvpEntries();
      });

      expect(mockGetDocs).toHaveBeenCalledTimes(2);
      expect(mockDeleteDoc).toHaveBeenCalledWith("ref1");
      expect(setAdminMessage).toHaveBeenCalled();
      expect(setAdminMessageType).toHaveBeenCalledWith("success");
    });

    it("does not clear when confirm is cancelled", async () => {
      window.confirm = vi.fn(() => false);
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await act(async () => {
        await result.current.handleClearRsvpEntries();
      });

      expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    it("handles clear error gracefully", async () => {
      mockGetDocs
        .mockResolvedValueOnce({ docs: [], forEach: vi.fn() })
        .mockRejectedValueOnce(new Error("Fetch error"));
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await act(async () => {
        await result.current.handleClearRsvpEntries();
      });

      expect(setAdminMessageType).toHaveBeenCalledWith("error");
    });
  });

  describe("hydration", () => {
    it("loads rsvp entries on mount", async () => {
      const entry = createMockDoc("entry-1", {
        guestName: "Alice",
        attendance: "yes",
        attendees: [{ name: "Alice", menu: "carne", allergies: [] }],
      });
      mockGetDocs.mockResolvedValueOnce({
        docs: [entry],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await waitFor(() => {
        expect(result.current.rsvpEntries).toHaveLength(1);
      });
      expect(result.current.rsvpEntries[0].guestName).toBe("Alice");
    });

    it("loads multiple entries and sorts by submittedAt descending", async () => {
      const entry1 = createMockDoc("entry-1", {
        guestName: "Old",
        attendance: "yes",
        attendees: [{ name: "Old", menu: "", allergies: [] }],
        submittedAt: new Date("2024-01-01").toISOString(),
      });
      const entry2 = createMockDoc("entry-2", {
        guestName: "New",
        attendance: "yes",
        attendees: [{ name: "New", menu: "", allergies: [] }],
        submittedAt: new Date("2025-01-01").toISOString(),
      });
      mockGetDocs.mockResolvedValueOnce({
        docs: [entry1, entry2],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      await waitFor(() => {
        expect(result.current.rsvpEntries).toHaveLength(2);
      });
      expect(result.current.rsvpEntries[0].guestName).toBe("New");
      expect(result.current.rsvpEntries[1].guestName).toBe("Old");
    });

    it("handles hydrate error gracefully", async () => {
      mockGetDocs.mockRejectedValueOnce(new Error("Hydrate error"));
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await waitFor(() => {
        expect(result.current.rsvpEntries).toEqual([]);
      });
    });

    it("converts legacy entries using legacyToAttendees", async () => {
      mockParseDietaryInfo.mockReturnValueOnce({ mealChoice: "carne", dietarySelection: [], dietaryOther: "" });
      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: "legacy-1",
          data: () => ({
            guestName: "Alice",
            attendance: "yes",
            mealChoice: "carne",
            guestNames: "Bob, Charlie",
            dietaryInfo: "encrypted-diet",
            companions: 3,
            submittedAt: { seconds: 1000000 },
          }),
        }],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await waitFor(() => {
        expect(result.current.rsvpEntries).toHaveLength(1);
      });
      expect(result.current.rsvpEntries[0].attendees).toHaveLength(3);
    });

    it("legacyToAttendees includes dietaryOther when not in selection", async () => {
      mockParseDietaryInfo.mockReturnValueOnce({ mealChoice: "carne", dietarySelection: ["sin gluten"], dietaryOther: "alergia frutos secos" });
      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: "legacy-2",
          data: () => ({
            guestName: "Bob",
            attendance: "yes",
            mealChoice: "carne",
            guestNames: "",
            dietaryInfo: "encrypted-diet",
            companions: 1,
            submittedAt: { seconds: 2000000 },
          }),
        }],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      await waitFor(() => {
        expect(result.current.rsvpEntries).toHaveLength(1);
      });
      const attendee = result.current.rsvpEntries[0].attendees[0];
      expect(attendee.allergies).toContain("alergia frutos secos");
    });
  });

  describe("alreadySubmittedEntry matching", () => {
    it("prefills form when guestName matches an existing entry", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: "entry-1",
          data: () => ({
            guestName: "Alice",
            attendance: "yes",
            attendees: [{ name: "Alice", menu: "carne", allergies: [] }],
            submittedAt: new Date().toISOString(),
            dietaryInfo: "",
            companions: 1,
          }),
        }],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await act(async () => {
        result.current.updateRsvpField("guestName", "Alice");
      });

      await waitFor(() => {
        expect(result.current.alreadySubmittedEntry).not.toBeNull();
      });
      expect(result.current.alreadySubmittedEntry?.guestName).toBe("Alice");
    });

    it("re-matches alreadySubmittedEntry on subsequent same-name input", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: "entry-1",
          data: () => ({
            guestName: "Alice",
            attendance: "yes",
            attendees: [{ name: "Alice", menu: "carne", allergies: [] }],
            submittedAt: new Date().toISOString(),
            dietaryInfo: "",
            companions: 1,
          }),
        }],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      await act(async () => {
        result.current.updateRsvpField("guestName", "Alice");
      });
      await waitFor(() => {
        expect(result.current.alreadySubmittedEntry).not.toBeNull();
      });
      await act(async () => {
        result.current.updateRsvpField("guestName", "Alice");
      });
      expect(result.current.alreadySubmittedEntry?.id).toBe("entry-1");
    });

    it("resets alreadySubmittedEntry when guestName does not match", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: "entry-1",
          data: () => ({
            guestName: "Alice",
            attendance: "yes",
            attendees: [],
            submittedAt: new Date().toISOString(),
            dietaryInfo: "",
            companions: 0,
          }),
        }],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      await act(async () => {
        result.current.updateRsvpField("guestName", "Bob");
      });

      expect(result.current.alreadySubmittedEntry).toBeNull();
    });

    it("clears alreadySubmittedEntry when guestName is empty", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));

      act(() => result.current.updateRsvpField("guestName", ""));
      expect(result.current.alreadySubmittedEntry).toBeNull();
    });
  });

  describe("setRsvpMessage and feedbackMessage", () => {
    it("displays rsvpMessage after successful submission", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      act(() => result.current.setRsvpMessage("Custom message"));
      expect(result.current.rsvpMessage).toBe("Custom message");
    });
  });
});
