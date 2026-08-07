import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { doc, updateDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { withWriteRetry } from "../../lib/async-utils";
import { useInviteSubcollection } from "../../hooks/useInviteSubcollection";

const EMOJIS = ["❤️", "🎉", "😂"] as const;
const VOTE_KEY = "wedin_reacted";

/**
 * ReactionsSection — Reacciones a la invitación (❤️ 🎉 😂) con contador.
 *
 * ANTI-DOBLE-VOTO POR DEVICE: cada dispositivo solo suma 1 por emoji
 * (sessionStorage `wedin_reacted`). Limitación conocida y aceptada: el mismo
 * usuario desde otro dispositivo/navegador puede volver a reaccionar (no hay
 * identidad verificada). La regla Firestore (increment-only con cap 10000)
 * evita el abuso masivo.
 */
export default function ReactionsSection({ inviteToken }: { inviteToken?: string }) {
  const { t } = useTranslation();

  // Lectura de contadores: el hook maneja la subcolección; aquí se convierte
  // la lista de {id, count} a un Record<emoji, number>.
  const { items: reactionDocs } = useInviteSubcollection<{ id: string; count: number }>(inviteToken, "reactions", {
    map: ({ id, data }) => ({ id, count: typeof data.count === "number" ? data.count : 0 }),
  });
  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const r of reactionDocs) next[r.id] = r.count;
    return next;
  }, [reactionDocs]);

  // Emojis que este dispositivo ya ha reaccionado.
  const voted = useMemo(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(VOTE_KEY) || "[]") as string[]);
    } catch {
      return new Set<string>();
    }
  }, []);

  const react = useCallback(
    async (emoji: string) => {
      if (!inviteToken || voted.has(emoji)) return;
      const ref = doc(db, "invitations", inviteToken, "reactions", emoji);
      try {
        await withWriteRetry(() => updateDoc(ref, { count: increment(1) }));
      } catch {
        // Primer voto: el doc no existe.
        try {
          await withWriteRetry(() => setDoc(ref, { count: 1 }));
        } catch {
          return;
        }
      }
      voted.add(emoji);
      try {
        sessionStorage.setItem(VOTE_KEY, JSON.stringify([...voted]));
      } catch {}
    },
    [inviteToken, voted],
  );

  return (
    <div className="reactions" role="group" aria-label={t("reactions.label")}>
      {EMOJIS.map((emoji) => {
        const reacted = voted.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            className={`reactions__btn${reacted ? " reactions__btn--active" : ""}`}
            onClick={() => react(emoji)}
            disabled={reacted}
            aria-pressed={reacted}
            aria-label={`${emoji} ${counts[emoji] || 0}`}
          >
            <span className="reactions__emoji" aria-hidden="true">
              {emoji}
            </span>
            <span className="reactions__count">{counts[emoji] || 0}</span>
          </button>
        );
      })}
    </div>
  );
}
