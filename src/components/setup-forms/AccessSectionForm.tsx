import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";

export default function AccessSectionForm({ prefix = "" }) {
  const { formData, updateFormField } = useApp();
  const { t } = useTranslation();

  const id = (name: any) => `${prefix}${name}`;

  return (
    <>
      <label className="setup-label" htmlFor={id("adminUsername")}>
        {t("setup.usernameLabel")}
      </label>
      <input
        id={id("adminUsername")}
        className="setup-input"
        value={formData.adminUsername}
        onChange={(e) => updateFormField("adminUsername", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50))}
        placeholder={t("setup.usernamePlaceholder")}
        autoComplete="username"
        name="username"
        aria-describedby="usernameHelp"
      />
      <p className="setup-help" id="usernameHelp">
        {t("setup.usernameHint")}
      </p>
    </>
  );
}
