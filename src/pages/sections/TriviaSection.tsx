import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "../../lib/storage-keys";

interface TriviaItem {
  q: string;
  /** "text" (respuesta libre), "single" (una opción) o "multiple" (varias). */
  type?: "text" | "single" | "multiple";
  /** Opciones de elección (single/multiple). */
  options?: string[];
  /** Respuesta correcta: string (text) o string[] (single/multiple). */
  correct?: string | string[];
  /** Retrocompatibilidad: respuesta de texto de las preguntas antiguas. */
  a?: string;
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
 * Comprueba si el intento del invitado acierta la respuesta de texto.
 * Comparación INDULGENTE pero por PALABRAS COMPLETAS: se divide tanto la
 * respuesta como el intento en tokens y se exige que cada palabra del intento
 * aparezca como palabra entera en la respuesta.
 */
function isTextMatch(guess: string, answer: string): boolean {
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
 * Comprueba si las opciones marcadas acertan (single/multiple):
 * exactamente las mismas opciones correctas (orden irrelevante).
 */
function isChoiceMatch(marked: string[], correct: string[]): boolean {
  const a = new Set(marked.map(normalizeTriviaText).filter(Boolean));
  const b = new Set(correct.map(normalizeTriviaText).filter(Boolean));
  if (a.size === 0) return false;
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * TriviaSection — Mini-quiz de la pareja. Soporta tres tipos de pregunta:
 * respuesta de texto libre ("text"), elección única ("single") y
 * multirrespuesta ("multiple"). El acierto se persiste en sessionStorage por
 * invitación (un refresco no pierde el marcador). Incluye marcador,
 * felicitación, pista opcional y dificultad.
 */
const TriviaSection = memo(function TriviaSection({ trivia, inviteToken }: { trivia?: string; inviteToken?: string }) {
  const { t } = useTranslation();

  const items = useMemo<TriviaItem[]>(() => {
    try {
      const parsed = JSON.parse(trivia || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((x): x is TriviaItem => !!x && typeof (x as TriviaItem).q === "string")
        : [];
    } catch {
      return [];
    }
  }, [trivia]);

  // Borradores (no persistidos) y estado de comprobado/acierto (persistido).
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Record<number, string[]>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [correctMap, setCorrectMap] = useState<Record<number, boolean>>({});

  const storageKey = useMemo(
    () => (inviteToken ? STORAGE_KEYS.triviaState(inviteToken) : ""),
    [inviteToken],
  );

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setRevealed((parsed.revealed as Record<number, boolean>) || {});
        setCorrectMap((parsed.correct as Record<number, boolean>) || {});
        // Se restauran también las opciones marcadas (elección única/
        // multirrespuesta) para que la pregunta se vea tal y como la dejó el
        // invitado (evita incoherencia visual tras recargar).
        setMarked((parsed.marked as Record<number, string[]>) || {});
      }
    } catch {
      /* almacenamiento no disponible o corrupto */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const data = { revealed, correct: correctMap, marked };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      /* cuota llena o modo privado */
    }
  }, [storageKey, revealed, correctMap, marked]);

  const sorted = useMemo(
    () =>
      items
        .map((it, i) => ({ it, i, order: DIFFICULTY_ORDER[it.difficulty ?? "easy"] ?? 0 }))
        .sort((a, b) => b.order - a.order || a.i - b.i),
    [items],
  );

  if (items.length === 0) return null;

  const typeOf = (item: TriviaItem): "text" | "single" | "multiple" =>
    item.type === "single" || item.type === "multiple" ? item.type : "text";

  const answerOf = (item: TriviaItem): string => (typeof item.correct === "string" ? item.correct : item.a || "");

  const correctAnswers = (item: TriviaItem): string[] => {
    const type = typeOf(item);
    if (type !== "text") {
      const c = Array.isArray(item.correct) ? item.correct : typeof item.correct === "string" ? [item.correct] : [];
      return c;
    }
    return answerOf(item) ? [answerOf(item)] : [];
  };

  const check = (index: number) => {
    const item = items[index]!;
    const type = typeOf(item);
    let ok: boolean;
    if (type === "text") {
      ok = isTextMatch((drafts[index] || "").trim(), answerOf(item));
    } else {
      ok = isChoiceMatch(marked[index] || [], correctAnswers(item));
    }
    setCorrectMap((p) => ({ ...p, [index]: ok }));
    setRevealed((p) => ({ ...p, [index]: true }));
  };

  const correctCount = items.reduce((acc, _item, i) => acc + (correctMap[i] ? 1 : 0), 0);
  const allCorrect = correctCount === items.length;

  const difficultyLabel = (d: TriviaItem["difficulty"] | undefined): string | null => {
    if (!d) return null;
    return t(`trivia.difficulty_${d}`);
  };

  return (
    <div className="trivia-quiz">
      <div className="trivia-score" role="status" aria-live="polite">
        {t("trivia.score", { correct: correctCount, total: items.length })}
      </div>
      {allCorrect && items.length > 0 ? (
        <p className="trivia-congrats" role="status">
          🎉 {t("trivia.congrats")}
        </p>
      ) : null}

      {sorted.map(({ it, i }) => {
        const type = typeOf(it);
        const isCorrect = revealed[i] && correctMap[i];
        const isWrong = revealed[i] && !correctMap[i];
        const diff = difficultyLabel(it.difficulty);
        const shownAnswer = type === "text" ? answerOf(it) : correctAnswers(it).join(", ");
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

            {type === "text" ? (
              <input
                className="setup-input"
                style={{ marginTop: "0.4rem" }}
                value={drafts[i] || ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [i]: e.target.value }))}
                placeholder={t("trivia.guessPlaceholder")}
                aria-label={t("trivia.guessPlaceholder")}
                disabled={revealed[i]}
              />
            ) : (
              <div style={{ marginTop: "0.4rem" }}>
                {(it.options || []).map((opt) => {
                  const checked = (marked[i] || []).includes(opt);
                  const inputType = type === "multiple" ? "checkbox" : "radio";
                  return (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.4rem", margin: "0.15rem 0", cursor: revealed[i] ? "default" : "pointer" }}>
                      <input
                        type={inputType}
                        checked={checked}
                        disabled={revealed[i]}
                        name={`trivia-q-${i}`}
                        onChange={() =>
                          setMarked((p) => {
                            const cur = p[i] || [];
                            if (type === "multiple") {
                              const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
                              return { ...p, [i]: next };
                            }
                            return { ...p, [i]: [opt] };
                          })
                        }
                        aria-label={opt}
                        style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }}
                      />
                      <span className="setup-subtitle" style={{ fontSize: "0.85rem" }}>
                        {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {!revealed[i] ? (
              <button
                type="button"
                className="setup-button setup-button--compact"
                style={{ marginTop: "0.4rem" }}
                onClick={() => check(i)}
                disabled={type === "text" ? !(drafts[i] || "").trim() : (marked[i] || []).length === 0}
              >
                {t("trivia.check")}
              </button>
            ) : null}
            {revealed[i] ? (
              <p className={`trivia-q__answer ${isCorrect ? "trivia-q__answer--ok" : "trivia-q__answer--ko"}`}>
                {isCorrect ? "✓" : "✗"} {shownAnswer}
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