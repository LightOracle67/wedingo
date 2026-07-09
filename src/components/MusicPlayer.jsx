import { memo, useCallback, useEffect, useRef, useState } from "react";

const MusicPlayer = memo(function MusicPlayer({ musicUrl }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef(null);

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
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      setError(false);
      setLoading(true);
      el.play().then(() => { setPlaying(true); setLoading(false); }).catch(() => { setLoading(false); setError(true); });
    }
  }, [playing]);

  if (!musicUrl) return null;

  return (
    <div className="music-player">
      <audio ref={audioRef} src={musicUrl} loop preload="auto" />
      {error ? (
        <span className="music-player__error">⚠</span>
      ) : (
        <div className="music-player__controls">
          <button type="button" className="music-player__btn" onClick={toggleMusic} disabled={loading} aria-label={playing ? "Pausar" : "Reproducir"}>
            {loading ? (
              <span className="music-player__spinner" />
            ) : playing ? "⏸" : "▶"}
          </button>
          {playing ? (
            <span className="music-player__bars">
              {[3, 5, 4, 6, 3].map((h, i) => (
                <span key={i} className="music-player__bar" style={{ height: h, animationDelay: `${i * 100}ms` }} />
              ))}
            </span>
          ) : null}
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolume} className="music-player__volume" aria-label="Volumen" />
        </div>
      )}
    </div>
  );
});

export default MusicPlayer;
