import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEscapeKey } from "../hooks/useFocusTrap";

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
 
const MusicPlayer = memo(
  /** @param {{ musicUrl: string }} props */
  function MusicPlayer({ musicUrl }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const name = useMemo(() => songName(musicUrl) || t("music.noMusic"), [musicUrl, t]);
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
      setVisible(false);
      setTimeout(() => setOpen(false), 300);
    } else {
      setOpen(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }
  }, [open]);

  useEscapeKey(handleToggle, open);

  return (
    <div className="music-player">
      {musicUrl ? <audio ref={audioRef} src={musicUrl} loop preload="auto" /> : null}

      <div className={`music-player__card${open ? " music-player__card--open" : ""}${visible ? " music-player__card--visible" : ""}`}>
        {open ? (
          <>
            <div className="music-player__artwork">
              <span className="music-player__artwork-inner">
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                  <path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="7" cy="18" r="2.5" fill="currentColor"/>
                  <circle cx="18" cy="16" r="2.5" fill="currentColor"/>
                </svg>
              </span>
            </div>
            <span className="music-player__track">{name}</span>
            {error ? <span className="music-player__status">{t("music.loadError")}</span> : null}
            <div className="music-player__scrubber">
              <span className="music-player__time">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 1} step="0.1" value={currentTime} onChange={handleSeek} className="music-player__seek" disabled={!hasMusic} />
              <span className="music-player__time">{formatTime(duration)}</span>
            </div>
            <div className="music-player__actions">
              <button type="button" className="music-player__play" onClick={toggleMusic} disabled={loading || !hasMusic}>
                {loading ? <span className="music-player__spinner" /> : playing ? <span>⏸</span> : <span>▶</span>}
              </button>
            </div>
            <div className="music-player__volume-row">
              <span className="music-player__vol-icon">{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
              <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolume} className="music-player__volume" disabled={!hasMusic} />
            </div>
          </>
        ) : null}
      </div>

      <button type="button" className="music-player__fab" onClick={handleToggle} aria-label={t("music.label")}>
        {open ? (
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="7" cy="18" r="2" fill="currentColor"/>
            <circle cx="18" cy="16" r="2" fill="currentColor"/>
          </svg>
        )}
        {!hasMusic ? <span className="music-player__fab-dot" /> : null}
      </button>
    </div>
  );
});

export default MusicPlayer;
