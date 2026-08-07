import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection, addDoc, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { withWriteRetry } from "../../lib/async-utils";

interface Song { id: string; guestName: string; song: string; votes: number; }
const VOTED_KEY = "wedin_voted_songs";

/**
 * MusicPollSection — Encuesta de música para el DJ: los invitados sugieren
 * canciones y votan; el admin ve el ranking.
 *
 * ANTI-DOBLE-VOTO POR DEVICE: el voto se registra en sessionStorage
 * (`wedin_voted_songs`), por lo que un mismo navegador solo vota una vez por
 * canción. Limitación conocida y aceptada: el mismo usuario en otro
 * dispositivo o navegador puede votar de nuevo (no hay identidad verificada
 * ni login de invitado). El tope de votos por canción (regla Firestore,
 * increment-only con cap) evita el abuso masivo.
 */
export default function MusicPollSection({ inviteToken }: { inviteToken?: string }) {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [name, setName] = useState("");
  const [song, setSong] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const votedIds = useMemo(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem(VOTED_KEY) || "[]") as string[]); } catch { return new Set<string>(); }
  }, []);

  const load = useCallback(() => {
    if (!inviteToken) return;
    void getDocs(collection(db, "invitations", inviteToken, "songs")).then((snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as { guestName: string; song: string; votes: number }) }));
      setSongs(list.sort((a, b) => (b.votes || 0) - (a.votes || 0)));
    }).catch(() => {});
  }, [inviteToken]);

  useEffect(() => { load(); }, [load]);

  const suggest = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken || !song.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await withWriteRetry(() => addDoc(collection(db, "invitations", inviteToken, "songs"), {
        guestName: name.trim().slice(0, 60) || "—",
        song: song.trim().slice(0, 200),
        votes: 1,
        createdAt: serverTimestamp(),
      }));
      setSong("");
      load();
    } catch {
      setError(t("musicPoll.error"));
    } finally {
      setSending(false);
    }
  }, [inviteToken, song, name, sending, t, load]);

  const vote = useCallback(async (id: string) => {
    if (!inviteToken || votedIds.has(id)) return;
    try {
      await withWriteRetry(() => updateDoc(doc(db, "invitations", inviteToken, "songs", id), { votes: increment(1) }));
    } catch { return; }
    setSongs((p) => p.map((s) => (s.id === id ? { ...s, votes: (s.votes || 0) + 1 } : s)).sort((a, b) => (b.votes || 0) - (a.votes || 0)));
    votedIds.add(id);
    try { sessionStorage.setItem(VOTED_KEY, JSON.stringify([...votedIds])); } catch { }
  }, [inviteToken, votedIds]);

  return (
    <div>
      <div className="song-poll" aria-live="polite">
        {songs.length === 0 ? <p className="setup-help">{t("musicPoll.empty")}</p> : null}
        {songs.map((s) => (
          <div className="song-poll__item" key={s.id}>
            <div className="song-poll__info">
              <p className="song-poll__song">{s.song}</p>
              <p className="song-poll__guest">{s.guestName}</p>
            </div>
            <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => vote(s.id)} disabled={votedIds.has(s.id)} aria-label={t("musicPoll.vote")}>
              <span className="song-poll__votes">👍 {s.votes || 0}</span>
            </button>
          </div>
        ))}
      </div>
      <form className="notes-form" onSubmit={suggest}>
        <input className="setup-input" value={song} onChange={(e) => setSong(e.target.value)} placeholder={t("musicPoll.songPlaceholder")} maxLength={200} aria-label={t("musicPoll.songPlaceholder")} />
        <input className="setup-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("musicPoll.namePlaceholder")} maxLength={60} aria-label={t("musicPoll.namePlaceholder")} />
        {error ? <p className="setup-error" role="alert">{error}</p> : null}
        <button className="setup-button" type="submit" disabled={sending || !song.trim()}>{sending ? t("common.loading") : t("musicPoll.suggest")}</button>
      </form>
    </div>
  );
}
