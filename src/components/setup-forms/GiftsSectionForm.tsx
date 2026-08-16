import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormField } from "../../contexts";
import SetupToggleField from "../SetupToggleField";
import { CountedTextarea, CountedInput } from "../CountedField";

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
        <CountedTextarea
          id={id("giftsInfo")}
          value={giftsInfo}
          onChange={(v) => updateFormField("giftsInfo", v)}
          max={2000}
          placeholder={t("setup.giftsInfoPlaceholder")}
          ariaDescribedBy={id("giftsInfoHint")}
        />
      </SetupToggleField>

      <SetupToggleField
        enabledField="bankInfoEnabled"
        label={t("setup.bankInfoLabel")}
        hint={t("setup.bankInfoHint")}
        hintId={id("bankInfoHint")}
        id={id}
      >
        <CountedInput
          id={id("bankInfo")}
          value={bankInfo}
          onChange={(v) => updateFormField("bankInfo", v)}
          max={100}
          placeholder={t("setup.bankInfoPlaceholder")}
          autoComplete="off"
          className={ibanLooksInvalid ? "setup-input setup-input--error" : "setup-input"}
          ariaDescribedBy={ibanLooksInvalid ? `${id("bankInfoHint")} ${id("ibanError")}` : id("bankInfoHint")}
          {...(ibanLooksInvalid ? { ariaInvalid: true } : {})}
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

