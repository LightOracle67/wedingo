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
  persistentLocalCache: vi.fn(() => ({ kind: "persistent" })),
  persistentMultipleTabManager: vi.fn(() => ({ kind: "multi-tab" })),
}));

vi.mock("@firebase/auth", () => ({
  getAuth: vi.fn(() => ({ mocked: true })),
}));

vi.mock("@firebase/storage", () => ({
  getStorage: vi.fn(() => ({ mockedStorage: true })),
}));

import {
  invitationDocRef,
  INVITATIONS_COLLECTION_REF,
  RSVP_RESPONSES_GROUP,
  rsvpByInviteRef,
  rsvpResponseRef,
  getAuthInstance,
  getStorageInstance,
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

  it("getAuthInstance lazily initializes Firebase Auth and memoizes", async () => {
    const first = await getAuthInstance();
    const second = await getAuthInstance();
    expect(first).toHaveProperty("mocked", true);
    expect(second).toBe(first);
  });

  it("getStorageInstance lazily initializes Firebase Storage and memoizes", async () => {
    const first = await getStorageInstance();
    const second = await getStorageInstance();
    expect(first).toHaveProperty("mockedStorage", true);
    expect(second).toBe(first);
  });
});
