import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";

export default function GiftsSectionForm({ prefix = "" }) {
  const { formData, updateFormField } = useApp();
  const { t } = useTranslation();

  const id = (name: string) => `${prefix}${name}`;

  return (
    <>
      <label className="setup-label" htmlFor={id("giftsInfo")}>
        {t("setup.giftsInfoLabel")}
      </label>
      <textarea
        id={id("giftsInfo")}
        className="setup-textarea"
        value={formData.giftsInfo}
        onChange={(e) => updateFormField("giftsInfo", e.target.value.slice(0, 2000))}
        placeholder={t("setup.giftsInfoPlaceholder")}
        rows={4}
        maxLength={2000}
      />
      <p className="setup-help">{t("setup.giftsInfoHint")}</p>

      <label className="setup-label" htmlFor={id("bankInfo")}>
        {t("setup.bankInfoLabel")}
      </label>
      <input
        id={id("bankInfo")}
        className="setup-input"
        value={formData.bankInfo}
        onChange={(e) => updateFormField("bankInfo", e.target.value.slice(0, 100))}
        placeholder={t("setup.bankInfoPlaceholder")}
        autoComplete="off"
        maxLength={100}
      />
      <p className="setup-help">{t("setup.bankInfoHint")}</p>

      <div className="story-divider" style={{ margin: "0.75rem 0" }} />
      <label className="setup-label" htmlFor={id("accommodationInfo")}>
        {t("setup.accommodationLabel")}
      </label>
      <textarea
        id={id("accommodationInfo")}
        className="setup-textarea"
        value={formData.accommodationInfo}
        onChange={(e) => updateFormField("accommodationInfo", e.target.value.slice(0, 2000))}
        placeholder={t("setup.accommodationPlaceholder")}
        rows={4}
        maxLength={2000}
        autoComplete="off"
      />
      <p className="setup-help">{t("setup.accommodationHint")}</p>

      <label className="setup-label" htmlFor={id("transportInfo")}>
        {t("setup.transportLabel")}
      </label>
      <textarea
        id={id("transportInfo")}
        className="setup-textarea"
        value={formData.transportInfo}
        onChange={(e) => updateFormField("transportInfo", e.target.value.slice(0, 2000))}
        placeholder={t("setup.transportPlaceholder")}
        rows={4}
        maxLength={2000}
        autoComplete="off"
      />
      <p className="setup-help">{t("setup.transportHint")}</p>
    </>
  );
}
