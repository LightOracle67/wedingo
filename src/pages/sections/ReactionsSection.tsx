import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection, doc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { withWriteRetry } from "../../lib/async-utils";

const EMOJIS = ["❤️", "🎉", "😂"] as const;
const VOTE_KEY = "wedin_reacted";

/**
 * ReactionsSection — Reacciones a la invitación (❤️ 🎉 😂) con contador.
 * Cada dispositivo solo puede sumar 1 por emoji (sessionStorage).
 */
export default function ReactionsSection({ inviteToken }: { inviteToken?: string }) {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Lee los contadores actuales.
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    void getDocs(collection(db, "invitations", inviteToken, "reactions")).then((snap) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const c = d.data().count;
        if (typeof c === "number") next[d.id] = c;
      });
      setCounts(next);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [inviteToken]);

  // Emojis que este dispositivo ya ha reaccionado.
  const voted = useMemo(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem(VOTE_KEY) || "[]") as string[]); } catch { return new Set<string>(); }
  }, []);

  const react = useCallback(async (emoji: string) => {
    if (!inviteToken || voted.has(emoji)) return;
    const ref = doc(db, "invitations", inviteToken, "reactions", emoji);
    try {
      await withWriteRetry(() => updateDoc(ref, { count: increment(1) }));
    } catch {
      // Primer voto: el doc no existe.
      try { await withWriteRetry(() => setDoc(ref, { count: 1 })); } catch { return; }
    }
    setCounts((p) => ({ ...p, [emoji]: (p[emoji] || 0) + 1 }));
    voted.add(emoji);
    try { sessionStorage.setItem(VOTE_KEY, JSON.stringify([...voted])); } catch { }
  }, [inviteToken, voted]);

  if (loading) return null;

  return (
    <div className="reactions" role="group" aria-label={t("reactions.label")}>
      {EMOJIS.map((emoji) => {
        const reacted = voted.has(emoji);
        return (
          <button key={emoji} type="button" className={`reactions__btn${reacted ? " reactions__btn--active" : ""}`} onClick={() => react(emoji)} disabled={reacted} aria-pressed={reacted} aria-label={`${emoji} ${counts[emoji] || 0}`}>
            <span className="reactions__emoji" aria-hidden="true">{emoji}</span>
            <span className="reactions__count">{counts[emoji] || 0}</span>
          </button>
        );
      })}
    </div>
  );
}
