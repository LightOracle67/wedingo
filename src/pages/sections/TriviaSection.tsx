import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface TriviaItem { q: string; a: string; }

/**
 * TriviaSection — Mini-quiz de la pareja: cada pregunta se revela y el
 * invitado puede comprobar su respuesta contra la de los novios.
 */
export default function TriviaSection({ trivia }: { trivia?: string }) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const items = useMemo<TriviaItem[]>(() => {
    try {
      const parsed = JSON.parse(trivia || "[]");
      return Array.isArray(parsed) ? parsed.filter((x): x is TriviaItem => !!x && typeof x.q === "string" && typeof x.a === "string") : [];
    } catch { return []; }
  }, [trivia]);

  if (items.length === 0) return null;

  return (
    <div className="trivia-quiz">
      {items.map((item, i) => {
        const guess = (answers[i] || "").trim().toLowerCase();
        const revealed = guess.length > 0;
        const correct = revealed && (guess === item.a.toLowerCase() || item.a.toLowerCase().includes(guess));
        return (
          <div className="trivia-q" key={i}>
            <p className="trivia-q__text">{i + 1}. {item.q}</p>
            <input className="setup-input" style={{ marginTop: "0.4rem" }} value={answers[i] || ""} onChange={(e) => setAnswers((p) => ({ ...p, [i]: e.target.value }))} placeholder={t("trivia.guessPlaceholder")} aria-label={t("trivia.guessPlaceholder")} />
            {revealed ? (
              <p className={`trivia-q__answer ${correct ? "" : ""}`}>
                {correct ? "✓ " : "✗ "}{item.a}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
