import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttendanceEditModal } from "../AttendanceEditModal";
import type { EditingState } from "../attendance-edit-types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../components/Modal", () => ({
  default: ({ title, onClose, children }: { title?: string; onClose: () => void; children: React.ReactNode }) => (
    <div role="dialog" aria-label={title}>
      <button type="button" onClick={onClose} aria-label="common.close">
        ×
      </button>
      {children}
    </div>
  ),
}));

function state(overrides: Partial<EditingState> = {}): EditingState {
  return {
    id: "resp1",
    companionDocIds: [],
    name: "Ana García",
    attendance: "yes",
    notes: "",
    mealChoice: "",
    allergySelection: [],
    allergyOther: "",
    transportMode: "own",
    transportChoice: "",
    companions: [{ docId: "c1", name: "Luis", menu: "", allergies: [], other: "" }],
    ...overrides,
  };
}

function renderModal(overrides: Partial<EditingState> = {}, props = {}, asAdd = false) {
  const onChange = vi.fn();
  const onPatchCompanion = vi.fn();
  const onToggleCompanionAllergy = vi.fn();
  const onSave = vi.fn();
  const onClose = vi.fn();
  // Modo alta: se elimina el id del estado montado (sin re-fusión con default).
  let editing = state(overrides);
  if (asAdd) {
    editing = { ...editing, companions: [], companionDocIds: [] };
    delete (editing as { id?: string }).id;
  }
  render(
    <AttendanceEditModal
      editing={editing}
      savingManual={false}
      menuEnabled
      departuresList={[{ type: "bus", time: "19:00", url: "https://x" }]}
      onClose={onClose}
      onSave={onSave}
      onChange={onChange}
      onAddCompanion={vi.fn()}
      onRemoveCompanion={vi.fn()}
      onPatchCompanion={onPatchCompanion}
      onToggleCompanionAllergy={onToggleCompanionAllergy}
      {...props}
    />,
  );
  return { onChange, onPatchCompanion, onToggleCompanionAllergy, onSave, onClose };
}

describe("AttendanceEditModal", () => {
  it("modo edición: título, botón guardar y submit reenvía onSave", () => {
    const h = renderModal();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "attendance.manualEditTitle");
    fireEvent.click(screen.getByText("attendance.manualSave"));
    expect(h.onSave).toHaveBeenCalled();
  });

  it("modo alta (sin id): título y botón 'Añadir'", () => {
    renderModal({}, {}, true);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "attendance.manualAddTitle");
    expect(screen.getByText("attendance.manualAdd")).toBeDefined();
  });

  it("deshabilita el guardado si el nombre está vacío", () => {
    renderModal({ name: "   " });
    const btn = screen.getByRole("button", { name: "attendance.manualSave" });
    expect(btn).toBeDisabled();
  });

  it("con asistencia 'no' oculta menú, alergias, transporte y acompañantes", () => {
    renderModal({ attendance: "no" });
    expect(screen.queryByText("rsvp.menuLabel")).toBeNull();
    expect(screen.queryByText("rsvp.transportLabel")).toBeNull();
    expect(screen.queryByText("attendance.manualCompanionsLabel")).toBeNull();
  });

  it("guarda cambios de nombre, asistencia y alergia del invitado", () => {
    const h = renderModal();
    fireEvent.change(screen.getByLabelText("attendance.manualNameLabel"), { target: { value: "Ana López" } });
    expect(h.onChange).toHaveBeenCalledWith("name", "Ana López");
    fireEvent.change(screen.getByLabelText("attendance.manualAttendanceLabel"), { target: { value: "no" } });
    expect(h.onChange).toHaveBeenCalledWith("attendance", "no");
    // Alergia: marca "sin gluten" (la del invitado principal es la 1ª).
    fireEvent.click(screen.getAllByText("rsvp.allergies.sin gluten")[0]!);
    expect(h.onChange).toHaveBeenCalledWith("allergySelection", ["sin gluten"]);
  });

  it("menú configurado: muestra el selector de menú principal y del acompañante", () => {
    renderModal();
    expect(screen.getByLabelText("rsvp.menuLabel")).toBeDefined();
    expect(screen.getByLabelText("attendance.manualCompanionsLabel 1 - rsvp.menuLabel")).toBeDefined();
  });

  it("transporte distinto de 'own' con salidas: muestra el selector de salida", () => {
    renderModal({ transportMode: "bus" });
    expect(screen.getByLabelText("rsvp.transportDepartureLabel")).toBeDefined();
    // departureLabel(t, d) con tipo bus + hora.
    expect(screen.getByText(/19:00/)).toBeDefined();
  });

  it("acompañantes: parcha el nombre, alterna alergia y añade/elimina desde el panel", () => {
    const h = renderModal();
    fireEvent.change(screen.getByLabelText("attendance.manualCompanionsLabel 1 - attendance.manualNameLabel"), {
      target: { value: "Luis Pedro" },
    });
    expect(h.onPatchCompanion).toHaveBeenCalledWith(0, { name: "Luis Pedro" });
    fireEvent.click(screen.getByText("attendance.manualAddCompanion"));
    fireEvent.click(screen.getByLabelText("attendance.manualRemoveCompanion 1"));
    // La alergia del acompañante (2ª aparición del chip) se reenvía por índice.
    fireEvent.click(screen.getAllByText("rsvp.allergies.sin gluten")[1]!);
    expect(h.onToggleCompanionAllergy).toHaveBeenCalledWith(0, "sin gluten");
  });

  it("muestra 'Guardando…' y bloquea mientras savingManual", () => {
    const { onSave } = renderModal({}, { savingManual: true });
    const btn = screen.getByRole("button", { name: "common.loading" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    onSave.mockClear();
  });

  it("edita menú del principal, transporte y menú/otra del acompañante", () => {
    const h = renderModal();
    fireEvent.change(screen.getByLabelText("rsvp.menuLabel"), { target: { value: "carne" } });
    expect(h.onChange).toHaveBeenCalledWith("mealChoice", "carne");
    fireEvent.change(screen.getByLabelText("attendance.manualCompanionsLabel 1 - rsvp.menuLabel"), {
      target: { value: "pescado" },
    });
    expect(h.onPatchCompanion).toHaveBeenCalledWith(0, { menu: "pescado" });
    fireEvent.change(screen.getByLabelText("attendance.manualCompanionsLabel 1 - rsvp.allergiesPlaceholder"), {
      target: { value: "fruto seco" },
    });
    expect(h.onPatchCompanion).toHaveBeenCalledWith(0, { other: "fruto seco" });
  });
});

