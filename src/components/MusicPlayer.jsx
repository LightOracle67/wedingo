import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

function songName(url) {
  if (!url) return "";
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").filter(Boolean).pop() || "";
    const name = decodeURIComponent(last).replace(/\.[^.]+$/, "");
    return name.replace(/[-_]+/g, " ").trim();
  } catch {
    return "";
  }
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const MusicPlayer = memo(function MusicPlayer({ musicUrl }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [open, setOpen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const name = useMemo(() => songName(musicUrl) || "Sin música", [musicUrl]);
  const hasMusic = Boolean(musicUrl);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !musicUrl) return;
    const onError = () => { setLoading(false); setError(true); setPlaying(false); };
    const onCanPlay = () => { setLoading(false); setError(false); setDuration(el.duration || 0); };
    const onEnded = () => setPlaying(false);
    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => setDuration(el.duration || 0);
    el.addEventListener("error", onError);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    return () => {
      el.removeEventListener("error", onError);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [musicUrl]);

  const handleVolume = useCallback((e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const handleSeek = useCallback((e) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
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
      el.play().then(() => { setPlaying(true); setLoading(false); }).catch(() => { setLoading(false); setError(true); });
    }
  }, [playing, musicUrl]);

  const handleToggle = useCallback(() => {
    if (open) {
      setShowControls(false);
      setTimeout(() => setOpen(false), 300);
    } else {
      setOpen(true);
      setTimeout(() => setShowControls(true), 350);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") handleToggle(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleToggle]);

  return (
    <div className={`music-player${open ? " music-player--open" : ""}`}>
      {musicUrl ? <audio ref={audioRef} src={musicUrl} loop preload="auto" /> : null}

      <button
        type="button"
        className={`music-player__fab${open ? " music-player__fab--expanded" : ""}`}
        onClick={handleToggle}
        aria-label="Música"
      >
        <span className={`music-player__fab-icon${playing ? " music-player__fab-icon--spin" : ""}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
            <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </span>
        {!hasMusic ? <span className="music-player__fab-dot" /> : null}

        <div className={`music-player__body${showControls ? " music-player__body--visible" : ""}`}>
          <div className="music-player__artwork">
            <span className={`music-player__artwork-inner${playing ? " music-player__artwork-inner--spin" : ""}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
                <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </span>
          </div>

          <div className="music-player__info">
            <span className="music-player__track">{name}</span>
            {error ? <span className="music-player__status">Error al cargar</span> : null}
          </div>

          <div className="music-player__scrubber">
            <span className="music-player__time">{formatTime(currentTime)}</span>
            <input type="range" min="0" max={duration || 1} step="0.1" value={currentTime} onChange={handleSeek} className="music-player__seek" disabled={!hasMusic} aria-label="Progreso" />
            <span className="music-player__time">{formatTime(duration)}</span>
          </div>

          <div className="music-player__actions">
            <button type="button" className="music-player__play" onClick={toggleMusic} disabled={loading || !hasMusic} aria-label={playing ? "Pausar" : "Reproducir"}>
              {loading ? (
                <span className="music-player__spinner" />
              ) : playing ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.2" /><rect x="14" y="4" width="5" height="16" rx="1.2" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="7,4 20,12 7,20" /></svg>
              )}
            </button>
          </div>

          <div className="music-player__volume-row">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5">
              <polygon points="3,9 7,9 12,4 12,20 7,15 3,15" />
              {volume > 0 ? <><path d="M15,9a4.5,4.5 0 0 1 0,6" /><path d="M18,6a9,9 0 0 1 0,12" /></> : null}
            </svg>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolume} className="music-player__volume" disabled={!hasMusic} aria-label="Volumen" />
          </div>
        </div>
      </button>
    </div>
  );
});

export default MusicPlayer;
