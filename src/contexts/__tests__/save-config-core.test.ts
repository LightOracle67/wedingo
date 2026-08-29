import { describe, it, expect } from "vitest";
import { computeSetupChanges, SUPER_ADMIN_FIELDS } from "../save-config-core";
import type { InvitationConfig } from "../../types";

// Base de configuración con valores de referencia para el diff.
const base = { firstName: "Ana", secondName: "Luis", theme: "antique-ivory", privacyConsent: true, privacyConsentAt: "2026" } as unknown as InvitationConfig;

describe("computeSetupChanges", () => {
  it("detecta los campos que difieren del estado actual", () => {
    const candidate = { ...base, theme: "golden" } as unknown as InvitationConfig;
    const { changed } = computeSetupChanges(candidate, base, true);
    expect(changed).toContain("theme");
    expect(changed).not.toContain("firstName");
  });

  it("incluye siempre los campos obligatorios aunque no hayan cambiado", () => {
    const { payload, alwaysInclude } = computeSetupChanges(base, base, true);
    expect(alwaysInclude.has("privacyConsent")).toBe(true);
    expect(alwaysInclude.has("privacyPolicyVersion")).toBe(true);
    expect(payload.privacyConsent).toBe(base.privacyConsent);
  });

  it("añade createdAt y setupTokenHash solo en el primer guardado", () => {
    const firstSave = computeSetupChanges(base, base, false);
    const persisted = computeSetupChanges(base, base, true);
    expect(firstSave.alwaysInclude.has("createdAt")).toBe(true);
    expect(firstSave.alwaysInclude.has("setupTokenHash")).toBe(true);
    expect(persisted.alwaysInclude.has("createdAt")).toBe(false);
  });

  it("construye el payload solo con los campos cambiados y obligatorios", () => {
    const candidate = { ...base, theme: "golden" } as unknown as InvitationConfig;
    const { payload } = computeSetupChanges(candidate, base, true);
    expect(payload.theme).toBe("golden");
    // firstName es obligatorio (alwaysInclude): viaja aunque no haya cambiado.
    expect(payload.firstName).toBe("Ana");
    // Los campos que no han cambiado y no son obligatorios no viajan.
    expect(payload.inviteMessage).toBeUndefined();
  });
});

describe("SUPER_ADMIN_FIELDS", () => {
  it("lista los campos que solo el superadmin puede modificar", () => {
    expect(SUPER_ADMIN_FIELDS).toEqual(expect.arrayContaining(["verified", "manualExpiry", "status", "tags", "rsvpCapacity", "rsvpSignatureEnabled"]));
  });
});
