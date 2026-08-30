/**
 * ConsentsBlock.test.tsx — Bloque de consentimientos del RSVP (v2.190):
 * privacidad obligatoria + enlace operable a la política, salud condicional
 * y firma digital opcional. Cubre las ramas: política con/sin versión,
 * salud visible/oculta, firma visible/congelada y deshabilitada.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConsentsBlock from "../ConsentsBlock";

const baseForm = {
  privacyConsent: false,
  healthConsent: false,
  digitalSignature: false,
} as never;

const t = ((key: string, opts?: Record<string, unknown>) =>
  key + (opts?.version ? `:${String(opts.version)}` : "")) as never;

function setup(overrides: Record<string, unknown> = {}) {
  const onField = vi.fn();
  const onOpenPrivacy = vi.fn();
  const props = {
    form: baseForm,
    onField,
    showHealthConsent: false,
    signatureEnabled: false,
    frozen: false,
    disabled: false,
    onOpenPrivacy,
    t,
    ...overrides,
  };
  const view = render(<ConsentsBlock {...(props as never)} />);
  return { ...view, onField, onOpenPrivacy, props };
}

describe("ConsentsBlock", () => {
  it("marca/desmarca el consentimiento de privacidad", () => {
    const { onField } = setup();
    fireEvent.click(screen.getByRole("checkbox", { name: /rsvp.privacyConsentBefore/ }));
    expect(onField).toHaveBeenCalledWith("privacyConsent", true);
  });

  it("abre la política desde el enlace con click y con teclado", () => {
    const { onOpenPrivacy } = setup();
    const link = screen.getByText("public.privacyPolicy");
    fireEvent.click(link);
    expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(link, { key: "Enter" });
    expect(onOpenPrivacy).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(link, { key: " " });
    expect(onOpenPrivacy).toHaveBeenCalledTimes(3);
  });

  it("muestra la versión de la política cuando llega", () => {
    const { rerender, props } = setup();
    expect(screen.queryByText(/rsvp.policyVersion/)).toBeNull();
    rerender(<ConsentsBlock {...{ ...props, policyVersion: "2026-03" } as never} />);
    expect(screen.getByText("rsvp.policyVersion:2026-03")).toBeDefined();
  });

  it("muestra el consentimiento de salud SOLO si está habilitado y es obligatorio", () => {
    const { onField } = setup({ showHealthConsent: true, form: { ...baseForm, healthConsent: true } });
    const input = screen.getByRole("checkbox", { name: /rsvp.healthConsent/ });
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).required).toBe(true);
    fireEvent.click(input);
    expect(onField).toHaveBeenCalledWith("healthConsent", false);
  });

  it("no renderiza salud si está desactivado", () => {
    setup();
    expect(screen.queryByRole("checkbox", { name: /rsvp.healthConsent/ })).toBeNull();
  });

  it("firma digital: visible solo si está habilitada y no congelado", () => {
    const { onField } = setup({ signatureEnabled: true, form: { ...baseForm, digitalSignature: true } });
    const input = screen.getByRole("checkbox", { name: /rsvp.digitalSignature/ });
    fireEvent.click(input);
    expect(onField).toHaveBeenCalledWith("digitalSignature", false);
  });

  it("firma oculta si está congelado (envío ya realizado)", () => {
    setup({ signatureEnabled: true, frozen: true });
    expect(screen.queryByRole("checkbox", { name: /rsvp.digitalSignature/ })).toBeNull();
  });

  it("los checkboxes de privacidad/salud heredan disabled cuando el envío está congelado", () => {
    setup({ frozen: true, showHealthConsent: true });
    expect((screen.getByRole("checkbox", { name: /rsvp.privacyConsentBefore/ }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("checkbox", { name: /rsvp.healthConsent/ }) as HTMLInputElement).disabled).toBe(true);
  });
});
