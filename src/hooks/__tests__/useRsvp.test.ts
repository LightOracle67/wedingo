import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

let mockDocIdCounter = 0;
const mockDeleteDoc = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockGetDocs = vi.hoisted(() => vi.fn(() => Promise.resolve({ docs: [] as Array<{ id: string; ref?: unknown; data: () => any }>, forEach: vi.fn() })));
const mockDoc = vi.hoisted(() => vi.fn((_col?: unknown, id?: string) =>
  id ? { id } : { id: `auto-doc-${++mockDocIdCounter}` },
));
const mockWriteBatch = vi.hoisted(() => vi.fn(() => ({
  set: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
})));
const mockEncrypt = vi.hoisted(() => vi.fn((v: string) => Promise.resolve(v)));
const mockDecrypt = vi.hoisted(() => vi.fn((v: string) => Promise.resolve(v)));
const mockComputeAge = vi.hoisted(() => vi.fn(() => 25));
const mockParseDietaryInfo = vi.hoisted(() => vi.fn(() => ({ mealChoice: "", dietarySelection: [] as string[], dietaryOther: "" })));

vi.mock("firebase/firestore", () => ({
  writeBatch: mockWriteBatch,
  deleteDoc: mockDeleteDoc,
  getDocs: mockGetDocs,
  doc: mockDoc,
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  getDoc: vi.fn(),
}));

