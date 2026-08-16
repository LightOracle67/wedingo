import { memo } from "react";
import { useTranslation } from "react-i18next";
import CharacterCounter from "../../components/CharacterCounter";
import { useConfigActions, useFormField } from "../../contexts";
import SetupToggleField from "../SetupToggleField";

const GiftsSectionForm = memo(function GiftsSectionForm({ prefix = "" }: { prefix?: string }) {
  const { updateFormField } = useConfigActions();
  const bankInfo = useFormField("bankInfo");
  const giftsInfo = useFormField("giftsInfo");
  const { t } = useTranslation();

  const id = (name: string) => `${prefix}${name}`;

  const ibanLooksInvalid = (() => {
    const upper = bankInfo.trim().toUpperCase();
    if (!upper) return false;
    if (!/^[A-Z]{2}\d/.test(upper)) return false;
    return !/^[A-Z]{2}\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{0,4}$/.test(upper);
  })();

  return (
    <>
      <SetupToggleField
        enabledField="giftsInfoEnabled"
        label={t("setup.giftsInfoLabel")}
        hint={t("setup.giftsInfoHint")}
        hintId={id("giftsInfoHint")}
        id={id}
      >
        <p className="setup-help setup-help--tight" style={{ textAlign: "right" }}>
          <CharacterCounter value={giftsInfo || ""} max={2000} />
        </p>
        <textarea
          id={id("giftsInfo")}
          className="setup-textarea"
          value={giftsInfo}
          onChange={(e) => updateFormField("giftsInfo", e.target.value.slice(0, 2000))}
          placeholder={t("setup.giftsInfoPlaceholder")}
          rows={4}
          maxLength={2000}
          aria-describedby={id("giftsInfoHint")}
        />
      </SetupToggleField>

      <SetupToggleField
        enabledField="bankInfoEnabled"
        label={t("setup.bankInfoLabel")}
        hint={t("setup.bankInfoHint")}
        hintId={id("bankInfoHint")}
        id={id}
      >
        <p className="setup-help setup-help--tight" style={{ textAlign: "right" }}>
          <CharacterCounter value={bankInfo || ""} max={100} />
        </p>
        <input
          id={id("bankInfo")}
          value={bankInfo}
          onChange={(e) => updateFormField("bankInfo", e.target.value.slice(0, 100))}
          placeholder={t("setup.bankInfoPlaceholder")}
          autoComplete="off"
          maxLength={100}
          className={ibanLooksInvalid ? "setup-input setup-input--error" : "setup-input"}
          aria-invalid={ibanLooksInvalid || undefined}
          aria-describedby={ibanLooksInvalid ? `${id("bankInfoHint")} ${id("ibanError")}` : id("bankInfoHint")}
        />
        {ibanLooksInvalid ? (
          <p className="setup-help" id={id("ibanError")} style={{ color: "#ef4444" }} role="alert">
            {t("errors.ibanInvalid")}
          </p>
        ) : null}
      </SetupToggleField>
    </>
  );
});

export default GiftsSectionForm;

