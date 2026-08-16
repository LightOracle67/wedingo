import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormField } from "../../contexts";
import SetupToggleField from "../SetupToggleField";
import { CountedTextarea } from "../CountedField";

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
        <CountedTextarea
          id={id("storyText")}
          value={storyText}
          onChange={(v) => updateFormField("storyText", v)}
          max={500}
          placeholder={t("setup.storyPlaceholder")}
          ariaDescribedBy={id("storyHint")}
        />
      </SetupToggleField>
    </>
  );
});

export default StorySectionForm;

