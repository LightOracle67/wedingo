/**
 * DayPhotosSection — Muro de fotos del día (diferencial).
 *
 * Los invitados suben fotos durante la boda a un álbum compartido (cifradas
 * como la galería). El admin las descarga/elimina desde el panel.
 */
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInviteSubcollection } from "../../hooks/useInviteSubcollection";
import { encrypt, decrypt } from "../../lib/crypto-utils";
import { compressImage } from "../../lib/image-utils";
import { useToast } from "../../hooks/useToast";

interface DayPhoto {
  id: string;
  guestName: string;
  data?: string;
}

const DayPhotosSection = memo(function DayPhotosSection({ inviteToken }: { inviteToken: string }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previews, setPreviews] = useState<Array<{ id: string; url: string }>>([]);
  const [guestName, setGuestName] = useState("");

  const { items, load, add, busy } = useInviteSubcollection<DayPhoto>(
    inviteToken,
    "dayphotos",
    { map: (d) => ({ id: d.id, guestName: String(d.data.guestName || ""), data: String(d.data.data || "") }) },
  );

  // Descifra los thumbnails bajo demanda (solo los visibles).
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const reveal = useCallback(
    async (id: string, data: string) => {
      if (decrypted[id]) return;
      const url = await decrypt(data, inviteToken);
      if (url) setDecrypted((prev) => ({ ...prev, [id]: url }));
    },
    [decrypted, inviteToken],
  );

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const name = guestName.trim() || t("dayPhotos.anonymous");
      for (const file of Array.from(files).slice(0, 8)) {
        if (!file.type.startsWith("image/")) continue;
        try {
          const dataUrl = await compressImage(file, 900, 180_000);
          const encrypted = await encrypt(dataUrl, inviteToken);
          if (!encrypted) continue;
          const id = await add({ guestName: name.slice(0, 60), data: encrypted });
          if (id) setPreviews((prev) => [{ id, url: dataUrl }, ...prev]);
        } catch {
          addToast("error", t("dayPhotos.uploadError"));
        }
      }
      if (inputRef.current) inputRef.current.value = "";
      void load();
    },
    [guestName, inviteToken, add, load, t, addToast],
  );

  const shown = useMemo(() => [...previews, ...items.map((i) => ({ id: i.id, url: decrypted[i.id] || "" }))], [previews, items, decrypted]);

  return (
    <div className="story-panel__inner">
      <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="setup-input"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder={t("dayPhotos.namePlaceholder")}
          maxLength={60}
          style={{ flex: 1, minWidth: "9rem" }}
          aria-label={t("dayPhotos.namePlaceholder")}
        />
        <button type="button" className="setup-button" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? t("common.loading") : t("dayPhotos.upload")}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
      </div>
      {shown.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.6rem" }}>
          {shown.map((p) => (
            <div key={p.id} style={{ position: "relative", width: "72px", height: "72px", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid var(--invite-shell-border)" }}>
              {p.url ? (
                <img src={p.url} alt={t("dayPhotos.photo")} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <button type="button" onClick={() => reveal(p.id, items.find((i) => i.id === p.id)?.data || "")} aria-label={t("dayPhotos.reveal")} style={{ width: "100%", height: "100%", background: "none", border: 0, cursor: "pointer", color: "var(--invite-copy-color)" }}>
                  👁
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="setup-help" style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", textAlign: "center" }}>
          {t("dayPhotos.empty")}
        </p>
      )}
    </div>
  );
});

export default DayPhotosSection;
