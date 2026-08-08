import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface TriviaItem {
  q: string;
  a: string;
}

/** Normaliza un texto para comparar respuestas: minúsculas y sin acentos. */
function normalizeTriviaText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Comprueba si el intento del invitado acierta la respuesta de la pareja.
 * Comparación INDULGENTE pero por PALABRAS COMPLETAS: se divide tanto la
 * respuesta como el intento en tokens de palabras y se exige que cada
 * palabra del intento aparezca como palabra entera en la respuesta.
 *
 * Evita el falso positivo del substring ("boda" acertaba "bodega") sin
 * exigir exactitud total ("París 2024" acerta "París").
 */
function isTriviaMatch(guess: string, answer: string): boolean {
  const g = normalizeTriviaText(guess);
  const a = normalizeTriviaText(answer);
  if (!g) return false;
  if (g === a) return true;
  const tokens = a.split(/[^a-z0-9]+/).filter(Boolean);
  const guessTokens = g.split(/[^a-z0-9]+/).filter(Boolean);
  if (guessTokens.length === 0) return false;
  return guessTokens.every((word) => tokens.includes(word));
}

/**
 * TriviaSection — Mini-quiz de la pareja: cada pregunta se revela y el
 * invitado puede comprobar su respuesta contra la de los novios.
 */
const TriviaSection = memo(function TriviaSection({ trivia }: { trivia?: string }) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const items = useMemo<TriviaItem[]>(() => {
    try {
      const parsed = JSON.parse(trivia || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((x): x is TriviaItem => !!x && typeof x.q === "string" && typeof x.a === "string")
        : [];
    } catch {
      return [];
    }
  }, [trivia]);

  if (items.length === 0) return null;

  return (
    <div className="trivia-quiz">
      {items.map((item, i) => {
        const guess = (answers[i] || "").trim();
        const revealed = guess.length > 0;
        const correct = revealed && isTriviaMatch(guess, item.a);
        return (
          <div className="trivia-q" key={i}>
            <p className="trivia-q__text">
              {i + 1}. {item.q}
            </p>
            <input
              className="setup-input"
              style={{ marginTop: "0.4rem" }}
              value={answers[i] || ""}
              onChange={(e) => setAnswers((p) => ({ ...p, [i]: e.target.value }))}
              placeholder={t("trivia.guessPlaceholder")}
              aria-label={t("trivia.guessPlaceholder")}
            />
            {revealed ? (
              <p className={`trivia-q__answer ${correct ? "" : ""}`}>
                {correct ? "✓ " : "✗ "}
                {item.a}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );});

export default TriviaSection;
