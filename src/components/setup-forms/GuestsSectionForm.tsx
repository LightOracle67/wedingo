import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GuestsSectionForm({ prefix: _prefix = "" }) {
  const { formData, updateFormField } = useApp();
  const { t } = useTranslation();

  const handleKidsPolicyChange = useCallback((e: any) => {
    updateFormField("kidsPolicy", formData.kidsPolicy === e.currentTarget.value ? "" : e.currentTarget.value);
  }, [updateFormField, formData.kidsPolicy]);

  const handleMenuEnabledChange = useCallback((e: any) => {
    updateFormField("menuEnabled", e.target.checked ? "true" : "false");
  }, [updateFormField]);

  const handleMenuToggle = useCallback((e: any) => {
    updateFormField(e.currentTarget.dataset.menuKey, e.target.checked ? " " : "");
  }, [updateFormField]);

  const handleMenuFieldChange = useCallback((e: any) => {
    updateFormField(e.currentTarget.dataset.menuKey, e.target.value);
  }, [updateFormField]);

  const handleMenuPostreChange = useCallback((e: any) => {
    updateFormField("menuPostre", e.target.value.slice(0, 2000));
  }, [updateFormField]);

  const handleMenuTextoChange = useCallback((e: any) => {
    updateFormField("menuTexto", e.target.value.slice(0, 2000));
  }, [updateFormField]);

  return (
    <>
      <label className="setup-label">{t("setup.kidsLabel")}</label>
      <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
        {[
          { value: "playArea", key: "kidsPolicy.options.playArea" },
          { value: "supervised", key: "kidsPolicy.options.supervised" },
          { value: "adultOnly", key: "kidsPolicy.options.adultOnly" },
        ].map(({ value, key }) => (
          <label key={value} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
            <input type="checkbox" checked={formData.kidsPolicy === value} onChange={handleKidsPolicyChange} value={value} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
            {t(key)}
          </label>
        ))}
      </div>
      <p className="setup-help">{t("setup.kidsHint")}</p>

      <div className="story-divider" style={{ margin: "0.75rem 0" }} />
      <label className="setup-label">{t("setup.dressCodeLabel")}</label>
      <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
        {[
          { value: "Traje de gala", key: "setup.dressCodeGala" },
          { value: "Etiqueta informal", key: "setup.dressCodeCasual" },
          { value: "Vestimenta formal", key: "setup.dressCodeFormal" },
          { value: "Cóctel elegante", key: "setup.dressCodeCocktail" },
          { value: "Ropa cómoda", key: "setup.dressCodeComfortable" },
        ].map(({ value, key }) => (
          <label key={value} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
            <input type="checkbox" checked={formData.weddingDressCode === value} onChange={() => updateFormField("weddingDressCode", formData.weddingDressCode === value ? "" : value)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
            {t(key)}
          </label>
        ))}
      </div>
      <p className="setup-help">{t("setup.dressCodeHint")}</p>
      <label className="setup-label" style={{ marginBottom: "0.3rem", display: "block" }}>{t("setup.menuCelebrationLabel")}</label>

      <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.9rem", cursor: "pointer", marginBottom: "0.5rem" }}>
        <input type="checkbox" checked={formData.menuEnabled === "true"} onChange={handleMenuEnabledChange} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
        <span>{t("setup.menuEnabledLabel")}</span>
      </label>

      {formData.menuEnabled === "true" ? (
        <>
          <p className="setup-help" style={{ marginBottom: "0.4rem" }}>{t("setup.menuHint")}</p>
          {[
            { key: "menuCarne", labelKey: "setup.menuCarneLabel", phKey: "setup.menuCarnePlaceholder" },
            { key: "menuPescado", labelKey: "setup.menuPescadoLabel", phKey: "setup.menuPescadoPlaceholder" },
            { key: "menuVegano", labelKey: "setup.menuVeganoLabel", phKey: "setup.menuVeganoPlaceholder" },
          ].map(({ key, labelKey, phKey }) => {
            const val = formData[key] || "";
            return (
              <div key={key} style={{ marginBottom: "0.5rem" }}>
                <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--setup-title)" }}>
                  <input type="checkbox" checked={!!val} onChange={handleMenuToggle} data-menu-key={key} style={{ accentColor: "var(--setup-accent)", width: "0.9rem", height: "0.9rem", flexShrink: 0 }} />
                  {t(labelKey)}
                </label>
                {!!val && <textarea className="setup-textarea" value={val} onChange={handleMenuFieldChange} data-menu-key={key} placeholder={t(phKey)} rows={2} style={{ marginTop: "0.15rem", fontSize: "0.85rem" }} />}
              </div>
            );
          })}
          <div style={{ marginBottom: "0.5rem" }}>
            <p className="setup-label" style={{ fontSize: "0.85rem", marginBottom: "0.2rem" }}>{t("setup.postreLabel")}</p>
            <textarea className="setup-textarea" value={formData.menuPostre || ""} onChange={handleMenuPostreChange} placeholder={t("setup.postrePlaceholder")} rows={2} style={{ fontSize: "0.85rem" }} />
          </div>
          <p className="setup-help">{t("setup.menuRequiredText")}</p>
        </>
      ) : (
        <>
          <textarea className="setup-textarea" value={formData.menuTexto} onChange={handleMenuTextoChange} placeholder={t("setup.menuTextoPlaceholder")} rows={3} />
          <p className="setup-help">{t("setup.menuTextoHint")}</p>
        </>
      )}
    </>
  );
}
