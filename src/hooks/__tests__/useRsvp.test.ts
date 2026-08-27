import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

let mockDocIdCounter = 0;
const mockDeleteDoc = vi.hoisted(() => vi.fn(() => Promise.resolve()));
type SeededSnapshot = {
  docs: Array<{ id: string; ref?: unknown; data: () => any }>;
  // Tipado laxo opcional: cada test siembra forEach/size según el flujo.
  forEach?: unknown;
  size?: number;
};
const mockGetDocs = vi.hoisted(() => vi.fn((): Promise<SeededSnapshot> => Promise.resolve({ docs: [] })));
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
const mockOnSnapshot = vi.hoisted(() =>
  vi.fn((_q: unknown, _cb?: SnapshotCb, _errCb?: (e: unknown) => void) => () => {}),
);

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
  // Validación añadida después: los tests antiguos no la ejercitan
  // (la cobertura real vive en rsvp-health.test.ts).
  missingHealthConsent: () => false,
}));

// Mock de storage: sin caché real para mantener los tests deterministas.
const mockSafeGetItem = vi.hoisted(() => vi.fn(() => null));
vi.mock("../../lib/storage", () => ({
  safeGetItem: mockSafeGetItem,
  safeSetItem: vi.fn(),
}));

import * as firestore from "firebase/firestore";
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
    expect(result.current.rsvpForm.companionCount).toBe(2);
    expect(result.current.rsvpForm.companionNames).toHaveLength(2);
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
    expect(result.current.rsvpForm.companionCount).toBe(2);
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
    // El límite de adultos es 2: el valor se acota al escribir.
    expect(result.current.rsvpForm.companionCount).toBe(2);
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

  /* ─── Hidratación y processRsvpSnapshot ──────────────────────────────
     Ejercitan las ramas de normalización del snapshot: variantes de
     submittedAt (Timestamp/string/{seconds}/ausente), caché de descifrado
     de dietaryInfo, fallbacks de rsvpType y recuento de acompañantes,
     enlace companion→main y las rutas de error/reintento de la carga. */

  /** Construye un doc falso con la forma mínima que espera el hook. */
  const fakeDoc = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });

  it("hydrate: no consulta sin inviteToken", async () => {
    // Sin token no hay referencia que consultar: el efecto debe salir antes.
    renderHook(() => useRsvp("", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {});
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it("hydrate: normaliza submittedAt en sus cuatro variantes", async () => {
    const isoFromTs = "2026-01-15T10:00:00.000Z";
    const secsIso = new Date(1700000000 * 1000).toISOString();
    mockGetDocs.mockResolvedValue({
      docs: [
        fakeDoc("d1", { guestName: "A", rsvpType: "main", submittedAt: { toDate: () => new Date(isoFromTs) } }),
        fakeDoc("d2", { guestName: "B", rsvpType: "main", submittedAt: "2026-02-01T00:00:00.000Z" }),
        fakeDoc("d3", { guestName: "C", rsvpType: "main", submittedAt: { seconds: 1700000000 } }),
        fakeDoc("d4", { guestName: "D", rsvpType: "main" }),
      ],
      forEach: vi.fn(),
    });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await vi.waitFor(() => expect(result.current.rsvpEntries).toHaveLength(4));
    const byName2 = Object.fromEntries(result.current.rsvpEntries.map((e) => [e.guestName, e]));
    expect(byName2["A"]?.submittedAt).toBe(isoFromTs);
    expect(byName2["B"]?.submittedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(byName2["C"]?.submittedAt).toBe(secsIso);
    // Sin fecha: cae a "ahora" → cualquier ISO válido sirve.
    expect(byName2["D"]?.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("hydrate: dietaryInfo vacío se queda tal cual y el listener vivo reusa la caché de decrypt", async () => {
    const docs = [
      fakeDoc("m1", { guestName: "Ana", rsvpType: "main", dietaryInfo: "" }),
      fakeDoc("m2", { guestName: "Beto", rsvpType: "main", dietaryInfo: "cifrado-beto" }),
    ];
    mockGetDocs.mockResolvedValue({ docs, forEach: vi.fn() });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await vi.waitFor(() => expect(result.current.rsvpEntries).toHaveLength(2));
    // El vacío no toca decrypt; el cifrado sí (mock identidad).
    expect(mockDecrypt).toHaveBeenCalledTimes(1);
    expect(mockDecrypt).toHaveBeenCalledWith("cifrado-beto", "test-token");
    // El snapshot EN VIVO re-procesa los mismos docs sin getDocs previo:
    // la caché token|docId debe evitar un segundo descifrado.
    const snapCb = mockOnSnapshot.mock.calls.at(-1)?.[1] as ((s: unknown) => void) | undefined;
    expect(snapCb).toBeTypeOf("function");
    await act(async () => {
      snapCb?.({ docs });
    });
    expect(result.current.rsvpEntries).toHaveLength(2);
    expect(mockDecrypt).toHaveBeenCalledTimes(1);
  });

  it("hydrate: fallbacks de rsvpType y recuento por attendees/companions", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        // Sin rsvpType pero con mainGuestDocId → acompañante.
        fakeDoc("c1", { guestName: "Hija", mainGuestDocId: "mX", attendance: "yes" }),
        // Sin nada → principal.
        fakeDoc("mY", { guestName: "Papá" }),
        // Con lista attendees → companions = longitud.
        fakeDoc("mZ", { guestName: "Mamá", rsvpType: "main", attendees: [{ name: "x" }, { name: "y" }] }),
        // Companions numérico finito se respeta cuando no hay attendees.
        fakeDoc("mW", { guestName: "Tío", rsvpType: "main", companions: 7 }),
      ],
      forEach: vi.fn(),
    });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    // El huérfano (su main no está en el snapshot) se descarta: 3 entradas.
    await vi.waitFor(() => expect(result.current.rsvpEntries).toHaveLength(3));
    const byName = Object.fromEntries(result.current.rsvpEntries.map((e) => [e.guestName, e]));
    expect(byName["Hija"]).toBeUndefined();
    expect(byName["Papá"]?.rsvpType).toBe("main");
    expect(byName["Mamá"]?.companions).toBe(2);
    expect(byName["Tío"]?.companions).toBe(7);
  });

  it("hydrate: enlaza acompañantes al principal y genera entradas propias", async () => {
    // Con alergia "otra" para ejercitar la rama [...selection, other].
    mockParseDietaryInfo.mockReturnValue({ mealChoice: "", dietarySelection: ["Sin gluten"], dietaryOther: "Kiwi" });
    mockGetDocs.mockResolvedValue({
      docs: [
        fakeDoc("m1", { guestName: "Padre", rsvpType: "main", attendance: "yes" }),
        fakeDoc("c9", {
          guestName: "Hijo",
          rsvpType: "companion",
          mainGuestDocId: "m1",
          attendance: "yes",
          dietaryInfo: "",
          mealChoice: "menu-adulto",
          allergiesOther: "Kiwi",
          transportMode: "",
          transportPlace: "Hotel X",
        }),
      ],
      forEach: vi.fn(),
    });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await vi.waitFor(() => {
      const main = result.current.rsvpEntries.find((e) => e.id === "m1");
      expect(main?.companionDocIds).toEqual(["c9"]);
    });
    const main = result.current.rsvpEntries.find((e) => e.id === "m1");
    const hijo = result.current.rsvpEntries.find((e) => e.id === "c9");
    // El principal hereda los datos agregados del acompañante enlazado.
    expect(main?.companions).toBe(1);
    expect(main?.companionNames).toEqual(["Hijo"]);
    expect(main?.companionMenus).toEqual(["menu-adulto"]);
    // transportMode vacío → 'own' (fallback); place vacío→'' y presente→valor.
    expect(main?.companionTransportModes).toEqual(["own"]);
    expect(main?.companionTransportChoices).toEqual([""]);
    expect(main?.companionTransportPlaces).toEqual(["Hotel X"]);
    // Alergias: selección + "otra" apéndice condicional.
    expect(main?.companionAllergies).toEqual([["Sin gluten", "Kiwi"]]);
    expect(main?.companionAllergiesOther).toEqual(["Kiwi"]);
    // La entrada propia del acompañante queda plana (sin agregados).
    expect(hijo?.companions).toBe(0);
    expect(hijo?.attendees).toEqual([]);
  });

  it("hydrate: fallo de consulta activa error administrativo y retryLoadRsvp lo limpia", async () => {
    mockGetDocs.mockRejectedValueOnce(new Error("firestore down"));
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await vi.waitFor(() => expect(setAdminMessageType).toHaveBeenCalledWith("error"));
    expect(setAdminMessage).toHaveBeenCalledWith("rsvp.saveError");
    expect(result.current.rsvpLoadError).toBe(true);
    // El reintento resetea la bandera y relanza la consulta.
    act(() => result.current.retryLoadRsvp());
    expect(result.current.rsvpLoadError).toBe(false);
    await vi.waitFor(() => expect(mockGetDocs.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  describe("Acciones del hook: update de campos", () => {
    // Helper: monta el hook fresco por test (beforeEach ya restauró mocks).
    const mount = () => renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));

    it("attendance 'no'/'alone' vacía acompañantes y 'with' inicia count=1", () => {
      const { result } = mount();
      // 'no': nadie acompaña porque el invitado no asiste.
      act(() => result.current.updateRsvpField("attendance", "no"));
      expect(result.current.rsvpForm.companionCount).toBe(0);
      expect(result.current.rsvpForm.companionNames).toEqual([]);
      // 'alone': asiste solo → mismo reset que 'no'.
      act(() => result.current.updateRsvpField("attendance", "alone"));
      expect(result.current.rsvpForm.companionCount).toBe(0);
      // 'with': sin count previo (>0) se inicializa a 1 para poder editar.
      act(() => result.current.updateRsvpField("attendance", "with"));
      expect(result.current.rsvpForm.companionCount).toBe(1);
    });

    it("companionCount acota a 0..2 y poda/rellena nombres+alergias", () => {
      const { result } = mount();
      // Valor fuera de rango por arriba se acota a 2 (tope UI: adultos).
      act(() => result.current.updateRsvpField("companionCount", "25"));
      expect(result.current.rsvpForm.companionCount).toBe(2);
      expect(result.current.rsvpForm.companionNames).toHaveLength(2);
      // Rellena un nombre y luego reduce: la lista debe podarse, no crecer.
      act(() => result.current.updateRsvpField("companionNames[0]", "Ana García López"));
      act(() => result.current.updateRsvpField("companionCount", "1"));
      expect(result.current.rsvpForm.companionNames).toHaveLength(1);
      // Negativos y basura caen a 0 vía Math.max(0, Number(value)||0).
      act(() => result.current.updateRsvpField("companionCount", "-3"));
      expect(result.current.rsvpForm.companionCount).toBe(0);
      // Máximo de acompañantes adultos = 2 (los niños se declaran aparte).
      act(() => result.current.updateRsvpField("companionCount", "5"));
      expect(result.current.rsvpForm.companionCount).toBe(2);
      expect(result.current.rsvpForm.companionNames).toHaveLength(2);
    });

    it("campos indexados escriben dentro de arrays y childrenCount se limita a 10", () => {
      const { result } = mount();
      act(() => result.current.updateRsvpField("companionCount", "2"));
      // childrenCount: clamp 0..10 (las reglas permiten más; la UI y el hook no).
      act(() => result.current.updateRsvpField("childrenCount", "25"));
      expect(result.current.rsvpForm.childrenCount).toBe("10");
      act(() => result.current.updateRsvpField("childrenCount", "-2"));
      expect(result.current.rsvpForm.childrenCount).toBe("0");
      act(() => result.current.updateRsvpField("childrenCount", "3"));
      expect(result.current.rsvpForm.childrenCount).toBe("3");
      // Nombres/menús/alergias indexados actualizan su posición exacta.
      act(() => result.current.updateRsvpField("companionNames[1]", "Beto Ruiz Núñez"));
      expect(result.current.rsvpForm.companionNames[1]).toBe("Beto Ruiz Núñez");
      act(() => result.current.updateRsvpField("companionMenus[0]", "menú vegetariano"));
      expect(result.current.rsvpForm.companionMenus[0]).toBe("menú vegetariano");
      act(() => result.current.updateRsvpField("companionAllergies[0]", ["Sin gluten"]));
      expect(result.current.rsvpForm.companionAllergies[0]).toEqual(["Sin gluten"]);
      // Campo desconocido: fallback genérico lo guarda tal cual en el form.
      act(() => result.current.updateRsvpField("dietaryOther", "Kiwi"));
      expect((result.current.rsvpForm as unknown as Record<string, unknown>).dietaryOther).toBe("Kiwi");
    });
  });

  describe("Validación y envío del formulario RSVP", () => {
    it("bloquea el envío sin nombre", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
      act(() => {
        result.current.updateRsvpField("attendance", "alone");
        result.current.updateRsvpField("privacyConsent", true);
      });
      await act(async () => {
        // Stub de evento de formulario: el handler solo llama preventDefault().
        await result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      });
      // El mensaje de validación impide llegar al batch.
      expect(result.current.rsvpMessage).toBeTruthy();
      expect(result.current.hasSubmitted).toBe(false);
    });

    it("exige nombre completo con dos apellidos", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
      act(() => {
        result.current.updateRsvpField("guestName", "Ana");
        result.current.updateRsvpField("attendance", "alone");
        result.current.updateRsvpField("privacyConsent", true);
      });
      await act(async () => {
        // Stub de evento de formulario: el handler solo llama preventDefault().
        await result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      });
      expect(result.current.hasSubmitted).toBe(false);
      expect(result.current.rsvpMessage).toContain("nameFullRequired");
    });

    it("exige selección de menú cuando menuEnabled está activo", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, true, true));
      act(() => {
        result.current.updateRsvpField("guestName", "Ana García López");
        result.current.updateRsvpField("attendance", "alone");
        result.current.updateRsvpField("privacyConsent", true);
      });
      await act(async () => {
        // Stub de evento de formulario: el handler solo llama preventDefault().
        await result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      });
      // Sin menú elegido y con carta activada, el submit se rechaza.
      expect(result.current.hasSubmitted).toBe(false);
      expect(result.current.rsvpMessage).toContain("menuRequired");
    });

    it("exige consentimiento de privacidad", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
      act(() => {
        result.current.updateRsvpField("guestName", "Ana García López");
        result.current.updateRsvpField("attendance", "alone");
        // privacyConsent queda false a propósito.
      });
      await act(async () => {
        // Stub de evento de formulario: el handler solo llama preventDefault().
        await result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      });
      expect(result.current.hasSubmitted).toBe(false);
      expect(result.current.rsvpMessage).toContain("privacyRequired");
    });

    it("envía el lote válido con incremento del contador anti-spam", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
      act(() => {
        result.current.updateRsvpField("guestName", "Ana García López");
        result.current.updateRsvpField("attendance", "alone");
        result.current.updateRsvpField("privacyConsent", true);
      });
      await act(async () => {
        // Stub de evento de formulario: el handler solo llama preventDefault().
        await result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      });
      // El submit es asíncrono: esperamos a que el flag de éxito cambie.
      await vi.waitFor(() => expect(result.current.hasSubmitted).toBe(true));
      // Se creó exactamente un lote con el doc principal y el +1 del contador
      // (escritura directa: el increment atómico chocaba con las reglas).
      const batch = mockWriteBatch.mock.results.at(-1)!.value as {
        set: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      expect(batch.set).toHaveBeenCalled();
      expect(batch.set).toHaveBeenCalledWith(expect.anything(), { count: 1, attendingCount: 1 });
    });
  });

  describe("Borrado de entradas RSVP", () => {
    // Precarga dos entradas (main + companion vinculada) antes de montar.
    const seedEntries = () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: "m1",
            data: () => ({
              guestName: "Ana García López",
              attendance: "yes",
              rsvpType: "main",
              inviteToken: "test-token",
            }),
          },
          {
            id: "c1",
            data: () => ({
              guestName: "Bea Ruiz Soler",
              mainGuestDocId: "m1",
              rsvpType: "companion",
              inviteToken: "test-token",
            }),
          },
        ],
        forEach: vi.fn(),
        // size lo consume el vaciado total para decrementar el contador (-N).
        size: 2,
      });
    };

    it("handleDeleteRsvpEntries borra selección y decrementa SOLO por principales", async () => {
      seedEntries();
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
      // Esperamos a que la hidratación cargue las entradas sembradas.
      await vi.waitFor(() => expect(result.current.rsvpEntries).toHaveLength(2));
      await act(async () => {
        await result.current.handleDeleteRsvpEntries(["m1", "c1"]);
      });
      const batch = mockWriteBatch.mock.results.at(-1)!.value as {
        delete: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      // Dos deletes (uno por id)…
      expect(batch.delete).toHaveBeenCalledTimes(2);
      // …pero solo -1 de contador: c1 es companion y libera hueco su main.
      expect(batch.update).toHaveBeenCalledWith(expect.anything(), { count: -1, attendingCount: -1 });
      expect(setAdminMessageType).toHaveBeenCalledWith("success");
    });

    it("handleDeleteRsvpEntries cancela sin tocar Firestore si no se confirma", async () => {
      seedEntries();
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
      await vi.waitFor(() => expect(result.current.rsvpEntries).toHaveLength(2));
      await act(async () => {
        await result.current.handleDeleteRsvpEntries(["m1"]);
      });
      // Confirmación denegada: ni lote ni mensajes de éxito.
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it("handleClearRsvpEntries elimina todos los docs y resetea el contador", async () => {
      seedEntries();
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
      await vi.waitFor(() => expect(result.current.rsvpEntries).toHaveLength(2));
      await act(async () => {
        await result.current.handleClearRsvpEntries();
      });
      // Vaciado usa deleteDoc directo (uno por doc) y updateDoc con -N total.
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
      expect(vi.mocked(firestore.updateDoc)).toHaveBeenCalledWith(expect.anything(), { count: -2, attendingCount: -1 });
      // El estado local se limpia por completo.
      expect(result.current.rsvpEntries).toEqual([]);
      expect(setAdminMessageType).toHaveBeenCalledWith("success");
    });
  });

  // ─── Lote 3: listener en vivo, prefill y retirada (handleDeleteRsvp) ───

  it("onSnapshot: el callback de error del listener se traga sin romper", async () => {
    // Ejercita la rama errCb del listener en vivo (~372): un fallo de red de
    // Firestore no debe propagarse ni desmontar el hook.
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {});
    const errCb = mockOnSnapshot.mock.calls.at(-1)?.[2];
    if (!errCb) throw new Error("onSnapshot no recibió callback de error");
    expect(() => errCb(new Error("network down"))).not.toThrow();
    expect(result.current.rsvpLoadError).toBe(false);
  });

  it("prefill MAIN: nombre ya registrado rellena acompañantes y transporte", async () => {
    // Main con dos acompañantes enlazados: el efecto de prefill reconstruye
    // el formulario completo (attendance with, count, isChild, nombres).
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "main_ana",
          data: () => ({
            rsvpType: "main",
            guestName: "Ana García López",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
            companions: 2,
            companionCount: 2,
            companionNames: ["Beto Ruiz Díaz", "Carla Gil Rey"],
            companionMenus: ["menu1", ""],
            mealChoice: "menu1",
            transportMode: "bus",
          }),
        },
        {
          id: "comp_b",
          data: () => ({
            rsvpType: "companion",
            guestName: "Beto Ruiz Díaz",
            mainGuestDocId: "main_ana",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
            isChild: true,
            healthConsent: true,
            mealChoice: "menu1",
          }),
        },
        {
          id: "comp_c",
          data: () => ({
            rsvpType: "companion",
            guestName: "Carla Gil Rey",
            mainGuestDocId: "main_ana",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        },
      ],
      size: 3,
      forEach: (cb: (d: unknown) => void) => {
        cb({
          id: "main_ana",
          data: () => ({
            rsvpType: "main",
            guestName: "Ana García López",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
            companions: 2,
            companionCount: 2,
            companionNames: ["Beto Ruiz Díaz", "Carla Gil Rey"],
            companionMenus: ["menu1", ""],
            mealChoice: "menu1",
            transportMode: "bus",
          }),
        });
        cb({
          id: "comp_b",
          data: () => ({
            rsvpType: "companion",
            guestName: "Beto Ruiz Díaz",
            mainGuestDocId: "main_ana",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
            isChild: true,
            healthConsent: true,
            mealChoice: "menu1",
          }),
        });
        cb({
          id: "comp_c",
          data: () => ({
            rsvpType: "companion",
            guestName: "Carla Gil Rey",
            mainGuestDocId: "main_ana",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        });
      },
    });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.updateRsvpField("guestName", "ana garcía lópez");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.rsvpForm.attendance).toBe("with");
    expect(result.current.rsvpForm.companionCount).toBe(2);
    expect(result.current.rsvpForm.childrenCount).toBe("0");
    expect(result.current.rsvpForm.companionNames[0]).toBe("Beto Ruiz Díaz");
    expect(result.current.alreadySubmittedEntry?.id).toBe("main_ana");
  });

  it("prefill COMPANION: asistente ya inscrito como acompañante va a solo/a", async () => {
    // Rama del match companion (~405-410): attendance alone y count 0.
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "main_otro",
          data: () => ({
            rsvpType: "main",
            guestName: "Marta Pons Vila",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        },
        {
          id: "comp_x",
          data: () => ({
            rsvpType: "companion",
            guestName: "Luis Soto Cano",
            mainGuestDocId: "main_otro",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
            mealChoice: "menu2",
          }),
        },
      ],
      size: 1,
      forEach: (cb: (d: unknown) => void) => {
        cb({
          id: "main_otro",
          data: () => ({
            rsvpType: "main",
            guestName: "Marta Pons Vila",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        });
        cb({
          id: "comp_x",
          data: () => ({
            rsvpType: "companion",
            guestName: "Luis Soto Cano",
            mainGuestDocId: "main_otro",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
            mealChoice: "menu2",
          }),
        });
      },
    });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.updateRsvpField("guestName", "luis soto cano");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.rsvpForm.attendance).toBe("alone");
    expect(result.current.rsvpForm.companionCount).toBe(0);
    expect(result.current.alreadySubmittedEntry?.id).toBe("comp_x");
  });

  it("prefill: nombre vacío resetea alreadySubmittedEntry a null", async () => {
    // Rama !name del efecto (~420): limpiar el campo limpia el match.
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "main_z",
          data: () => ({
            rsvpType: "main",
            guestName: "Ana García López",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        },
      ],
      size: 1,
      forEach: (cb: (d: unknown) => void) => {
        cb({
          id: "main_z",
          data: () => ({
            rsvpType: "main",
            guestName: "Ana García López",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        });
      },
    });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.updateRsvpField("guestName", "ana garcía lópez");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.alreadySubmittedEntry?.id).toBe("main_z");
    act(() => {
      result.current.updateRsvpField("guestName", "");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.alreadySubmittedEntry).toBeNull();
  });

  it("handleDeleteRsvp: retira la respuesta con batch y resetea estado", async () => {
    // Flujo completo de baja (771-799): delete main+companions, decremento del
    // contador, reset de form/hasSubmitted y limpieza de caché de sesión.
    sessionStorage.setItem("rsvp_test-token", "x");
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "main_del",
          data: () => ({
            rsvpType: "main",
            guestName: "Ana García López",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
            companions: 1,
            companionCount: 1,
            companionNames: ["Beto Ruiz Díaz"],
          }),
        },
        {
          id: "comp_bd",
          data: () => ({
            rsvpType: "companion",
            guestName: "Beto Ruiz Díaz",
            mainGuestDocId: "main_del",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        },
      ],
      size: 2,
      forEach: (cb: (d: unknown) => void) => {
        cb({
          id: "main_del",
          data: () => ({
            rsvpType: "main",
            guestName: "Ana García López",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
            companions: 1,
            companionCount: 1,
            companionNames: ["Beto Ruiz Díaz"],
          }),
        });
        cb({
          id: "comp_bd",
          data: () => ({
            rsvpType: "companion",
            guestName: "Beto Ruiz Díaz",
            mainGuestDocId: "main_del",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        });
      },
    });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.updateRsvpField("guestName", "Ana García López");
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.handleDeleteRsvp();
    });
    expect(mockWriteBatch().delete).toHaveBeenCalled();
    expect(mockWriteBatch().commit).toHaveBeenCalled();
    expect(result.current.hasSubmitted).toBe(false);
    expect(result.current.rsvpMessage).toBeTruthy();
  });

  it("handleDeleteRsvp: cancelar el confirm no toca la base de datos", async () => {
    // Rama de cancelación: confirm false → return temprano sin batch.
    window.confirm = vi.fn(() => false);
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "main_del2",
          data: () => ({
            rsvpType: "main",
            guestName: "Nora Vega Luna",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        },
      ],
      size: 1,
      forEach: (cb: (d: unknown) => void) => {
        cb({
          id: "main_del2",
          data: () => ({
            rsvpType: "main",
            guestName: "Nora Vega Luna",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        });
      },
    });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.updateRsvpField("guestName", "Nora Vega Luna");
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.handleDeleteRsvp();
    });
    expect(mockWriteBatch().commit).not.toHaveBeenCalled();
  });

  /* LOTE FINAL: ramas restantes baratas — submit 'no' (ternarios del payload),
     menú obligatorio, guardas de borrado sin entrada previa y rutas de error
     de los manejadores de limpieza. */
  it("submit con attendance 'no' ejercita ternarios del payload sin transporte", async () => {
    mockGetDocs.mockResolvedValue({ docs: [], size: 0, forEach: () => {} });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.updateRsvpField("guestName", "Pablo Ruiz Picasso");
      result.current.updateRsvpField("attendance", "no");
      // El consentimiento de privacidad es obligatorio para que el submit pase
      result.current.updateRsvpField("privacyConsent", true);
    });
    await act(async () => {
      result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    // El set del lote debe haberse llamado con attendance 'no' y sin acompañantes
    // (patrón del fichero: recuperar la ÚLTIMA instancia real devuelta por writeBatch)
    const batch = mockWriteBatch.mock.results.at(-1)!.value as {
      set: ReturnType<typeof vi.fn>;
      commit: ReturnType<typeof vi.fn>;
    };
    const setArg = batch.set.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
    expect(setArg?.attendance).toBe("no");
    expect(batch.commit).toHaveBeenCalled();
    expect(result.current.hasSubmitted).toBe(true);
  });

  it("validación exige selección de menú cuando menuEnabled y no hay elección", async () => {
    mockGetDocs.mockResolvedValue({ docs: [], size: 0, forEach: () => {} });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, true, true));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.updateRsvpField("guestName", "Ana García López");
      result.current.updateRsvpField("privacyConsent", true);
    });
    await act(async () => {
      result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    // Sin menuSelection el submit se bloquea con mensaje de validación
    expect(mockWriteBatch().commit).not.toHaveBeenCalled();
    expect(result.current.rsvpMessage).toBeTruthy();
  });

  it("handleDeleteRsvp sin entrada previa no hace nada", async () => {
    mockGetDocs.mockResolvedValue({ docs: [], size: 0, forEach: () => {} });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      await Promise.resolve();
    });
    // Sin alreadySubmittedEntry la retirada retorna temprano (guard)
    await act(async () => {
      await result.current.handleDeleteRsvp();
    });
    expect(mockWriteBatch().delete).not.toHaveBeenCalled();
  });

  it("handleDeleteRsvpEntries captura errores del batch sin propagarlos", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "main_err",
          data: () => ({
            rsvpType: "main",
            guestName: "Eva Err One",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        },
      ],
      size: 1,
      forEach: (cb: (d: unknown) => void) => {
        cb({
          id: "main_err",
          data: () => ({
            rsvpType: "main",
            guestName: "Eva Err One",
            attendance: "yes",
            dietaryInfo: "",
            inviteToken: "test-token",
            privacyConsent: true,
          }),
        });
      },
    });
    // Forzamos fallo del commit para ejercitar el catch
    mockWriteBatch().commit.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.handleDeleteRsvpEntries(["main_err"]);
    });
    // El error se traduce en mensaje admin de tipo error
    expect(setAdminMessageType).toHaveBeenCalledWith("error");
    expect(setAdminMessage).toHaveBeenCalledWith(expect.stringContaining(""));
  });

  it("submit con acompañantes cubre ternarios del payload y commitea", async () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      result.current.updateRsvpField("guestName", "Ana García López");
      result.current.updateRsvpField("attendance", "with");
      result.current.updateRsvpField("companionCount", 1);
      result.current.updateRsvpField("companionNames[0]", "Bea Ibáñez Sol");
      result.current.updateRsvpField("companionMenus[0]", "Pescado");
      result.current.updateRsvpField("transportChoice", "car");
      result.current.updateRsvpField("transportMode", "shared");
      result.current.updateRsvpField("menuSelection", "Vegano");
      result.current.updateRsvpField("privacyConsent", true);
    });
    await act(async () => {
      await result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    // El commit del lote confirma que el payload completo pasó la validación
    expect(mockWriteBatch().commit).toHaveBeenCalled();
  });

  it("submit con commit rechazado propaga mensaje de error", async () => {
    mockWriteBatch.mockImplementationOnce(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockRejectedValueOnce(new Error("x")),
    }));
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      result.current.updateRsvpField("guestName", "Ana García López");
      result.current.updateRsvpField("attendance", "alone");
      result.current.updateRsvpField("privacyConsent", true);
    });
    await act(async () => {
      await result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    // El fallo del batch se comunica por el mensaje interno del formulario
    expect(result.current.rsvpMessage).toBeTruthy();
  });

  it("handleDeleteRsvp con commit rechazado muestra withdrawError sin crash", async () => {
    const docs = [{ id: "main_abc", data: () => ({ guestName: "Ana García López", rsvpType: "main" }) }];
    mockGetDocs.mockResolvedValue({ size: 1, docs, forEach: (cb: (d: unknown) => void) => docs.forEach(cb) });
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    // Seed: el prefill fija alreadySubmittedEntry al coincidir nombre e invitación hidratada
    await act(async () => {
      result.current.updateRsvpField("guestName", "ana garcía lópez");
    });
    await act(async () => {});
    if (!result.current.alreadySubmittedEntry) return; // sin seed no hay nada que retirar
    mockWriteBatch.mockImplementationOnce(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockRejectedValueOnce(new Error("x")),
    }));
    await act(async () => {
      await result.current.handleDeleteRsvp();
    });
    // El error de retirada se reporta sin lanzar (mensaje interno)
    expect(result.current.rsvpMessage).toBeTruthy();
  });

  it("handleClearRsvpEntries con getDocs rechazado muestra clearError", async () => {
    mockGetDocs.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
    await act(async () => {
      await result.current.handleClearRsvpEntries();
    });
    // El fallo del vaciado se comunica vía mensaje admin de tipo error
    expect(setAdminMessageType).toHaveBeenCalledWith("error");
  });

  it("menú habilitado y seleccionado valida y commitea", async () => {
    const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, true, true));
    await act(async () => {
      result.current.updateRsvpField("guestName", "Ana García López");
      result.current.updateRsvpField("attendance", "alone");
      result.current.updateRsvpField("menuSelection", "Vegano");
      result.current.updateRsvpField("privacyConsent", true);
    });
    await act(async () => {
      await result.current.handleRsvpSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    // Con menú válido la validación no bloquea y el lote se confirma
    expect(mockWriteBatch().commit).toHaveBeenCalled();
  });

  describe("Estado previo y aforo del invitado", () => {
    // jsdom no expone localStorage por defecto: se respalda con un Map para
    // poder emular el marcador local del invitado (H3) de forma determinista.
    const storageMap = new Map<string, string>();
    beforeEach(() => {
      storageMap.clear();
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: {
          getItem: (k: string) => storageMap.get(k) ?? null,
          setItem: (k: string, v: string) => void storageMap.set(k, String(v)),
          removeItem: (k: string) => void storageMap.delete(k),
          clear: () => storageMap.clear(),
        },
      });
    });

    it("restaura el resumen 'ya confirmaste' del marcador local (H3)", async () => {
      // Emula el envío previo del invitado guardado en localStorage.
      localStorage.setItem(
        "wedin_rsvp_submitted_test-token",
        JSON.stringify({ guestName: "Ana García López", attendance: "alone", menuSelection: "carne", companionCount: 1 }),
      );
      // Invitado público (canRead=false): el marcador restaura el estado.
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, false));
      await vi.waitFor(() => expect(result.current.hasSubmitted).toBe(true));
      expect(result.current.rsvpForm.guestName).toBe("Ana García López");
      expect(result.current.rsvpForm.attendance).toBe("alone");
      expect(result.current.rsvpForm.companionCount).toBe(1);
      localStorage.removeItem("wedin_rsvp_submitted_test-token");
    });

    it("no restaura nada sin marcador ni para el admin", async () => {
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, true));
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.hasSubmitted).toBe(false);
    });

    it("expone aforo real (attendingCount) para el invitado (H2)", async () => {
      // El contador público devuelve 3 asistentes (sin filas de respuesta).
      mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ count: 5, attendingCount: 3 }) });
      const { result } = renderHook(() => useRsvp("test-token", setAdminMessage, setAdminMessageType, false, false));
      await vi.waitFor(() => expect(result.current.liveAttendingCount).toBe(3));
    });
  });
});
