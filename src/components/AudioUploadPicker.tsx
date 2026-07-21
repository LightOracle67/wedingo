import { memo, useCallback, useRef, useState } from "react";

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

const AudioUploadPicker = memo(function AudioUploadPicker({ value, onChange, t }: any) {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<any>(null);

  const handleFile = useCallback(async (e: any) => {
    const file = e.target?.files?.[0];
    const input = e.target;
    setError("");
    if (!file) return;
    if (file.size === 0) { setError(t("setup.audioEmptyError")); if (input) input.value = ""; return; }
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      setError(t("setup.audioFormatError"));
      if (input) input.value = "";
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      setError(t("setup.audioSizeError"));
      if (input) input.value = "";
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFileName(file.name);
      setFileSize(file.size);
      onChange(dataUrl);
    } catch {
      setError(t("setup.audioReadError"));
    }
    if (input) input.value = "";
  }, [onChange, t]);

  const handleClear = useCallback(() => {
    onChange("");
    setFileName("");
    setFileSize(0);
    setError("");
  }, [onChange]);

  return (
    <div className="setup-background-panel">
      <div className="setup-background-panel__header">
        <div>
          <p className="setup-label setup-label--tight">{t("setup.musicLabel")}</p>
          <p className="setup-help setup-help--tight">{t("setup.audioHint")}</p>
        </div>
        {value ? (
          <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClear}>
            {t("setup.removeMusic")}
          </button>
        ) : null}
      </div>

      {value && fileName ? (
        <div className="setup-selected-background">
          <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>🎵</div>
          <div>
            <p className="setup-selected-background__title">{fileName}</p>
            <p className="setup-help setup-help--tight">{formatSize(fileSize)}</p>
            <audio controls style={{ width: "100%", marginTop: "0.3rem", borderRadius: "0.5rem" }}>
              <source src={value} />
            </audio>
          </div>
        </div>
      ) : null}

      <label className="setup-upload" htmlFor="audioUpload">
        <span className="setup-upload__title">{t("setup.audioUploadTitle")}</span>
        <span className="setup-upload__subtitle">{t("setup.audioUploadSubtitle")}</span>
      </label>
      <input
        ref={inputRef}
        id="audioUpload"
        className="setup-upload__input"
        type="file"
        accept={ALLOWED_AUDIO_TYPES.join(",")}
        onChange={handleFile}
      />

      {error ? <p className="setup-help" style={{ color: "var(--error, #f07a7a)", marginTop: "0.4rem" }}>{error}</p> : null}
    </div>
  );
});

export default AudioUploadPicker;
