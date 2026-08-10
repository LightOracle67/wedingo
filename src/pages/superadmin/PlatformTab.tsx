import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { setDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useToast } from "../../hooks/useToast";
import { usePlatformSettings, isFeatureDisabled, type PlatformSettings } from "../../lib/platform-settings";

// Funciones sociales que se pueden desactivar globalmente (kill-switch).
const SOCIAL_FEATURES: Array<{ key: string; labelKey: string }> = [
  { key: "gifts", labelKey: "giftList.title" },
  { key: "rides", labelKey: "rideShare.title" },
  { key: "reactions", labelKey: "reactions.title" },
  { key: "notes", labelKey: "notes.title" },
  { key: "songs", labelKey: "musicPoll.title" },
  { key: "trivia", labelKey: "trivia.title" },
  { key: "voiceNotes", labelKey: "voiceNotes.title" },
  { key: "dayPhotos", labelKey: "dayPhotos.title" },
  { key: "mailbox", labelKey: "mailbox.title" },
  { key: "toasts", labelKey: "toasts.title" },
  { key: "venueMap", labelKey: "venueMap.title" },
];

/**
 * PlatformTab — Ajustes globales de la plataforma (Fase 3): banner global
 * (F3-1), modo mantenimiento (F3-4), lista negra de URLs (F3-3), lista negra
 * de tokens (F3-6) y umbral de expiración (F3-9). Escrituras con sesión de
 * superadmin (reglas: platform solo-superadmin).
 */
const PlatformTab = memo(function PlatformTab() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { settings, reload } = usePlatformSettings();
  const [form, setForm] = useState<PlatformSettings>(settings);
  const [saving, setSaving] = useState(false);

  // Sincroniza el formulario local cuando los ajustes se cargan.
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "platform", "settings"), form);
      addToast("success", t("errors.configSaved"));
      void reload();
    } catch {
      addToast("error", t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }, [form, reload, addToast, t]);

  const set = (key: keyof PlatformSettings, value: string) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0, gap: "0.75rem" }}>
      {/* F3-4: modo mantenimiento */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("platform.maintenance")}</p>
        <p className="setup-help">{t("platform.maintenanceHelp")}</p>
        <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={form.maintenance === "true"}
            onChange={(e) => set("maintenance", e.target.checked ? "true" : "false")}
            style={{ accentColor: "var(--setup-accent)" }}
          />
          <span>{t("platform.maintenanceToggle")}</span>
        </label>
      </div>

      {/* F3-1: banner global */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("platform.globalBanner")}</p>
        <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={form.bannerEnabled === "true"}
            onChange={(e) => set("bannerEnabled", e.target.checked ? "true" : "false")}
            style={{ accentColor: "var(--setup-accent)" }}
          />
          <span>{t("platform.bannerToggle")}</span>
        </label>
        <textarea
          className="setup-textarea"
          value={form.bannerText}
          onChange={(e) => set("bannerText", e.target.value.slice(0, 500))}
          rows={3}
          placeholder={t("platform.bannerPlaceholder")}
          aria-label={t("platform.globalBanner")}
        />
      </div>

      {/* F3-3: lista negra de URLs */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("platform.blockedUrls")}</p>
        <p className="setup-help">{t("platform.blockedUrlsHelp")}</p>
        <textarea
          className="setup-textarea"
          value={form.blockedUrls}
          onChange={(e) => set("blockedUrls", e.target.value.slice(0, 2000))}
          rows={3}
          placeholder={t("platform.blockedUrlsPlaceholder")}
          aria-label={t("platform.blockedUrls")}
        />
      </div>

      {/* F3-6: lista negra de tokens */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("platform.blockedTokens")}</p>
        <p className="setup-help">{t("platform.blockedTokensHelp")}</p>
        <textarea
          className="setup-textarea"
          value={form.blockedTokens}
          onChange={(e) => set("blockedTokens", e.target.value.slice(0, 2000))}
          rows={3}
          placeholder={t("platform.blockedTokensPlaceholder")}
          aria-label={t("platform.blockedTokens")}
        />
      </div>

      {/* F3-9: umbral de expiración */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("platform.expiringDays")}</p>
        <input
          type="number"
          min={1}
          max={365}
          className="setup-input"
          value={form.expiringDays}
          onChange={(e) => set("expiringDays", e.target.value.slice(0, 3))}
          aria-label={t("platform.expiringDays")}
        />
      </div>

      {/* Kill-switch por función social (desactivación global) */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("platform.disabledFeatures")}</p>
        <p className="setup-help">{t("platform.disabledFeaturesHelp")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem 1.2rem" }}>
          {SOCIAL_FEATURES.map((f) => {
            const disabled = isFeatureDisabled(form, f.key);
            return (
              <label key={f.key} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={disabled}
                  onChange={() => {
                    const list = (form.disabledFeatures || "")
                      .split(",")
                      .map((s) => s.trim().toLowerCase())
                      .filter(Boolean);
                    const next = disabled ? list.filter((x) => x !== f.key) : [...list, f.key];
                    set("disabledFeatures", next.join(","));
                  }}
                  aria-label={t(f.labelKey)}
                />
                <span>{t(f.labelKey)}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="setup-actions">
        <button className="setup-button" type="button" onClick={handleSave} disabled={saving}>
          {saving ? t("common.loading") : t("manage.saveConfig")}
        </button>
      </div>
    </div>
  );
});

export default PlatformTab;
