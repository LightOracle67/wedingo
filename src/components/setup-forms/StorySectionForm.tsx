import { useTranslation } from "react-i18next";
import CharacterCounter from "../../components/CharacterCounter";
import { useConfig } from "../../contexts";
import SetupToggleField from "../SetupToggleField";

export default function StorySectionForm({ prefix = "" }) {
  const { formData, updateFormField } = useConfig();
  const { t } = useTranslation();

  const id = (name: string) => `${prefix}${name}`;

  return (
    <>
      <SetupToggleField enabledField="storyTextEnabled" label={t("setup.storyLabel")} hint={t("setup.storyHint")} id={id}>
        <p className="setup-help setup-help--tight" style={{ textAlign: "right" }}>
          <CharacterCounter value={formData.storyText || ""} max={500} />
        </p>
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
      </SetupToggleField>
    </>
  );
}
