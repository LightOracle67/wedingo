import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";

export default function StorySectionForm({ prefix = "" }) {
  const { formData, updateFormField } = useApp();
  const { t } = useTranslation();

  const id = (name: string) => `${prefix}${name}`;

  return (
    <>
      <label className="setup-label" htmlFor={id("storyText")}>
        {t("setup.storyLabel")}
      </label>
      <textarea
        id={id("storyText")}
        className="setup-textarea"
        value={formData.storyText}
        onChange={(e) => updateFormField("storyText", e.target.value.slice(0, 500))}
        placeholder={t("setup.storyPlaceholder")}
        rows={4}
        maxLength={500}
      />
      <p className="setup-help">{t("setup.storyHint")} <span className="text-muted text-xs">({(formData.storyText || "").length}/500)</span></p>
    </>
  );
}
