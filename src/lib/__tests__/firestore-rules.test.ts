import { describe, it, expect } from "vitest";

interface RuleTest {
  name: string;
  collection: string;
  operation: string;
  resource: unknown | null;
  request: Record<string, unknown>;
  expectAllow: boolean;
}

function evaluateRules(collection: string, operation: string, resource: unknown | null, request: Record<string, unknown>): boolean {
  const isGallery = /^invitations\/[^/]+\/gallery\/[^/]+$/.test(collection);
  const isAudio = /^invitations\/[^/]+\/audio\/[^/]+$/.test(collection);
  const isInvitation = collection === "invitations" || /^invitations\/[^/]+$/.test(collection);
  const isRsvp = /^invitations\/[^/]+\/rsvpResponses(\/[^/]+)?$/.test(collection);

  if (isGallery && operation === "create") {
    const size = (request?.resourceSize as number) ?? 0;
    if (size > 300 * 1024) return false;
  }

  if (isAudio && operation === "create") {
    const size = (request?.resourceSize as number) ?? 0;
    if (size > 500 * 1024) return false;
  }

  if (isRsvp && operation === "create") return true;

  if (isInvitation && operation === "get") return true;

  if (isInvitation && (operation === "create" || operation === "update")) {
    return !!request.auth;
  }

  return true;
}

describe("Firestore rules simulation", () => {
  const tests: RuleTest[] = [
    {
      name: "gallery create with allowed size",
      collection: "invitations/abc123/gallery/img1",
      operation: "create",
      resource: null,
      request: { auth: true, resourceSize: 100 * 1024 },
      expectAllow: true,
    },
    {
      name: "gallery create with too large size",
      collection: "invitations/abc123/gallery/img1",
      operation: "create",
      resource: null,
      request: { auth: true, resourceSize: 500 * 1024 },
      expectAllow: false,
    },
    {
      name: "audio create with allowed size",
      collection: "invitations/abc123/audio/aud1",
      operation: "create",
      resource: null,
      request: { auth: true, resourceSize: 400 * 1024 },
      expectAllow: true,
    },
    {
      name: "audio create with too large size",
      collection: "invitations/abc123/audio/aud1",
      operation: "create",
      resource: null,
      request: { auth: true, resourceSize: 600 * 1024 },
      expectAllow: false,
    },
    {
      name: "invitation create requires auth",
      collection: "invitations/newInvite",
      operation: "create",
      resource: null,
      request: { auth: null },
      expectAllow: false,
    },
    {
      name: "invitation create with auth",
      collection: "invitations/newInvite",
      operation: "create",
      resource: null,
      request: { auth: true },
      expectAllow: true,
    },
    {
      name: "RSVP create allowed without auth (invitee)",
      collection: "invitations/abc123/rsvpResponses",
      operation: "create",
      resource: null,
      request: { auth: null },
      expectAllow: true,
    },
  ];

  tests.forEach(({ name, collection, operation, resource, request, expectAllow }) => {
    it(name, () => {
      const result = evaluateRules(collection, operation, resource, request);
      expect(result).toBe(expectAllow);
    });
  });
});
