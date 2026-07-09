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

const MusicPlayer = memo(function MusicPlayer({ musicUrl }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [open, setOpen] = useState(false);
  const audioRef = useRef(null);
  const name = useMemo(() => songName(musicUrl) || "Sin música", [musicUrl]);
  const hasMusic = Boolean(musicUrl);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !musicUrl) return;
    const onError = () => { setLoading(false); setError(true); setPlaying(false); };
    const onCanPlay = () => { setLoading(false); setError(false); };
    const onEnded = () => setPlaying(false);
    el.addEventListener("error", onError);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("error", onError);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEnded);
    };
  }, [musicUrl]);

  const handleVolume = useCallback((e) => {
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
      el.play().then(() => { setPlaying(true); setLoading(false); }).catch(() => { setLoading(false); setError(true); });
    }
  }, [playing, musicUrl]);

  return (
    <div className="music-player">
      {musicUrl ? <audio ref={audioRef} src={musicUrl} loop preload="auto" /> : null}
      <div className={`music-player__controls${open ? " music-player__controls--open" : ""}`}>
        {open ? (
          <>
            <span className="music-player__name">{name}</span>
            {error ? (
              <span className="music-player__error-inline">✕</span>
            ) : (
              <button type="button" className="music-player__btn" onClick={toggleMusic} disabled={loading || !hasMusic} aria-label={playing ? "Pausar" : "Reproducir"}>
                {loading ? (
                  <span className="music-player__spinner" />
                ) : !hasMusic ? "▶" : playing ? "⏸" : "▶"}
              </button>
            )}
            {playing ? (
              <span className="music-player__bars">
                {[3, 5, 4, 6, 3].map((h, i) => (
                  <span key={i} className="music-player__bar" style={{ height: h, animationDelay: `${i * 100}ms` }} />
                ))}
              </span>
            ) : null}
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolume} className="music-player__volume" aria-label="Volumen" disabled={!hasMusic} />
          </>
        ) : null}
      </div>
      <button
        type="button"
        className={`music-player__trigger${open ? " music-player__trigger--active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Música"
        title={name}
      >
        <svg viewBox="0 0 24 24" className="music-player__vinyl" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="#111" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6" />
        </svg>
        {!hasMusic ? <span className="music-player__no-music" aria-hidden="true" /> : null}
      </button>
    </div>
  );
});

export default MusicPlayer;