vi.mock("../../lib/firebase", () => ({
  db: {},
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
      companionCount: 0,
      companionNames: [],
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
    vi.resetAllMocks();
    mockDocIdCounter = 0;
    mockDeleteDoc.mockResolvedValue(undefined);
    mockGetDocs.mockResolvedValue({ docs: [], forEach: vi.fn() });
    mockDoc.mockImplementation((_col?: unknown, id?: string) =>
      id ? { id } : { id: `auto-doc-${++mockDocIdCounter}` },
    );
    mockWriteBatch.mockReturnValue({
      set: vi.fn(),
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
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    expect(result.current.rsvpForm.guestName).toBe("");
    expect(result.current.rsvpForm.attendance).toBe("alone");
    expect(result.current.rsvpForm.companionCount).toBe(0);
    expect(result.current.rsvpForm.companionNames).toEqual([]);
    expect(result.current.rsvpForm.companionMenus).toEqual([]);
    expect(result.current.rsvpForm.companionAllergies).toEqual([]);
    expect(result.current.rsvpForm.menuSelection).toBe("");
    expect(result.current.rsvpForm.allergies).toEqual([]);
    expect(result.current.rsvpForm.privacyConsent).toBe(false);
    expect(result.current.rsvpEntries).toEqual([]);
    expect(result.current.hasSubmitted).toBe(false);
  });

  it("updates a form field via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("guestName", "Adrián"));
    expect(result.current.rsvpForm.guestName).toBe("Adrián");
  });

  it("sets companionCount and resizes companionNames", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 3));
    expect(result.current.rsvpForm.companionCount).toBe(3);
    expect(result.current.rsvpForm.companionNames).toHaveLength(3);
  });

  it("sets individual companion name via companionNames[N]", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 2));
    act(() => result.current.updateRsvpField("companionNames[0]", "Alice"));
    act(() => result.current.updateRsvpField("companionNames[1]", "Bob"));
    expect(result.current.rsvpForm.companionNames).toEqual(["Alice", "Bob"]);
  });

  it("trims companionNames when companionCount decreases", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 3));
    act(() => result.current.updateRsvpField("companionNames[0]", "Alice"));
    act(() => result.current.updateRsvpField("companionNames[1]", "Bob"));
    act(() => result.current.updateRsvpField("companionNames[2]", "Charlie"));
    act(() => result.current.updateRsvpField("companionCount", 2));
    expect(result.current.rsvpForm.companionNames).toEqual(["Alice", "Bob"]);
  });

  it("clamps companionCount between 0 and 10", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 15));
    expect(result.current.rsvpForm.companionCount).toBe(10);
    act(() => result.current.updateRsvpField("companionCount", -1));
    expect(result.current.rsvpForm.companionCount).toBe(0);
  });

  it("resets companionCount to 0 when attendance is set to alone", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 3));
    act(() => result.current.updateRsvpField("attendance", "alone"));
    expect(result.current.rsvpForm.attendance).toBe("alone");
    expect(result.current.rsvpForm.companionCount).toBe(0);
  });

  it("resets companionCount to 0 when attendance is set to no", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 3));
    act(() => result.current.updateRsvpField("attendance", "no"));
    expect(result.current.rsvpForm.attendance).toBe("no");
    expect(result.current.rsvpForm.companionCount).toBe(0);
    expect(result.current.rsvpForm.companionNames).toEqual([]);
  });

  it("sets companionCount to 1 when switching from no/alone to with", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("attendance", "no"));
    act(() => result.current.updateRsvpField("attendance", "with"));
    expect(result.current.rsvpForm.attendance).toBe("with");
    expect(result.current.rsvpForm.companionCount).toBe(1);
  });

  it("preserves companionCount when switching from with to with", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 3));
    act(() => result.current.updateRsvpField("attendance", "with"));
    expect(result.current.rsvpForm.companionCount).toBe(3);
  });

  it("clears guestName prefill ref when guestName field is updated", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("guestName", "Alice"));
    act(() => result.current.updateRsvpField("guestName", "Bob"));
    expect(result.current.rsvpForm.guestName).toBe("Bob");
  });

  it("updates allergies via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("allergies", ["sin gluten"]));
    expect(result.current.rsvpForm.allergies).toEqual(["sin gluten"]);
  });

  it("resizes companionMenus and companionAllergies when companionCount changes", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 3));
    expect(result.current.rsvpForm.companionMenus).toHaveLength(3);
    expect(result.current.rsvpForm.companionAllergies).toHaveLength(3);
    expect(result.current.rsvpForm.companionMenus).toEqual(["", "", ""]);
    expect(result.current.rsvpForm.companionAllergies).toEqual([[], [], []]);
  });

  it("handles companionMenuss[N] field updates", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 2));
    act(() => result.current.updateRsvpField("companionMenus[0]", "carne"));
    act(() => result.current.updateRsvpField("companionMenus[1]", "pescado"));
    expect(result.current.rsvpForm.companionMenus).toEqual(["carne", "pescado"]);
  });

  it("handles companionAllergies[N] field updates", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 2));
    act(() => result.current.updateRsvpField("companionAllergies[0]", ["sin gluten"]));
    act(() => result.current.updateRsvpField("companionAllergies[1]", ["sin lactosa", "alergia a frutos secos"]));
    expect(result.current.rsvpForm.companionAllergies[0]).toEqual(["sin gluten"]);
    expect(result.current.rsvpForm.companionAllergies[1]).toEqual(["sin lactosa", "alergia a frutos secos"]);
  });

  it("trims companionMenus and companionAllergies when companionCount decreases", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("companionCount", 3));
    act(() => result.current.updateRsvpField("companionMenus[0]", "carne"));
    act(() => result.current.updateRsvpField("companionMenus[1]", "pescado"));
    act(() => result.current.updateRsvpField("companionMenus[2]", "vegano"));
    act(() => result.current.updateRsvpField("companionAllergies[0]", ["sin gluten"]));
    act(() => result.current.updateRsvpField("companionCount", 2));
    expect(result.current.rsvpForm.companionMenus).toEqual(["carne", "pescado"]);
    expect(result.current.rsvpForm.companionAllergies).toEqual([["sin gluten"], []]);
  });

  it("submits companionMenus and companionAllergies with payload", async () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("guestName", "Alice"));
    act(() => result.current.updateRsvpField("attendance", "with"));
    act(() => result.current.updateRsvpField("companionCount", 2));
    act(() => result.current.updateRsvpField("companionNames[0]", "Bob"));
    act(() => result.current.updateRsvpField("companionNames[1]", "Charlie"));
    act(() => result.current.updateRsvpField("companionMenus[0]", "carne"));
    act(() => result.current.updateRsvpField("companionMenus[1]", "pescado"));
    act(() => result.current.updateRsvpField("companionAllergies[0]", ["sin gluten"]));
    act(() => result.current.updateRsvpField("companionAllergiesOther", ["", ""]));
    act(() => result.current.updateRsvpField("companionHealthConsents", [true, false]));
    act(() => result.current.updateRsvpField("companionBirthDates", ["2000-01-01", "2010-06-15"]));
    act(() => result.current.updateRsvpField("companionParentalConsents", [false, true]));
    act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
    act(() => result.current.updateRsvpField("privacyConsent", true));

    await act(async () => {
      result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
    });

    await waitFor(() => {
      expect(mockWriteBatch).toHaveBeenCalled();
    });
    const batch = mockWriteBatch.mock.results[0]?.value;
    // Main guest doc data is first set call
    const payload = batch.set.mock.calls[0][1];
    expect(payload.rsvpType).toBe("main");
    expect(payload.companionMenus).toEqual(["carne", "pescado"]);
    // Companion 0 allergies, companion 1 empty
    const comp0Data = batch.set.mock.calls[1][1];
    const comp1Data = batch.set.mock.calls[2][1];
    expect(comp0Data.rsvpType).toBe("companion");
    expect(comp0Data.guestName).toBe("Bob");
    expect(comp0Data.dietaryInfo).toContain("sin gluten");
    expect(comp0Data.birthDate).toBe("2000-01-01");
    expect(comp0Data.healthConsent).toBe(true);
    expect(comp1Data.rsvpType).toBe("companion");
    expect(comp1Data.guestName).toBe("Charlie");
    expect(comp1Data.dietaryInfo).toBe("");
    expect(comp1Data.birthDate).toBe("2010-06-15");
    // computeAge mock returns 25 (not under 14), so parentalConsent is not set
    expect(comp1Data.parentalConsent).toBeUndefined();
  });

  it("updates menuSelection via updateRsvpField", () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
    act(() => result.current.updateRsvpField("menuSelection", "carne"));
    expect(result.current.rsvpForm.menuSelection).toBe("carne");
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

  function setupForm(result: { current: ReturnType<typeof useRsvp> }) {
    act(() => result.current.updateRsvpField("guestName", "Alice"));
    act(() => result.current.updateRsvpField("attendance", "alone"));
    act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
    act(() => result.current.updateRsvpField("privacyConsent", true));
  }

  describe("handleRsvpSubmit", () => {
    it("calls preventDefault on the event", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      const preventDefault = vi.fn();
      setupForm(result);
      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault } as any);
      });
      expect(preventDefault).toHaveBeenCalled();
    });

    it("submits valid RSVP data successfully", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      setupForm(result);
      act(() => result.current.updateRsvpField("healthConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(mockWriteBatch).toHaveBeenCalled();
      });
      const batch = mockWriteBatch.mock.results[0]?.value;
      expect(batch.commit).toHaveBeenCalled();
      expect(result.current.hasSubmitted).toBe(true);
      expect(result.current.rsvpForm.guestName).toBe("");
    });

    it("submits with companion data when attending with companions", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("attendance", "with"));
      act(() => result.current.updateRsvpField("companionCount", 2));
      act(() => result.current.updateRsvpField("companionNames[0]", "Bob"));
      act(() => result.current.updateRsvpField("companionNames[1]", "Charlie"));
      act(() => result.current.updateRsvpField("companionBirthDates", ["2000-01-01", "2000-01-01"]));
      act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
      act(() => result.current.updateRsvpField("privacyConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(mockWriteBatch).toHaveBeenCalled();
      });
      const batch = mockWriteBatch.mock.results[0]?.value;
      // First set call = main guest doc
      expect(batch.set).toHaveBeenCalled();
      const mainPayload = batch.set.mock.calls[0][1];
      expect(mainPayload.attendance).toBe("yes");
      expect(mainPayload.companionCount).toBe(2);
      expect(mainPayload.companionNames).toEqual(["Bob", "Charlie"]);
      expect(mainPayload.rsvpType).toBe("main");
      // 1 main + 2 companions = 3 set calls
      expect(batch.set).toHaveBeenCalledTimes(3);
    });

    it("submits with menuSelection when provided", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, true));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("menuSelection", "carne"));
      act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
      act(() => result.current.updateRsvpField("privacyConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      await waitFor(() => {
        expect(mockWriteBatch).toHaveBeenCalled();
      });
      const batch = mockWriteBatch.mock.results[0]?.value;
      const payload = batch.set.mock.calls[0][1];
      expect(payload.rsvpType).toBe("main");
      expect(payload.mealChoice).toBe("carne");
    });

    it("returns error for menuRequired when menuEnabled but no menuSelection", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, true));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
      act(() => result.current.updateRsvpField("privacyConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.rsvpMessage).toMatch(/menuRequired/i);
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it("handles submission error gracefully", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      setupForm(result);
      act(() => result.current.updateRsvpField("healthConsent", true));

      // Make batch.commit reject
      mockWriteBatch.mockReturnValueOnce({
        set: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn(() => Promise.reject(new Error("Firestore error"))),
      });

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
      act(() => result.current.updateRsvpField("attendance", "alone"));
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

    it("returns error for companion with empty name", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("attendance", "with"));
      act(() => result.current.updateRsvpField("companionCount", 1));
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
      act(() => result.current.updateRsvpField("attendance", "alone"));
      act(() => result.current.updateRsvpField("birthDate", "2012-01-01"));
      act(() => result.current.updateRsvpField("privacyConsent", true));

      await act(async () => {
        result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.rsvpMessage).toMatch(/ageUnder14/i);
    });

    it("returns error for healthConsent when allergies present", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      act(() => result.current.updateRsvpField("guestName", "Alice"));
      act(() => result.current.updateRsvpField("attendance", "alone"));
      act(() => result.current.updateRsvpField("allergies", ["sin gluten"]));
      act(() => result.current.updateRsvpField("birthDate", "2000-01-01"));
      act(() => result.current.updateRsvpField("privacyConsent", true));

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

      expect(mockWriteBatch).toHaveBeenCalled();
      const batch = mockWriteBatch.mock.results[0]?.value;
      expect(batch.commit).toHaveBeenCalled();
      expect(batch.delete).toHaveBeenCalled();
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

      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it("handles delete error gracefully", async () => {
      mockWriteBatch.mockReturnValueOnce({
        set: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn(() => Promise.reject(new Error("Delete error"))),
      });
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
      expect(result.current.rsvpEntries[0]!.guestName).toBe("Alice");
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
      expect(result.current.rsvpEntries[0]!.guestName).toBe("New");
      expect(result.current.rsvpEntries[1]!.guestName).toBe("Old");
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
      expect(result.current.rsvpEntries[0]!.attendees).toHaveLength(3);
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
      const attendee = result.current.rsvpEntries[0]!.attendees[0]!;
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
            companionCount: 0,
            companionNames: [],
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

    it("hits else branch in effect when prefillRef already matches", async () => {
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
            companionCount: 0,
            companionNames: [],
          }),
        }],
        forEach: vi.fn(),
      });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false));
      await act(async () => {
        result.current.updateRsvpField("guestName", "Alice");
      });
      await waitFor(() => {
        expect(result.current.alreadySubmittedEntry?.id).toBe("entry-1");
      });
      expect(result.current.rsvpForm.guestName).toBe("Alice");
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
            companionCount: 0,
            companionNames: [],
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
            companionCount: 0,
            companionNames: [],
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
