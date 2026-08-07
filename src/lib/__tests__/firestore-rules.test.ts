import { describe, it, expect } from "vitest";

interface RuleTest {
  name: string;
  collection: string;
  operation: string;
  resource: unknown | null;
  request: Record<string, unknown>;
  expectAllow: boolean;
}

function evaluateRules(
  collection: string,
  operation: string,
  _resource: unknown | null,
  request: Record<string, unknown>,
): boolean {
  const isGallery = /^invitations\/[^/]+\/gallery\/[^/]+$/.test(collection);
  const isAudio = /^invitations\/[^/]+\/audio\/[^/]+$/.test(collection);
  const isInvitation = collection === "invitations" || /^invitations\/[^/]+$/.test(collection);
  const isRsvp = /^rsvpResponses\/[^/]+\/responses(\/[^/]+)?$/.test(collection);
  const isSocial = /^invitations\/[^/]+\/(notes|songs|gifts|rides)\/[^/]+$/.test(collection);
  const isCounter = /^invitations\/[^/]+\/_counters\/[^/]+$/.test(collection);

  if (isGallery && operation === "create") {
    const size = (request.resourceSize as number) ?? 0;
    if (size > 300 * 1024) return false;
  }

  if (isAudio && operation === "create") {
    const size = (request.resourceSize as number) ?? 0;
    if (size > 500 * 1024) return false;
  }

  if (isRsvp && operation === "create") return true;

  if (isInvitation && operation === "get") return true;

  if (isInvitation && (operation === "create" || operation === "update")) {
    return !!request.auth;
  }

  // Cap anti-spam social: el contador existente debe estar por debajo del
  // tope (200; 100 para rides). Un contador inexistente permite escribir
  // (se crea en el mismo batch).
  if (isSocial && operation === "create") {
    const counterCount = (request?.counterCount as number | null) ?? null;
    const isRide = /^invitations\/[^/]+\/rides\/[^/]+$/.test(collection);
    const cap = isRide ? 100 : 200;
    if (counterCount !== null && counterCount >= cap) return false;
    return true;
  }

  // Contador _counters: create solo 0 (inicialización) o 1 (primer doc);
  // update estricto +1 hasta el cap.
  if (isCounter && operation === "create") {
    const count = (request.resourceData as { count?: unknown } | null)?.count;
    return count === 0 || count === 1;
  }
  if (isCounter && operation === "update") {
    const next = (request.resourceData as { count?: unknown }).count as number;
    const prev = (request.resourceData as { prevCount?: unknown }).prevCount as number;
    const isRide = /^invitations\/[^/]+\/_counters\/rides$/.test(collection);
    const cap = isRide ? 100 : 200;
    return next === prev + 1 && next <= cap;
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
      collection: "rsvpResponses/abc123/responses",
      operation: "create",
      resource: null,
      request: { auth: null },
      expectAllow: true,
    },
    {
      name: "note create allowed below cap",
      collection: "invitations/abc123/notes/n1",
      operation: "create",
      resource: null,
      request: { auth: null, counterCount: 50 },
      expectAllow: true,
    },
    {
      name: "note create denied at cap",
      collection: "invitations/abc123/notes/n1",
      operation: "create",
      resource: null,
      request: { auth: null, counterCount: 200 },
      expectAllow: false,
    },
    {
      name: "ride create denied at cap 100",
      collection: "invitations/abc123/rides/r1",
      operation: "create",
      resource: null,
      request: { auth: null, counterCount: 100 },
      expectAllow: false,
    },
    {
      name: "counter create allows init 0",
      collection: "invitations/abc123/_counters/notes",
      operation: "create",
      resource: null,
      request: { auth: null, resourceData: { count: 0 } },
      expectAllow: true,
    },
    {
      name: "counter create allows first doc 1",
      collection: "invitations/abc123/_counters/notes",
      operation: "create",
      resource: null,
      request: { auth: null, resourceData: { count: 1 } },
      expectAllow: true,
    },
    {
      name: "counter create denies cap injection",
      collection: "invitations/abc123/_counters/notes",
      operation: "create",
      resource: null,
      request: { auth: null, resourceData: { count: 200 } },
      expectAllow: false,
    },
    {
      name: "counter update allows +1 below cap",
      collection: "invitations/abc123/_counters/notes",
      operation: "update",
      resource: null,
      request: { auth: null, resourceData: { count: 51, prevCount: 50 } },
      expectAllow: true,
    },
    {
      name: "counter update denies jump over cap",
      collection: "invitations/abc123/_counters/notes",
      operation: "update",
      resource: null,
      request: { auth: null, resourceData: { count: 200, prevCount: 50 } },
      expectAllow: false,
    },
  ];

  tests.forEach(({ name, collection, operation, resource, request, expectAllow }) => {
    it(name, () => {
      const result = evaluateRules(collection, operation, resource, request);
      expect(result).toBe(expectAllow);
    });
  });
});
