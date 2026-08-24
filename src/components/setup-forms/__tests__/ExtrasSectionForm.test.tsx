import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useSyncExternalStore } from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUpdateFormField = vi.fn();
const mockFormData = vi.hoisted(() => ({}) as Record<string, string | undefined>);
// Snapshot por campo para replicar useSyncExternalStore y permitir re-renders
// al persistir un campo (como hace FormStore en producción).
let triviaVersion = 0;
const triviaListeners = new Set<() => void>();
const subscribeTrivia = (cb: () => void) => {
  triviaListeners.add(cb);
  return () => triviaListeners.delete(cb);
};
const getTriviaSnapshot = () => `${(mockFormData.trivia ?? "")}__v${triviaVersion}`;

vi.mock("../../../contexts", () => ({
  useConfigActions: () => ({
    updateFormField: typeof mockUpdateFormField !== "undefined" ? mockUpdateFormField : vi.fn(),
    handleDayChange: vi.fn(),
    handleTimeChange: vi.fn(),
    handleTimeBlur: vi.fn(),
    handleYearChange: vi.fn(),
    maxAllowedYear: 2099,
    inviteToken: "",
    hasStoredConfig: false,
  }),
  useFormField: (field: string) => {
    // Replicamos useSyncExternalStore para el campo trivia (re-renderiza al
    // persistir). Se llama SIEMPRE (reglas de hooks): el snapshot es estable
    // para el resto de campos por lo que no provoca renders extra.
    useSyncExternalStore(subscribeTrivia, getTriviaSnapshot);
    return mockFormData[field] ?? "";
  },
  useFormStore: () => ({ getField: (field: string) => mockFormData[field] ?? "" }),
  useConfig: () => ({
    config: {},
    formData: mockFormData,
    updateFormField: mockUpdateFormField,
  }),
}));

import ExtrasSectionForm from "../ExtrasSectionForm";

describe("ExtrasSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockFormData).forEach((k) => delete mockFormData[k]);
    // updateFormField real en producción persiste en el store; aquí escribimos
    // en mockFormData (fuente de useFormField) y notificamos el snapshot de la
    // trivia para que el editor estructurado re-renderice al persistir.
    mockUpdateFormField.mockImplementation((field: string, value: string) => {
      mockFormData[field] = value;
      if (field === "trivia") {
        triviaVersion += 1;
        triviaListeners.forEach((cb) => cb());
      }
    });
  });

  it("toggles the deadline", () => {
    render(<ExtrasSectionForm />);
    const toggles = screen.getAllByRole("checkbox");
    fireEvent.click(toggles[0]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("rsvpDeadlineEnabled", "true");
  });

  it("places the checkbox before its title", () => {
    render(<ExtrasSectionForm />);
    // Para cada fila de extra, el checkbox es el primer hijo del .setup-toggle-row.
    const rows = document.querySelectorAll(".setup-toggle-row");
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(row.firstElementChild!.tagName).toBe("INPUT");
    });
  });

  it("hides the deadline input until the checkbox is selected", () => {
    render(<ExtrasSectionForm />);
    expect(document.getElementById("rsvpDeadline")).toBeNull();
  });

  it("shows the date input when the deadline is enabled", () => {
    mockFormData.rsvpDeadlineEnabled = "true";
    render(<ExtrasSectionForm />);
    expect(document.getElementById("rsvpDeadline")).toBeDefined();
  });

  it("toggles the gift list and edits its lines to JSON", () => {
    mockFormData.giftsListEnabled = "true";
    mockFormData.giftList = "[]";
    render(<ExtrasSectionForm />);
    fireEvent.change(
      screen.getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA")!,
      { target: { value: "Tostadora | Roja" } },
    );
    expect(mockUpdateFormField).toHaveBeenCalledWith("giftList", expect.stringContaining("Tostadora"));
  });

  it("toggles trivia and adds a text question to JSON", () => {
    mockFormData.triviaEnabled = "true";
    mockFormData.trivia = "[]";
    render(<ExtrasSectionForm />);
    // Añade una pregunta nueva (por defecto texto libre).
    fireEvent.click(screen.getByText("setup.triviaAdd"));
    const qInput = screen.getByPlaceholderText("setup.triviaQuestionPlaceholder");
    const aInput = screen.getByPlaceholderText("setup.triviaAnswerPlaceholder");
    fireEvent.change(qInput, { target: { value: "¿Dónde?" } });
    fireEvent.change(aInput, { target: { value: "En el parque" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("trivia", expect.stringContaining("En el parque"));
    expect(mockUpdateFormField).toHaveBeenCalledWith("trivia", expect.stringContaining('"type":"text"'));
  });

  it("adds a single-choice trivia question with options and marks the correct one", () => {
    mockFormData.triviaEnabled = "true";
    mockFormData.trivia = "[]";
    render(<ExtrasSectionForm />);
    fireEvent.click(screen.getByText("setup.triviaAdd"));
    // Cambia el tipo a "single": debe mostrar el editor de opciones.
    fireEvent.change(screen.getByLabelText("setup.triviaTypeLabel"), { target: { value: "single" } });
    fireEvent.change(screen.getByPlaceholderText("setup.triviaQuestionPlaceholder"), { target: { value: "¿Color?" } });
    // Añade dos opciones (el botón muestra "+ setup.triviaAddOption").
    const addOpt = () => screen.getByText((c: string) => c.includes("setup.triviaAddOption"));
    act(() => addOpt().click());
    act(() => addOpt().click());
    const opts = screen.getAllByPlaceholderText("setup.triviaOptionPlaceholder");
    fireEvent.change(opts[0]!, { target: { value: "Rojo" } });
    fireEvent.change(opts[1]!, { target: { value: "Azul" } });
    // Marca "Rojo" como correcta.
    fireEvent.click(screen.getByLabelText("setup.triviaCorrectOption Rojo"));
    expect(mockUpdateFormField).toHaveBeenCalledWith("trivia", expect.stringContaining('"type":"single"'));
    expect(mockUpdateFormField).toHaveBeenCalledWith("trivia", expect.stringContaining('"correct":["Rojo"]'));
  });

  it("updates the welcome video URL", () => {
    mockFormData.welcomeVideoEnabled = "true";
    render(<ExtrasSectionForm />);
    fireEvent.change(screen.getByPlaceholderText("setup.welcomeVideoPlaceholder"), { target: { value: "https://example.com/v.mp4" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("welcomeVideo", "https://example.com/v.mp4");
  });

  it("hides the welcome video input until its checkbox is selected", () => {
    render(<ExtrasSectionForm />);
    expect(screen.queryByPlaceholderText("setup.welcomeVideoPlaceholder")).toBeNull();
    mockFormData.welcomeVideoEnabled = "true";
    render(<ExtrasSectionForm />);
    expect(screen.getByPlaceholderText("setup.welcomeVideoPlaceholder")).toBeDefined();
  });
});
