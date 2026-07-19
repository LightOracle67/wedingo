import { memo, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const CLIENT_ID = import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID || "";
const API = "https://api.soundcloud.com";

const WEDDING_QUERIES = [
  "wedding song", " wedding music", "love song instrumental",
  "cancion boda", "musica boda", "walk down the aisle",
  "first dance song", "wedding instrumental", "proposal music",
  "classical wedding", "guitar wedding", "piano wedding",
];

function formatDuration(ms: any) {
  if (!ms) return "";
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const TrackResult = memo(function TrackResult({ track, onPreview, onSelect, isSelected, previewTrackId }: any) {
  const { t } = useTranslation();
  const isPreviewing = previewTrackId === track.id;
  return (
    <div className={`setup-background-card ${isSelected ? "setup-background-card--active" : ""}`}
      style={{ display: "grid", gap: "0.45rem", padding: "0.6rem", borderRadius: "1rem", border: `1px solid ${isSelected ? "var(--setup-accent)" : "color-mix(in srgb, var(--setup-title) 16%, transparent)"}`, background: isSelected ? "color-mix(in srgb, var(--setup-accent) 10%, transparent)" : "transparent" }}>
      {track.artwork_url ? (
        <img src={track.artwork_url.replace("-large.", "-t300x300.")} alt={track.title}
          style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "0.65rem" }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "1", borderRadius: "0.65rem", background: "color-mix(in srgb, var(--setup-muted) 20%, transparent)", display: "grid", placeItems: "center", color: "var(--setup-muted)", fontSize: "0.75rem" }}>
          {t("setup.noArtwork")}
        </div>
      )}
      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--setup-title)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {track.title}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--setup-muted)" }}>
        {track.user?.username} · {formatDuration(track.duration)}
      </div>
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        <button type="button" className="setup-button setup-button--compact"
          style={{ flex: 1, fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
          onClick={() => onPreview(track.id, track.permalink_url)}>
          {isPreviewing ? t("setup.previewing") : t("setup.preview")}
        </button>
        <button type="button"
          className={`setup-button setup-button--compact ${isSelected ? "setup-button--ghost" : ""}`}
          style={{ flex: 1, fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
          onClick={() => onSelect(track)}>
          {isSelected ? t("setup.selected") : t("setup.select")}
        </button>
      </div>
      {isPreviewing && (
        <div style={{ marginTop: "0.25rem" }}>
          <iframe
            title={`Preview ${track.title}`}
            width="100%"
            height="80"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(track.permalink_url)}&auto_play=true&show_artwork=false&show_comments=false&show_user=false&show_playcount=false&color=%23d8b24a&hide_related=true&visual=false&liking=false&sharing=false&buying=false&download=false`}
          />
        </div>
      )}
    </div>
  );
});

export default function SoundCloudPicker({ value, onChange, t }: any) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewTrackId, setPreviewTrackId] = useState<any>(null);
  const searchTimer = useRef<any>(null);

  const doSearch = useCallback(async (q: any) => {
    if (!CLIENT_ID) { setError(t("setup.soundcloudNoKey")); return; }
    if (q.length < 2) { setResults([]); setError(""); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/tracks?q=${encodeURIComponent(q)}&client_id=${CLIENT_ID}&limit=12&linked_partitioning=1`);
      if (!res.ok) { setError(t("setup.soundcloudError")); return; }
      const data = await res.json();
      setResults(data.collection || []);
    } catch { setError(t("setup.soundcloudError")); }
    finally { setLoading(false); }
  }, [t]);

  const handleSearchChange = useCallback((e: any) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(val), 400);
  }, [doSearch]);

  const handleQuickSearch = useCallback((q: any) => {
    setQuery(q);
    doSearch(q);
  }, [doSearch]);

  const handlePreview = useCallback((trackId: any) => {
    setPreviewTrackId((prev: any) => prev === trackId ? null : trackId);
  }, []);

  const handleSelect = useCallback((track: any) => {
    onChange(track.permalink_url);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange("");
    setResults([]);
    setQuery("");
    setPreviewTrackId(null);
  }, [onChange]);

  return (
    <div className="setup-background-panel">
      <div className="setup-background-panel__header">
        <div>
          <p className="setup-label setup-label--tight">{t("setup.musicLabel")}</p>
          <p className="setup-help setup-help--tight">{t("setup.musicHint")}</p>
        </div>
        {value ? (
          <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClear}>
            {t("setup.removeMusic")}
          </button>
        ) : null}
      </div>

      {value ? (
        <div className="setup-selected-background">
          <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>🎵</div>
          <div>
            <p className="setup-selected-background__title">{t("setup.currentMusic")}</p>
            <p className="setup-help setup-help--tight" style={{ wordBreak: "break-all", fontSize: "0.8rem" }}>
              {value}
            </p>
          </div>
        </div>
      ) : null}

      <div className="setup-upload" style={{ cursor: "default" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {WEDDING_QUERIES.slice(0, 4).map(q => (
            <button key={q} type="button" className="setup-button setup-button--ghost setup-button--compact"
              style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}
              onClick={() => handleQuickSearch(q)}>
              {q}
            </button>
          ))}
        </div>
        <input
          className="setup-input"
          value={query}
          onChange={handleSearchChange}
          placeholder={t("setup.soundcloudSearchPlaceholder")}
          autoComplete="off"
          style={{ marginTop: "0.4rem" }}
        />
      </div>

      {!CLIENT_ID ? (
        <p className="setup-help" style={{ color: "var(--error, #f07a7a)" }}>
          {t("setup.soundcloudNoKey")}
        </p>
      ) : null}

      {error ? (
        <p className="setup-help" style={{ color: "var(--error, #f07a7a)" }}>{error}</p>
      ) : null}

      {loading ? (
        <div className="page-loading" />
      ) : null}

      {results.length > 0 ? (
        <div className="setup-background-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {results.map(track => (
            <TrackResult
              key={track.id}
              track={track}
              onPreview={handlePreview}
              onSelect={handleSelect}
              isSelected={value === track.permalink_url}
              previewTrackId={previewTrackId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
