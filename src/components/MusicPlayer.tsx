import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEscapeKey } from "../hooks/useFocusTrap";
import "../styles/music.css";

function songName(musicUrl: any, t: any) {
  if (!musicUrl) return "";
  if (musicUrl.startsWith("data:")) return t("setup.currentMusic");
  try {
    const u = new URL(musicUrl);
    const path = u.pathname;
    const last = path.split("/").filter(Boolean).pop() || "";
    const name = decodeURIComponent(last).replace(/\.[^.]+$/, "");
    return name.replace(/[-_]+/g, " ").trim();
  } catch {
    return "";
  }
}

const MusicPlayer = memo(function MusicPlayer({ musicUrl }: any) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [open, setOpen] = useState(false);
  const [iconKey, setIconKey] = useState(0);
  const audioRef = useRef<any>(null);
  const name = useMemo(() => songName(musicUrl, t) || t("music.noMusic"), [musicUrl, t]);
  const hasMusic = Boolean(musicUrl);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !musicUrl) return;
    const onError = () => { setLoading(false); setError(true); setPlaying(false); };
    const onEnded = () => setPlaying(false);
    const onPlay = () => { setPlaying(true); setError(false); setLoading(false); };
    const onPause = () => { setPlaying(false); };
    const onPlayAudio = () => { el.play().then(() => setPlaying(true)).catch(() => {}); };
    el.addEventListener("error", onError);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    window.addEventListener("wedin:play-audio", onPlayAudio);
    return () => {
      el.removeEventListener("error", onError);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      window.removeEventListener("wedin:play-audio", onPlayAudio);
    };
  }, [musicUrl]);

  const handleVolume = useCallback((e: any) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const toggleMusic = useCallback(() => {
    const el = audioRef.current;
    if (!el || !musicUrl) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      setError(false);
      setLoading(true);
      setIconKey((k) => k + 1);
      el.play().then(() => { setPlaying(true); setLoading(false); }).catch(() => { setLoading(false); setError(true); setPlaying(false); });
    }
  }, [playing, musicUrl]);

  const handleToggle = useCallback(() => {
    setOpen((p) => !p);
    setIconKey((k) => k + 1);
  }, []);

  useEscapeKey(handleToggle, open);

  return (
    <div className="music-player">
      {musicUrl ? <audio ref={audioRef} src={musicUrl} loop autoPlay preload="auto" /> : null}

      <div className={`music-player__card${open ? " music-player__card--open" : ""}`}>
        <span className="music-player__track">{name}</span>
        {error ? <span className="music-player__status">{t("music.loadError")}</span> : null}
        <div className="music-player__controls">
          <button type="button" className={`music-player__play${playing ? " music-player__play--active" : ""}`} onClick={toggleMusic} disabled={loading || !hasMusic}>
            {loading ? <span className="music-player__spinner" /> : playing ? <span>⏸</span> : <span>▶</span>}
          </button>
          <div className="music-player__volume-row">
            <span className="music-player__vol-icon">{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolume} className="music-player__volume" disabled={!hasMusic} />
          </div>
        </div>
      </div>

      <button type="button" className={`music-player__fab${playing ? " music-player__fab--playing" : ""}${open ? " music-player__fab--shifted" : ""}`} onClick={handleToggle} aria-label={t("music.label")}>
        <span key={iconKey} className={`music-player__fab-icon${open || playing ? " music-player__fab-icon--spin" : ""}`}>♪</span>
        {!hasMusic ? <span className="music-player__fab-dot" /> : null}
        <span className={`music-player__fab-equalizer${playing ? " music-player__fab-equalizer--visible" : ""}`}><span /><span /><span /></span>
      </button>
    </div>
  );
});

export default MusicPlayer;
