/**
 * VoiceNotesSection — Caja de recuerdos de voz (diferencial).
 *
 * El invitado puede grabar una nota de voz corta para la pareja y escuchar las
 * ya grabadas. La grabación usa MediaRecorder (webm/ogg); el upload trocea y
 * cifra (voice-store). El borrado solo está disponible para admin/superadmin.
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { addVoiceNote, listVoiceNotes, loadVoiceNote, deleteVoiceNote } from "../../lib/voice-store";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../contexts";

interface VoiceNote {
  id: string;
  noteId: string;
  guestName: string;
  createdAt?: string;
}

const VoiceNotesSection = memo(function VoiceNotesSection({ inviteToken }: { inviteToken: string }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { isAdminTokenLoggedIn } = useAuth();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playingId, setPlayingId] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const refresh = useCallback(async () => {
    if (!inviteToken) return;
    const list = await listVoiceNotes(inviteToken);
    setNotes(
      list.map((c) => ({
        id: c.id,
        noteId: c.noteId,
        guestName: c.guestName,
        ...(c.createdAt ? { createdAt: c.createdAt } : {}),
      })),
    );
  }, [inviteToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => stream.getTracks().forEach((tr) => tr.stop());
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      addToast("error", t("voiceNotes.micError"));
    }
  }, [addToast, t]);

  const stopRecording = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    setBusy(true);
    const finish = () => {
      setRecording(false);
      recorderRef.current = null;
      setBusy(false);
    };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      if (blob.size < 1000) {
        addToast("error", t("voiceNotes.tooShort"));
        finish();
        return;
      }
      const name = window.prompt(t("voiceNotes.namePrompt"), "")?.trim() || t("voiceNotes.anonymous");
      try {
        await addVoiceNote(inviteToken, name, blob);
        addToast("success", t("voiceNotes.saved"));
        await refresh();
      } catch {
        addToast("error", t("voiceNotes.saveError"));
      }
      finish();
    };
    rec.stop();
  }, [inviteToken, refresh, addToast, t]);

  const play = useCallback(
    async (noteId: string) => {
      setPlayingId(noteId);
      try {
        const dataUrl = await loadVoiceNote(inviteToken, noteId);
        if (!dataUrl) {
          addToast("error", t("voiceNotes.playError"));
          setPlayingId("");
          return;
        }
        const audio = new Audio(dataUrl);
        audio.onended = () => setPlayingId("");
        audio.onerror = () => {
          setPlayingId("");
          addToast("error", t("voiceNotes.playError"));
        };
        void audio.play();
      } catch {
        setPlayingId("");
        addToast("error", t("voiceNotes.playError"));
      }
    },
    [inviteToken, addToast, t],
  );

  const remove = useCallback(
    async (noteId: string) => {
      if (!window.confirm(t("voiceNotes.deleteConfirm"))) return;
      await deleteVoiceNote(inviteToken, noteId);
      await refresh();
    },
    [inviteToken, refresh, t],
  );

  return (
    <div className="story-panel__inner">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
        <button
          type="button"
          className={`setup-button ${recording ? "setup-button--danger" : ""}`}
          onClick={() => (recording ? void stopRecording() : void startRecording())}
          disabled={busy}
          aria-pressed={recording}
        >
          {recording ? t("voiceNotes.stop") : t("voiceNotes.record")}
        </button>
        <p className="setup-help" style={{ margin: 0, fontSize: "0.75rem" }}>
          {t("voiceNotes.hint")}
        </p>
      </div>

      {notes.length > 0 ? (
        <ul style={{ margin: "0.75rem 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {notes.map((n) => (
            <li key={n.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--invite-title-color)" }}>
                🎙 {n.guestName}
                {n.createdAt ? (
                  <span style={{ color: "var(--invite-copy-color)", fontSize: "0.72rem", marginLeft: "0.35rem" }}>
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                ) : null}
              </span>
              <span style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void play(n.noteId)} disabled={playingId !== "" && playingId !== n.noteId}>
                  {playingId === n.noteId ? t("voiceNotes.playing") : "▶"}
                </button>
                {isAdminTokenLoggedIn ? (
                  <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void remove(n.noteId)}>
                    ✕
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="setup-help" style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", textAlign: "center" }}>
          {t("voiceNotes.empty")}
        </p>
      )}
    </div>
  );
});

export default VoiceNotesSection;
