/**
 * MusicArrayEditor — Editor de música de fondo.
 * 
 * Permite subir un archivo de audio (MP3/WAV/OGG/M4A) que se comprime
 * a 22kHz mono, se cifra y se almacena fragmentado en la subcolección
 * invitations/{token}/audio. Incluye reproductor con play/pause.
 *
 * @param {string} inviteToken - Token de la invitación
 * @param {string} value - URL del audio actual
 * @param {function} onChange - Callback al cambiar el audio
 * @param {object} t - Función de traducción i18next
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../hooks/useToast";
import { withTimeout } from "../lib/async-utils";

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
  "audio/m4a", "audio/aac", "audio/webm", "audio/x-m4a",
];
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const MusicArrayEditor = memo(function MusicArrayEditor({ inviteToken, value, onChange, t }: any) {
  const { addToast, startUploadToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const audioRef = useRef<any>(null);

  useEffect(() => {
    if (!inviteToken) { setLoading(false); return; }
    (async () => {
      try {
        const { loadAudio } = await import("../lib/music-store");
        const result = await loadAudio(inviteToken);
        if (result?.url) {
          setAudioId(result.id);
          onChange(result.url);
        }
      } catch {
        addToast("error", t("errors.musicLoadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteToken, onChange, addToast, t]);

  const handleFile = useCallback(async (e: any) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    if (file.size === 0) { addToast("error", t("setup.errorEmptyFile")); if (input) input.value = ""; return; }
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      addToast("error", t("setup.audioFormatError"));
      if (input) input.value = "";
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      addToast("error", t("setup.audioSizeError"));
      if (input) input.value = "";
      return;
    }

    setUploading(true);
    const upload = startUploadToast(t("setup.musicUploading"));
    try {
      const { uploadAudio, addAudio, deleteAudio } = await import("../lib/music-store");
      const { encrypted, dataUrl } = await withTimeout(uploadAudio(inviteToken, file, (p) => upload.update(p)), 60000, "Audio upload timed out");
      if (audioId) {
        await deleteAudio(inviteToken);
      }
      const saved = await addAudio(inviteToken, encrypted, dataUrl, (p) => upload.update(85 + Math.round(p * 0.1)));
      setAudioId(saved.id);
      setFileName(file.name);
      setFileSize(file.size);
      onChange(dataUrl);
      upload.complete(t("setup.musicUploadSuccess"));
    } catch {
      upload.error(t("setup.musicUploadFailed"));
    } finally {
      setUploading(false);
    }
    if (input) input.value = "";
  }, [inviteToken, audioId, onChange, startUploadToast, addToast, t]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  }, [playing]);

  const handleDelete = useCallback(async () => {
    if (!audioId || !inviteToken) return;
    try {
      const { deleteAudio } = await import("../lib/music-store");
      await deleteAudio(inviteToken);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      setAudioId(null);
      setPlaying(false);
      setFileName("");
      setFileSize(0);
      onChange("");
    } catch {
      addToast("error", t("errors.musicDeleteFailed"));
    }
  }, [audioId, inviteToken, onChange, addToast, t]);

  if (loading) {
    return <div className="page-loading" style={{ minHeight: "4rem" }} />;
  }

  const hasMusic = Boolean(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {hasMusic ? (
        <div style={{
          border: "1px solid var(--setup-border)",
          borderRadius: "0.5rem",
          padding: "0.75rem",
          background: "color-mix(in srgb, var(--setup-field-bg) 30%, transparent)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🎵</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--setup-title)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fileName || t("setup.musicFile")}
              </p>
              {fileSize > 0 ? (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--setup-muted)" }}>{formatSize(fileSize)}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              style={{
                width: "1.6rem", height: "1.6rem", borderRadius: "999px", border: "none",
                background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: "0.85rem",
                cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1, flexShrink: 0,
              }}
              aria-label={t("common.delete")}
            >×</button>
          </div>
          <audio ref={audioRef} src={value} loop preload="auto" style={{ display: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={togglePlay}
              style={{
                width: "2.2rem", height: "2.2rem", borderRadius: "999px", border: "none",
                background: "var(--setup-accent)", color: "#fff", fontSize: "1rem",
                cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0,
              }}
              aria-label={playing ? t("music.pause") : t("music.play")}
            >{playing ? "⏸" : "▶"}</button>
            <span style={{ fontSize: "0.8rem", color: "var(--setup-muted)" }}>
              {playing ? t("music.playing") : t("setup.currentMusic")}
            </span>
          </div>
          <label style={{
            textAlign: "center", cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "0.8rem", color: "var(--setup-accent)", textDecoration: "underline",
            opacity: uploading ? 0.5 : 1,
          }}>
            {uploading ? t("setup.musicUploading") : t("setup.replaceMusic")}
            <input
              type="file"
              accept={ALLOWED_AUDIO_TYPES.join(",")}
              style={{ display: "none" }}
              onChange={handleFile}
              disabled={uploading}
            />
          </label>
        </div>
      ) : (
        <label
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            minHeight: "120px", border: "2px dashed var(--setup-border)", borderRadius: "0.5rem",
            cursor: uploading ? "not-allowed" : "pointer", color: "var(--setup-muted)",
            fontSize: "0.85rem", gap: "0.35rem", opacity: uploading ? 0.5 : 1,
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>＋</span>
          <span>{uploading ? t("setup.musicUploading") : t("setup.musicUploadLabel")}</span>
          <span style={{ fontSize: "0.75rem" }}>{t("setup.audioHint")}</span>
          <input
            type="file"
            accept={ALLOWED_AUDIO_TYPES.join(",")}
            style={{ display: "none" }}
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
});

export default MusicArrayEditor;
