import { useTranslation } from "react-i18next";
import CharacterCounter from "../../components/CharacterCounter";
import { useApp } from "../../contexts";

export default function GiftsSectionForm({ prefix = "" }) {
  const { formData, updateFormField } = useApp();
  const { t } = useTranslation();

  const id = (name: string) => `${prefix}${name}`;

  const bankInfo = formData.bankInfo || "";
  const ibanLooksInvalid = (() => {
    const upper = bankInfo.trim().toUpperCase();
    if (!upper) return false;
    if (!/^[A-Z]{2}\d/.test(upper)) return false;
    return !/^[A-Z]{2}\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{0,4}$/.test(upper);
  })();

  return (
    <>
      <label className="setup-label" htmlFor={id("giftsInfo")}>
        {t("setup.giftsInfoLabel")} <CharacterCounter current={(formData.giftsInfo || "").length} max={2000} />
      </label>
      <textarea
        id={id("giftsInfo")}
        className="setup-textarea"
        value={formData.giftsInfo}
        onChange={(e) => updateFormField("giftsInfo", e.target.value.slice(0, 2000))}
        placeholder={t("setup.giftsInfoPlaceholder")}
        rows={4}
        maxLength={2000}
        aria-describedby={id("giftsInfoHint")}
      />
      <p className="setup-help" id={id("giftsInfoHint")}>{t("setup.giftsInfoHint")}</p>

      <label className="setup-label" htmlFor={id("bankInfo")}>
        {t("setup.bankInfoLabel")} <CharacterCounter current={(formData.bankInfo || "").length} max={100} />
      </label>
      <input
        id={id("bankInfo")}
        value={formData.bankInfo}
        onChange={(e) => updateFormField("bankInfo", e.target.value.slice(0, 100))}
        placeholder={t("setup.bankInfoPlaceholder")}
        autoComplete="off"
        maxLength={100}
        className={ibanLooksInvalid ? "setup-input setup-input--error" : "setup-input"}
        aria-invalid={ibanLooksInvalid || undefined}
        aria-describedby={ibanLooksInvalid ? `${id("bankInfoHint")} ${id("ibanError")}` : id("bankInfoHint")}
      />
      {ibanLooksInvalid ? <p className="setup-help" id={id("ibanError")} style={{ color: "#ef4444" }}>{t("errors.ibanInvalid")}</p> : null}
      <p className="setup-help" id={id("bankInfoHint")}>{t("setup.bankInfoHint")}</p>
    </>
  );
}
