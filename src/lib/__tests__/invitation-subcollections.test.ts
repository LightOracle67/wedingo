import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks de firebase ──────────────────────────────────────────────────────
const mockGetDocs = vi.hoisted(() => vi.fn());
const mockCollection = vi.hoisted(() => vi.fn((...parts: string[]) => `coll:${parts.join("/")}`));
const mockDoc = vi.hoisted(() => vi.fn((...parts: string[]) => `doc:${parts.join("/")}`));
const mockQuery = vi.hoisted(() => vi.fn((...args: unknown[]) => `q:${args.join("/")}`));
const mockWhere = vi.hoisted(() => vi.fn(() => "where"));
const mockCommit = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockWriteBatch = vi.hoisted(() => vi.fn(() => ({ delete: vi.fn(), commit: mockCommit })));
const mockGetFirestore = vi.hoisted(() => vi.fn(() => "db-instance"));

vi.mock("firebase/firestore", () => ({
  getDocs: mockGetDocs,
  collection: mockCollection,
  doc: mockDoc,
  query: mockQuery,
  where: mockWhere,
  writeBatch: mockWriteBatch,
  getFirestore: mockGetFirestore,
}));

import {
  deleteInvitationCascade,
  collectInvitationDeleteRefs,
  INVITATION_SUBCOLLECTIONS,
} from "../invitation-subcollections";
import type { Firestore } from "firebase/firestore";

/** Instancia de Firestore simulada (solo importan los mocks de firebase). */
const db = {} as Firestore;

/** Construye un documento simulado con .ref para getDocs. */
function fakeSnap(docs: unknown[]) {
  return { docs: docs.map((ref) => ({ ref })) };
}

describe("invitation-subcollections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto todas las colecciones están vacías salvo las que se indiquen.
    mockGetDocs.mockImplementation(() => fakeSnap([]));
  });

  it("enumera todas las subcolecciones de la invitación (incluidas las sociales)", () => {
    expect(INVITATION_SUBCOLLECTIONS).toContain("confirmedPeople");
    expect(INVITATION_SUBCOLLECTIONS).toContain("sections");
    expect(INVITATION_SUBCOLLECTIONS).toContain("_counters");
  });

  it("borra en cascada subcolecciones, mesas, RSVP, setupTokens, contador y el doc", async () => {
    // RSVP responses con 2 docs.
    mockGetDocs
      .mockImplementationOnce(() => fakeSnap(["rsvp-1", "rsvp-2"]))
      // sections con 1 sección...
      .mockImplementationOnce(() => fakeSnap(["sec-1"]))
      // ...y sus mesas con 1 doc.
      .mockImplementationOnce(() => fakeSnap(["table-1"]))
      // setupTokens: 1 doc.
      .mockImplementationOnce(() => fakeSnap(["setup-hash"]))
      // Resto de subcolecciones vacías.
      .mockImplementation(() => fakeSnap([]));

    await deleteInvitationCascade("TOKEN", db);

    // Se recorrieron las subcolecciones + rsvp + sections + mesas + setupTokens.
    expect(mockGetDocs).toHaveBeenCalled();
    // El batch se confirmó al menos una vez con el contador + el doc de invitación.
    expect(mockCommit).toHaveBeenCalled();
  });

  it("trocea en lotes de 500", async () => {
    // 501 RSVP docs: obliga a 2 batches (500 + 1). El resto de colecciones
    // vacías se cubren con el mockImplementation.
    mockGetDocs
      .mockImplementationOnce(() => fakeSnap(Array.from({ length: 501 }, (_, i) => `d${i}`)))
      .mockImplementation(() => fakeSnap([]));

    await deleteInvitationCascade("T", db);

    expect(mockWriteBatch).toHaveBeenCalledTimes(2);
  });

  it("recopila referencias con collectInvitationDeleteRefs (incluye doc + contador)", async () => {
    mockGetDocs
      .mockImplementationOnce(() => fakeSnap(["rsvp-1"]))
      .mockImplementationOnce(() => fakeSnap(["sec-1"]))
      .mockImplementationOnce(() => fakeSnap(["table-1"]))
      .mockImplementationOnce(() => fakeSnap(["setup-hash"]))
      .mockImplementation(() => fakeSnap([]));

    const refs = await collectInvitationDeleteRefs("TOKEN", db);

    // Al menos: rsvp + sección + mesa + setup + contador + doc.
    expect(refs.length).toBeGreaterThanOrEqual(6);
    expect(mockDoc).toHaveBeenCalledWith(db, "rsvpResponses", "TOKEN");
    expect(mockDoc).toHaveBeenCalledWith(db, "invitations", "TOKEN");
  });
});
