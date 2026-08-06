import { useTranslation } from "react-i18next";
import CharacterCounter from "../../components/CharacterCounter";
import { useApp } from "../../contexts";

export default function StorySectionForm({ prefix = "" }) {
  const { formData, updateFormField } = useApp();
  const { t } = useTranslation();

  const id = (name: string) => `${prefix}${name}`;

  return (
    <>
      <label className="setup-label" htmlFor={id("storyText")}>
        {t("setup.storyLabel")} <CharacterCounter value={formData.storyText || ""} max={500} />
      </label>
      <textarea
        id={id("storyText")}
        className="setup-textarea"
        value={formData.storyText}
        onChange={(e) => updateFormField("storyText", e.target.value.slice(0, 500))}
        placeholder={t("setup.storyPlaceholder")}
        rows={4}
        maxLength={500}
        aria-describedby={id("storyHint")}
      />
      <p className="setup-help" id={id("storyHint")}>{t("setup.storyHint")}</p>
    </>
  );
}
