import { describe, it, expect } from "vitest";

function isValidRequest(collection: string, operation: string, request: Record<string, unknown>): boolean {
  const isInvitation = !collection.includes("/");
  const isSubcollection = collection.includes("/");
  const hasAuth = !!request.auth;

  if (isInvitation && operation === "get") return true;
  if (isInvitation && operation === "list") return true;

  if (isInvitation && (operation === "create" || operation === "update" || operation === "delete")) {
    return hasAuth;
  }

  if (collection.includes("rsvpResponses") && operation === "create") return true;

  if (collection.includes("gallery") && operation === "create") {
    return (request.resourceSize as number) <= 300 * 1024;
  }
  if (collection.includes("audio") && operation === "create") {
    return (request.resourceSize as number) <= 500 * 1024;
  }

  return hasAuth;
}

describe("Firestore rules simulation (extra)", () => {
  it("allows public invitation read", () => {
    expect(isValidRequest("invitations", "get", { auth: null })).toBe(true);
  });

  it("denies invitation write without auth", () => {
    expect(isValidRequest("invitations", "create", { auth: null })).toBe(false);
    expect(isValidRequest("invitations", "update", { auth: null })).toBe(false);
  });

  it("allows invitation write with auth", () => {
    expect(isValidRequest("invitations", "create", { auth: true })).toBe(true);
    expect(isValidRequest("invitations", "update", { auth: true })).toBe(true);
  });

  it("allows RSVP create without auth", () => {
    expect(isValidRequest("invitations/abc123/rsvpResponses", "create", { auth: null })).toBe(true);
  });

  it("validates gallery file size", () => {
    expect(isValidRequest("invitations/abc123/gallery/img1", "create", { auth: true, resourceSize: 100 * 1024 })).toBe(true);
    expect(isValidRequest("invitations/abc123/gallery/img1", "create", { auth: true, resourceSize: 500 * 1024 })).toBe(false);
  });

  it("validates audio file size", () => {
    expect(isValidRequest("invitations/abc123/audio/aud1", "create", { auth: true, resourceSize: 400 * 1024 })).toBe(true);
    expect(isValidRequest("invitations/abc123/audio/aud1", "create", { auth: true, resourceSize: 600 * 1024 })).toBe(false);
  });
});
