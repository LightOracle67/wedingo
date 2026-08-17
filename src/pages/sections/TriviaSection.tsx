import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "../../lib/storage-keys";

interface TriviaItem {
  q: string;
  a: string;
  hint?: string;
  difficulty?: "easy" | "medium" | "hard";
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

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * TriviaSection — Mini-quiz de la pareja (diferenciador). Cada pregunta se
 * responde con un botón de "comprobar" (más accesible que revelar al teclear):
 * el estado "respondida + acierto" se persiste en sessionStorage para que un
 * refresco no pierda el marcador. Incluye marcador de aciertos, pista
 * opcional, etiqueta de dificultad y felicitación al acertar todas.
 */
const TriviaSection = memo(function TriviaSection({ trivia, inviteToken }: { trivia?: string; inviteToken?: string }) {
  const { t } = useTranslation();

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

  // Estado por pregunta: respuesta escrita (no persistido) + si ya se comprobó
  // y si acertó (persistido en sessionStorage por invitación).
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [correctMap, setCorrectMap] = useState<Record<number, boolean>>({});

  // Clave de persistencia por invitación (evita mezclar invitaciones).
  const storageKey = useMemo(
    () => (inviteToken ? STORAGE_KEYS.triviaState(inviteToken) : ""),
    [inviteToken],
  );

  // Restaura el estado guardado al montar (una sola vez por carga).
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setRevealed((parsed.revealed as Record<number, boolean>) || {});
        setCorrectMap((parsed.correct as Record<number, boolean>) || {});
      }
    } catch {
      /* almacenamiento no disponible o corrupto: se ignora */
    }
  }, [storageKey]);

  // Persiste el estado revelado tras cada cambio (solo en el invitado).
  useEffect(() => {
    if (!storageKey) return;
    const data = { revealed, correct: correctMap };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      /* cuota llena o modo privado: no crítico */
    }
  }, [storageKey, revealed, correctMap]);

  // Marca "mejores" preguntas (las más difíciles primero).
  const sorted = useMemo(
    () =>
      items
        .map((it, i) => ({ it, i, order: DIFFICULTY_ORDER[it.difficulty ?? "easy"] ?? 0 }))
        .sort((a, b) => b.order - a.order || a.i - b.i),
    [items],
  );

  if (items.length === 0) return null;

  const correctCount = items.reduce((acc, _, i) => acc + (correctMap[i] ? 1 : 0), 0);
  const allCorrect = correctCount === items.length;

  const check = (index: number, guess: string) => {
    setCorrectMap((p) => ({ ...p, [index]: isTriviaMatch(guess, items[index]!.a) }));
    setRevealed((p) => ({ ...p, [index]: true }));
  };

  const difficultyLabel = (d: TriviaItem["difficulty"] | undefined): string | null => {
    if (!d) return null;
    return t(`trivia.difficulty_${d}`);
  };

  return (
    <div className="trivia-quiz">
      {/* Marcador de aciertos + felicitación al completar */}
      <div className="trivia-score" role="status" aria-live="polite">
        {t("trivia.score", { correct: correctCount, total: items.length })}
      </div>
      {allCorrect && items.length > 0 ? (
        <p className="trivia-congrats" role="status">
          🎉 {t("trivia.congrats")}
        </p>
      ) : null}

      {sorted.map(({ it, i }) => {
        const guess = (drafts[i] || "").trim();
        const isCorrect = revealed[i] && correctMap[i];
        const isWrong = revealed[i] && !correctMap[i];
        const diff = difficultyLabel(it.difficulty);
        return (
          <div className={`trivia-q ${isCorrect ? "trivia-q--correct" : ""} ${isWrong ? "trivia-q--wrong" : ""}`} key={i}>
            <p className="trivia-q__text">
              {i + 1}. {it.q}
              {diff ? (
                <span className="trivia-q__difficulty" aria-label={diff}>
                  {diff}
                </span>
              ) : null}
            </p>
            <input
              className="setup-input"
              style={{ marginTop: "0.4rem" }}
              value={drafts[i] || ""}
              onChange={(e) => setDrafts((p) => ({ ...p, [i]: e.target.value }))}
              placeholder={t("trivia.guessPlaceholder")}
              aria-label={t("trivia.guessPlaceholder")}
              disabled={revealed[i]}
            />
            {!revealed[i] ? (
              <button
                type="button"
                className="setup-button setup-button--compact"
                style={{ marginTop: "0.4rem" }}
                onClick={() => check(i, guess)}
                disabled={!guess}
              >
                {t("trivia.check")}
              </button>
            ) : null}
            {revealed[i] ? (
              <p className={`trivia-q__answer ${isCorrect ? "trivia-q__answer--ok" : "trivia-q__answer--ko"}`}>
                {isCorrect ? "✓" : "✗"} {it.a}
              </p>
            ) : null}
            {!revealed[i] && it.hint ? (
              <p className="trivia-q__hint">
                💡 {t("trivia.hintLabel")}: {it.hint}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});

export default TriviaSection;