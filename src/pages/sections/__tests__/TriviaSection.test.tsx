import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import TriviaSection from "../TriviaSection";

const TRIVIA = JSON.stringify([
  { q: "¿Dónde se conocieron?", a: "En el parque" },
  { q: "¿Canción de la boda?", a: "Algo contigo" },
]);

describe("TriviaSection", () => {
  it("renders questions and reveals answers after guessing", () => {
    render(<TriviaSection trivia={TRIVIA} />);
    expect(screen.getByText("1. ¿Dónde se conocieron?")).toBeDefined();
    expect(screen.getByText("2. ¿Canción de la boda?")).toBeDefined();
    // Sin respuesta aún no se muestra la solución.
    expect(screen.queryByText(/En el parque/i)).toBeNull();
  });

  it("reveals the answer when the guest guesses", () => {
    render(<TriviaSection trivia={TRIVIA} />);
    const inputs = screen.getAllByPlaceholderText("trivia.guessPlaceholder");
    fireEvent.change(inputs[0]!, { target: { value: "en el parque" } });
    expect(screen.getByText(/En el parque/i)).toBeDefined();
  });

  it("renders nothing without trivia", () => {
    render(<TriviaSection trivia="[]" />);
    expect(screen.queryByText(/trivia/i)).toBeNull();
  });
});
