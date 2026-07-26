import { describe, it, expect, vi } from "vitest";

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "col-ref"),
  doc: vi.fn((_db: unknown, _col: unknown, _token: unknown) => "doc-ref"),
  initializeFirestore: vi.fn(() => ({})),
  query: vi.fn(() => "q-ref"),
  where: vi.fn(() => "w-filter"),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
}));

vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(() => ({})),
}));

import {
  invitationDocRef,
  INVITATIONS_COLLECTION_REF,
  RSVP_COLLECTION_REF,
  rsvpByInviteRef,
} from "../firebase";

describe("firebase", () => {
  it("invitationDocRef returns a document reference", () => {
    const ref = invitationDocRef("test-token");
    expect(ref).toBe("doc-ref");
  });

  it("INVITATIONS_COLLECTION_REF is defined", () => {
    expect(INVITATIONS_COLLECTION_REF).toBe("col-ref");
  });

  it("RSVP_COLLECTION_REF is defined", () => {
    expect(RSVP_COLLECTION_REF).toBe("col-ref");
  });

  it("rsvpByInviteRef returns a query", () => {
    const q = rsvpByInviteRef("test-token");
    expect(q).toBe("q-ref");
  });
});
