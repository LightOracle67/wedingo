import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ANIMATIONS, ALL_ANIMATIONS_KEY } from "../../../lib/animations";

const mockUpdateFormField = vi.fn();
const mockFormData = vi.hoisted(() => ({ disabledAnimations: "" }) as Record<string, string | undefined>);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("../../../contexts", () => ({
  useConfigActions: () => ({
    updateFormField: mockUpdateFormField,
    handleDayChange: vi.fn(),
    handleTimeChange: vi.fn(),
    handleTimeBlur: vi.fn(),
    handleYearChange: vi.fn(),
    maxAllowedYear: 2099,
    inviteToken: "",
    hasStoredConfig: false,
  }),
  useFormField: (field: string) => mockFormData[field] ?? "",
  useFormStore: () => ({ getField: (field: string) => mockFormData[field] ?? "" }),
}));

import AnimationsSectionForm from "../AnimationsSectionForm";

const envelopeIds = ANIMATIONS.filter((a) => a.groupId === "envelope").map((a) => a.id);

function lastWrite(): string {
  const call = [...mockUpdateFormField.mock.calls].reverse().find((c) => c[0] === "disabledAnimations");
  return call ? String(call[1]) : "";
}

describe("AnimationsSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData.disabledAnimations = "";
  });

  it("el checkbox maestro añade la clave `all` al desactivar todas", () => {
    render(<AnimationsSectionForm />);
    fireEvent.click(document.getElementById("anim-all") as HTMLInputElement);
    expect(lastWrite()).toContain(ALL_ANIMATIONS_KEY);
  });

  it("el checkbox maestro se recupera y conserva las individuales", () => {
    mockFormData.disabledAnimations = "all,fireflies";
    render(<AnimationsSectionForm />);
    const master = document.getElementById("anim-all") as HTMLInputElement;
    expect(master.checked).toBe(true);
    fireEvent.click(master);
    expect(lastWrite()).toBe("fireflies");
  });

  it("el checkbox de la sección desactiva todos los ids del grupo", () => {
    render(<AnimationsSectionForm />);
    fireEvent.click(document.getElementById("group-envelope") as HTMLInputElement);
    const written = lastWrite().split(",").sort();
    expect(written).toEqual([...envelopeIds].sort());
  });

  it("el checkbox de la sección se muestra desmarcado cuando el grupo está apagado", () => {
    mockFormData.disabledAnimations = envelopeIds.join(",");
    render(<AnimationsSectionForm />);
    const group = document.getElementById("group-envelope") as HTMLInputElement;
    expect(group.checked).toBe(false);
  });
});
