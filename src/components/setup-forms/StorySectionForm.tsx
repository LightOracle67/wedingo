import { memo } from "react";
import { useTranslation } from "react-i18next";
import CharacterCounter from "../../components/CharacterCounter";
import { useConfigActions, useFormField } from "../../contexts";
import SetupToggleField from "../SetupToggleField";

const StorySectionForm = memo(function StorySectionForm({ prefix = "" }: { prefix?: string }) {
  const { updateFormField } = useConfigActions();
  const storyText = useFormField("storyText");
  const { t } = useTranslation();

  const id = (name: string) => `${prefix}${name}`;

  return (
    <>
      <SetupToggleField
        enabledField="storyTextEnabled"
        label={t("setup.storyLabel")}
        hint={t("setup.storyHint")}
        hintId={id("storyHint")}
        id={id}
      >
        <p className="setup-help setup-help--tight" style={{ textAlign: "right" }}>
          <CharacterCounter value={storyText || ""} max={500} />
        </p>
        <textarea
          id={id("storyText")}
          className="setup-textarea"
          value={storyText}
          onChange={(e) => updateFormField("storyText", e.target.value.slice(0, 500))}
          placeholder={t("setup.storyPlaceholder")}
          rows={4}
          maxLength={500}
          aria-describedby={id("storyHint")}
        />
      </SetupToggleField>
    </>
  );
});

export default StorySectionForm;

