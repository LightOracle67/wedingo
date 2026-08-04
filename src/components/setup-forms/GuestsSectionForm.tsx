import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts";
import { isValidGoogleMapsUrl, extractPlaceNameFromUrl } from "../../lib/geo-utils";
import MenuDishEditor from "../MenuDishEditor";

export default function GuestsSectionForm({ prefix = "" }) {
  const { formData, updateFormField } = useApp();
  const id = (name: string) => `${prefix}${name}`;
  const { t } = useTranslation();

  const handleKidsPolicyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField("kidsPolicy", formData.kidsPolicy === e.currentTarget.value ? "" : e.currentTarget.value);
  }, [updateFormField, formData.kidsPolicy]);

  const handleMenuEnabledChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormField("menuEnabled", e.target.checked ? "true" : "false");
  }, [updateFormField]);

  return (
    <>
      <p className="setup-label">{t("setup.kidsLabel")}</p>
      <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
        {[
          { value: "playArea", key: "kidsPolicy.options.playArea" },
          { value: "supervised", key: "kidsPolicy.options.supervised" },
          { value: "adultOnly", key: "kidsPolicy.options.adultOnly" },
        ].map(({ value, key }) => (
          <label key={value} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
            <input id={id("kids-" + value)} type="checkbox" checked={formData.kidsPolicy === value} onChange={handleKidsPolicyChange} value={value} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
            {t(key)}
          </label>
        ))}
      </div>
      <p className="setup-help" id={id("kidsHint")}>{t("setup.kidsHint")}</p>

      <div className="story-divider" style={{ margin: "0.75rem 0" }} />
      <p className="setup-label">{t("setup.dressCodeLabel")}</p>
      <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
        {[
          { value: "Traje de gala", key: "setup.dressCodeGala" },
          { value: "Etiqueta informal", key: "setup.dressCodeCasual" },
          { value: "Vestimenta formal", key: "setup.dressCodeFormal" },
          { value: "Cóctel elegante", key: "setup.dressCodeCocktail" },
          { value: "Ropa cómoda", key: "setup.dressCodeComfortable" },
        ].map(({ value, key }) => (
          <label key={value} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
            <input id={id("dressCode-" + value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-"))} type="checkbox" checked={formData.weddingDressCode === value} onChange={() => updateFormField("weddingDressCode", formData.weddingDressCode === value ? "" : value)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
            {t(key)}
          </label>
        ))}
      </div>
      <p className="setup-help" id={id("dressCodeHint")}>{t("setup.dressCodeHint")}</p>
      <p className="setup-label" style={{ marginBottom: "0.3rem" }}>{t("setup.menuCelebrationLabel")}</p>

      <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--setup-title)", fontSize: "0.9rem", cursor: "pointer", marginBottom: "0.5rem" }}>
        <input id={id("menuEnabled")} type="checkbox" checked={formData.menuEnabled === "true"} onChange={handleMenuEnabledChange} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
        <span>{t("setup.menuEnabledLabel")}</span>
      </label>

      {formData.menuEnabled === "true" ? (
        <>
          <p className="setup-help" id={id("menuHint")} style={{ marginBottom: "0.4rem" }}>{t("setup.menuHint")}</p>
          {[
            { dishes: "menuCarneDishes", labelKey: "setup.menuCarneLabel" },
            { dishes: "menuPescadoDishes", labelKey: "setup.menuPescadoLabel" },
            { dishes: "menuVeganoDishes", labelKey: "setup.menuVeganoLabel" },
          ].map(({ dishes, labelKey }) => (
            <div key={dishes} style={{ marginBottom: "0.5rem" }}>
              <p className="setup-label" id={id(dishes + "Label")} style={{ fontSize: "0.85rem", marginBottom: "0.2rem" }}>{t(labelKey)}</p>
              <MenuDishEditor
                value={formData[dishes] || ""}
                onChange={(json) => updateFormField(dishes, json)}
                idBase={id(dishes)}
              />
            </div>
          ))}
          <p className="setup-help">{t("setup.menuRequiredText")}</p>
        </>
      ) : (
        <>
          <p className="setup-label" id={id("menuTextoLabel")} style={{ fontSize: "0.85rem", marginBottom: "0.2rem" }}>{t("setup.menuTextoLabel")}</p>
          <MenuDishEditor
            value={formData.menuTextoDishes || ""}
            onChange={(json) => updateFormField("menuTextoDishes", json)}
            idBase={id("menuTextoDishes")}
          />
          <p className="setup-help" id={id("menuTextoHint")}>{t("setup.menuTextoHint")}</p>
        </>
      )}

      <div className="story-divider" style={{ margin: "0.75rem 0" }} />
      <label className="setup-label" htmlFor={id("accommodationURL")}>
        {t("setup.accommodationLabel")}
        {formData.accommodationURL && !isValidGoogleMapsUrl(formData.accommodationURL) ? (
          <span style={{ color: "#ef4444", marginLeft: "0.4rem" }}>✗ {t("setup.mapUrlInvalid")}</span>
        ) : formData.accommodationURL && isValidGoogleMapsUrl(formData.accommodationURL) ? (
          <span style={{ color: "#22c55e", marginLeft: "0.4rem" }}>✓ {t("setup.mapUrlOk")}</span>
        ) : null}
      </label>
      <input
        id={id("accommodationURL")}
        className={formData.accommodationURL && !isValidGoogleMapsUrl(formData.accommodationURL) ? "setup-input setup-input--error" : "setup-input"}
        value={formData.accommodationURL || ""}
        onChange={(e) => updateFormField("accommodationURL", e.target.value)}
        placeholder={t("setup.accommodationUrlPlaceholder")}
        autoComplete="off"
        aria-describedby={id("accommodationUrlHelp")}
      />
      <p className="setup-help" id={id("accommodationUrlHelp")}>{t("setup.accommodationUrlHint")}</p>
      {formData.accommodationURL && isValidGoogleMapsUrl(formData.accommodationURL) ? (() => {
        const placeName = extractPlaceNameFromUrl(formData.accommodationURL);
        return placeName ? (
          <p className="setup-help" id={id("accommodationPlace")} style={{ marginTop: "0.15rem", color: "var(--setup-accent)", fontWeight: 600 }}>
            {t("setup.siteNameLabel")}: {placeName}
          </p>
        ) : null;
      })() : null}
    </>
  );
}
