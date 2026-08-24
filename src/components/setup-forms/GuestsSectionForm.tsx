import { memo, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormStore, useFormField } from "../../contexts";
import { MAX_DRESS_CODE_CUSTOM_LENGTH } from "../../lib/constants";
import MenuDishEditor from "../MenuDishEditor";
import MapUrlField from "../MapUrlField";
import MapModeSelect from "../MapModeSelect";
import SetupToggleField from "../SetupToggleField";
import SetupToggleRow from "../SetupToggleRow";
import SetupField from "../SetupField";

const GuestsSectionForm = memo(function GuestsSectionForm({ prefix = "" }: { prefix?: string }) {
  const { updateFormField } = useConfigActions();
  const formStore = useFormStore();
  // Fecha límite de RSVP (movida desde Extras) y visibilidad de confirmados.
  const rsvpDeadline = useFormField("rsvpDeadline");
  const rsvpDeadlineEnabled = useFormField("rsvpDeadlineEnabled");
  const accommodationMapMode = useFormField("accommodationMapMode");
  const accommodationURL = useFormField("accommodationURL");
  const kidsPolicy = useFormField("kidsPolicy");
  const menuEnabled = useFormField("menuEnabled");
  const menuTextoDishes = useFormField("menuTextoDishes");
  const weddingDressCode = useFormField("weddingDressCode");
  const weddingDressCodeCustom = useFormField("weddingDressCodeCustom");
  const menuCarneDishes = useFormField("menuCarneDishes");
  const menuPescadoDishes = useFormField("menuPescadoDishes");
  const menuVeganoDishes = useFormField("menuVeganoDishes");
  // Lookup por clave de plato para los editores (el hook no puede llamarse
  // dentro del .map de render).
  const dishValues: Record<string, string> = { menuCarneDishes, menuPescadoDishes, menuVeganoDishes };
  const id = (name: string) => `${prefix}${name}`;
  const { t } = useTranslation();

  // Toggle genérico para switches simples (lectura síncrona del store).
  const toggle = useCallback(
    (field: string) => () => {
      const current = formStore.getField(field);
      updateFormField(field, current === "true" ? "false" : "true");
    },
    [formStore, updateFormField],
  );

  /** Fila de toggle estable reutilizando SetupToggleRow. */
  const renderToggleRow = (field: string, label: string, hint?: string, children?: ReactNode) => (
    <SetupToggleRow
      field={field}
      label={label}
      {...(hint !== undefined ? { hint } : {})}
      checked={formStore.getField(`${field}Enabled`) === "true"}
      onToggle={toggle(`${field}Enabled`)}
      id={id}
    >
      {children}
    </SetupToggleRow>
  );

  const handleKidsPolicyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFormField("kidsPolicy", kidsPolicy === e.currentTarget.value ? "" : e.currentTarget.value);
    },
    [updateFormField, kidsPolicy],
  );

  const handleMenuEnabledChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFormField("menuEnabled", e.target.checked ? "true" : "false");
    },
    [updateFormField],
  );

  /**
   * Cambia el código de vestimenta. La opción "Otro" abre un input de texto
   * personalizado; el texto se conserva al cambiar de opción (se ignora si
   * no es "Otro") para no destruir la edición con un clic accidental.
   */
  const handleDressCodeChange = useCallback(
    (value: string) => {
      const next = weddingDressCode === value ? "" : value;
      updateFormField("weddingDressCode", next);
    },
    [weddingDressCode, updateFormField],
  );

  return (
    <>
      <SetupToggleField
        enabledField="kidsPolicyEnabled"
        label={t("setup.kidsLabel")}
        hint={t("setup.kidsHint")}
        id={id}
      >
        <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {[
            { value: "playArea", key: "kidsPolicy.options.playArea" },
            { value: "supervised", key: "kidsPolicy.options.supervised" },
          ].map(({ value, key }) => (
            <label
              key={value}
              className="setup-checkbox-label"
              style={{ padding: "0.35rem 0" }}
            >
              <input
                id={id("kids-" + value)}
                type="checkbox"
                checked={kidsPolicy === value}
                onChange={handleKidsPolicyChange}
                value={value}
              />
              {t(key)}
            </label>
          ))}
        </div>
      </SetupToggleField>

      <div className="story-divider" style={{ margin: "0.75rem 0" }} />
      <SetupToggleField
        enabledField="weddingDressCodeEnabled"
        label={t("setup.dressCodeLabel")}
        hint={t("setup.dressCodeHint")}
        id={id}
      >
        <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
          {/* Valores por CLAVE (no texto en español): la etiqueta visible se
              traduce y el valor almacenado es independiente del idioma. */}
          {[
            { value: "gala", key: "setup.dressCodeGala" },
            { value: "smart-casual", key: "setup.dressCodeCasual" },
            { value: "formal", key: "setup.dressCodeFormal" },
            { value: "cocktail", key: "setup.dressCodeCocktail" },
            { value: "comfortable", key: "setup.dressCodeComfortable" },
            { value: "custom", key: "setup.dressCodeOther" },
          ].map(({ value, key }) => (
            <label
              key={value}
              className="setup-checkbox-label"
              style={{ padding: "0.35rem 0" }}
            >
              <input
                id={id(
                  "dressCode-" +
                    value
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-"),
                )}
                type="checkbox"
                checked={weddingDressCode === value}
                onChange={() => handleDressCodeChange(value)}
              />
              {t(key)}
            </label>
          ))}
        </div>
        {weddingDressCode === "custom" ? (
          <SetupField
            id={id("dressCodeCustom")}
            label={t("setup.dressCodeCustomLabel")}
            hint={t("setup.dressCodeCustomHint")}
            hintId={id("dressCodeCustomHint")}
            className="setup-field"
            style={{ marginTop: "0.6rem" }}
          >
            <input
              id={id("dressCodeCustom")}
              type="text"
              className="setup-input"
              value={weddingDressCodeCustom || ""}
              onChange={(e) =>
                updateFormField("weddingDressCodeCustom", e.target.value.slice(0, MAX_DRESS_CODE_CUSTOM_LENGTH))
              }
              placeholder={t("setup.dressCodeCustomPlaceholder")}
              maxLength={MAX_DRESS_CODE_CUSTOM_LENGTH}
              autoComplete="off"
            />
          </SetupField>
        ) : null}
      </SetupToggleField>
      <p className="setup-label" style={{ marginBottom: "0.3rem" }}>
        {t("setup.menuCelebrationLabel")}
      </p>

      <label
        className="setup-checkbox-label"
        style={{ marginBottom: "0.5rem" }}
      >
        <input
          id={id("menuEnabled")}
          type="checkbox"
          checked={menuEnabled === "true"}
          onChange={handleMenuEnabledChange}
        />
        <span>{t("setup.menuEnabledLabel")}</span>
      </label>

      {menuEnabled === "true" ? (
        <>
          <p className="setup-help" id={id("menuHint")} style={{ marginBottom: "0.4rem" }}>
            {t("setup.menuHint")}
          </p>
          {[
            { dishes: "menuCarneDishes", labelKey: "setup.menuCarneLabel" },
            { dishes: "menuPescadoDishes", labelKey: "setup.menuPescadoLabel" },
            { dishes: "menuVeganoDishes", labelKey: "setup.menuVeganoLabel" },
          ].map(({ dishes, labelKey }) => (
            <div key={dishes} style={{ marginBottom: "0.5rem" }}>
              <p
                className="setup-label"
                id={id(dishes + "Label")}
                style={{ fontSize: "0.85rem", marginBottom: "0.2rem" }}
              >
                {t(labelKey)}
              </p>
              <MenuDishEditor
                value={dishValues[dishes] || ""}
                onChange={(json) => updateFormField(dishes, json)}
                idBase={id(dishes)}
              />
            </div>
          ))}
          <p className="setup-help">{t("setup.menuRequiredText")}</p>
        </>
      ) : (
        <>
          <p className="setup-label" id={id("menuTextoLabel")} style={{ fontSize: "0.85rem", marginBottom: "0.2rem" }}>
            {t("setup.menuTextoLabel")}
          </p>
          <MenuDishEditor
            value={menuTextoDishes || ""}
            onChange={(json) => updateFormField("menuTextoDishes", json)}
            idBase={id("menuTextoDishes")}
          />
          <p className="setup-help" id={id("menuTextoHint")}>
            {t("setup.menuTextoHint")}
          </p>
        </>
      )}

      {/* Fecha límite de RSVP (movida desde Extras) */}
      {renderToggleRow(
        "rsvpDeadline",
        t("setup.rsvpDeadlineLabel"),
        t("setup.rsvpDeadlineHint"),
        rsvpDeadlineEnabled === "true" ? (
          <input
            id={id("rsvpDeadline")}
            className="setup-input"
            type="date"
            value={rsvpDeadline || ""}
            onChange={(e) => updateFormField("rsvpDeadline", e.target.value)}
          />
        ) : undefined,
      )}

      {/* Visibilidad de la lista de confirmados (opt-in de nombres) */}
      {renderToggleRow("showConfirmedPeople", t("setup.showConfirmedPeopleLabel"), t("setup.showConfirmedPeopleHint"))}

      <div className="story-divider" style={{ margin: "0.75rem 0" }} />
      <SetupToggleField
        enabledField="accommodationURLEnabled"
        label={t("setup.accommodationLabel")}
        hint={t("setup.accommodationUrlHint")}
        id={id}
      >
        <MapUrlField
          id={id("accommodationURL")}
          value={accommodationURL || ""}
          onChange={(url) => updateFormField("accommodationURL", url)}
          placeholder={t("setup.accommodationUrlPlaceholder")}
          placeHintId={id("accommodationPlace")}
          placeLabel={t("setup.siteNameLabel")}
        />
        <MapModeSelect
          id={id("accommodationMapMode")}
          value={accommodationMapMode}
          onChange={(v) => updateFormField("accommodationMapMode", v)}
          hintId={id("accommodationMapModeHint")}
        />
      </SetupToggleField>
    </>
  );
});

export default GuestsSectionForm;

