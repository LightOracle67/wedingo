import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import TriviaSection from "../TriviaSection";

const TRIVIA = JSON.stringify([
  { q: "¿Dónde se conocieron?", a: "En el parque" },
  { q: "¿Canción de la boda?", a: "Algo contigo" },
]);

const TRIVIA_ADVANCED = JSON.stringify([
  { q: "¿Dónde se conocieron?", a: "En el parque", hint: "Es verde", difficulty: "easy" },
  { q: "¿Año del primer viaje?", a: "2019", difficulty: "hard" },
]);

describe("TriviaSection", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("renders questions and shows the check button without revealing yet", () => {
    render(<TriviaSection trivia={TRIVIA} />);
    expect(screen.getByText("1. ¿Dónde se conocieron?")).toBeDefined();
    expect(screen.getByText("2. ¿Canción de la boda?")).toBeDefined();
    // Sin pulsar comprobar aún no se muestra la solución.
    expect(screen.queryByText(/En el parque/)).toBeNull();
    expect(screen.getAllByText("trivia.check").length).toBeGreaterThan(0);
  });

  it("reveals a correct answer only after pressing check", () => {
    render(<TriviaSection trivia={TRIVIA} />);
    const inputs = screen.getAllByPlaceholderText("trivia.guessPlaceholder");
    fireEvent.change(inputs[0]!, { target: { value: "en el parque" } });
    // Todavía NO se revela (hace falta pulsar comprobar).
    expect(screen.queryByText(/En el parque/)).toBeNull();
    fireEvent.click(screen.getAllByText("trivia.check")[0]!);
    expect(screen.getByText(/✓ En el parque/)).toBeDefined();
  });

  it("renders nothing without trivia", () => {
    render(<TriviaSection trivia="[]" />);
    expect(screen.queryByText(/trivia/i)).toBeNull();
  });

  it("marks an incorrect answer with ✗ and reveals the solution after check", () => {
    render(<TriviaSection trivia={TRIVIA} />);
    const inputs = screen.getAllByPlaceholderText("trivia.guessPlaceholder");
    fireEvent.change(inputs[0]!, { target: { value: "Madrid" } });
    fireEvent.click(screen.getAllByText("trivia.check")[0]!);
    expect(screen.getByText(/✗ En el parque/)).toBeDefined();
  });

  it("shows the score counter", () => {
    render(<TriviaSection trivia={TRIVIA} />);
    const inputs = screen.getAllByPlaceholderText("trivia.guessPlaceholder");
    fireEvent.change(inputs[0]!, { target: { value: "en el parque" } });
    fireEvent.click(screen.getAllByText("trivia.check")[0]!);
    expect(screen.getByText("trivia.score")).toBeDefined();
  });

  it("shows a congratulations message when all answers are correct", () => {
    // Respuestas que acertan por palabra completa (matching parcial indulgente).
    const easy = JSON.stringify([{ q: "A", a: "en el parque" }, { q: "B", a: "algo contigo" }]);
    render(<TriviaSection trivia={easy} />);
    const inputs = screen.getAllByPlaceholderText("trivia.guessPlaceholder");
    fireEvent.change(inputs[0]!, { target: { value: "parque" } });
    fireEvent.click(screen.getAllByText("trivia.check")[0]!);
    fireEvent.change(inputs[1]!, { target: { value: "contigo" } });
    fireEvent.click(screen.getAllByText("trivia.check")[0]!);
    // El texto real es "🎉 trivia.congrats" (emoji + clave): regex parcial.
    expect(screen.getByText(/trivia\.congrats/)).toBeDefined();
  });

  it("shows optional hint and difficulty label", () => {
    render(<TriviaSection trivia={TRIVIA_ADVANCED} />);
    // La pista se compone como "💡 trivia.hintLabel: Es verde" (texto completo).
    expect(screen.getByText(/Es verde/)).toBeDefined();
    // La dificultad se muestra como chip con aria-label traducido.
    expect(screen.getAllByLabelText("trivia.difficulty_easy").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("trivia.difficulty_hard").length).toBeGreaterThan(0);
  });

  it("persists the revealed state in sessionStorage per invitation", () => {
    const { unmount } = render(<TriviaSection trivia={TRIVIA} inviteToken="tok" />);
    const inputs = screen.getAllByPlaceholderText("trivia.guessPlaceholder");
    fireEvent.change(inputs[0]!, { target: { value: "en el parque" } });
    fireEvent.click(screen.getAllByText("trivia.check")[0]!);
    const saved = JSON.parse(sessionStorage.getItem("wedin_trivia_tok") || "{}");
    expect(saved.revealed && saved.revealed[0]).toBe(true);
    unmount();
    // Al volver a montar (misma clave) las respuestas reveladas se restauran.
    render(<TriviaSection trivia={TRIVIA} inviteToken="tok" />);
    expect(screen.getByText(/✓ En el parque/)).toBeDefined();
  });

  it("tolerates invalid trivia JSON", () => {
    render(<TriviaSection trivia="no es json" />);
    expect(screen.queryByText(/trivia/i)).toBeNull();
  });
});
