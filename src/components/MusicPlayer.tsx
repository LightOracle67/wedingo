import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEscapeKey } from "../hooks/useFocusTrap";
import "../styles/music.css";

function songName(url: any) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("soundcloud.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1]?.replace(/[-_]+/g, " ") || "";
    }
    const path = u.pathname;
    const last = path.split("/").filter(Boolean).pop() || "";
    const name = decodeURIComponent(last).replace(/\.[^.]+$/, "");
    return name.replace(/[-_]+/g, " ").trim();
  } catch {
    return "";
  }
}

function isSoundCloud(url: any) {
  if (!url) return false;
  try { return new URL(url).hostname.includes("soundcloud.com"); }
  catch { return false; }
}

function formatTime(sec: any) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
 
const MusicPlayer = memo(
  /** @param {{ musicUrl: string }} props */
  function MusicPlayer({ musicUrl }: any) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<any>(null);
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

  const handleVolume = useCallback((e: any) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const handleSeek = useCallback((e: any) => {
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

  const isSc = isSoundCloud(musicUrl);

  return (
    <div className="music-player">
      {musicUrl && !isSc ? <audio ref={audioRef} src={musicUrl} loop preload="auto" /> : null}
      {musicUrl && isSc ? (
        <iframe
          title={name}
          width="0"
          height="0"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(musicUrl)}&auto_play=false&show_artwork=false&show_comments=false&show_user=false&show_playcount=false&color=%23d8b24a&hide_related=true&visual=false&liking=false&sharing=false&buying=false&download=false`}
        />
      ) : null}

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
            {isSc ? (
              <div className="music-player__scrubber" style={{ flexDirection: "column", gap: "0.35rem" }}>
                <p className="setup-help" style={{ textAlign: "center", margin: 0, fontSize: "0.75rem" }}>
                  {t("music.soundCloudNote")}
                </p>
                <a href={musicUrl} target="_blank" rel="noopener noreferrer" className="setup-button setup-button--compact"
                  style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", textAlign: "center", display: "inline-block" }}>
                  {t("music.openInSoundCloud")}
                </a>
              </div>
            ) : (
              <>
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
            )}
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
