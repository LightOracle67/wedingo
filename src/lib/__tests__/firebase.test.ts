import { describe, it, expect, vi } from "vitest";

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "col-ref"),
  collectionGroup: vi.fn(() => "group-ref"),
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
  RSVP_RESPONSES_GROUP,
  rsvpByInviteRef,
  rsvpResponseRef,
} from "../firebase";

describe("firebase", () => {
  it("invitationDocRef returns a document reference", () => {
    const ref = invitationDocRef("test-token");
    expect(ref).toBe("doc-ref");
  });

  it("INVITATIONS_COLLECTION_REF is defined", () => {
    expect(INVITATIONS_COLLECTION_REF).toBe("col-ref");
  });

  it("RSVP_RESPONSES_GROUP uses a collectionGroup query", () => {
    expect(RSVP_RESPONSES_GROUP).toBe("group-ref");
  });

  it("rsvpByInviteRef targets the invitation subcollection", () => {
    const q = rsvpByInviteRef("test-token");
    expect(q).toBe("col-ref");
  });

  it("rsvpResponseRef targets a response inside the invitation subcollection", () => {
    const ref = rsvpResponseRef("test-token", "resp-1");
    expect(ref).toBe("doc-ref");
  });
});
