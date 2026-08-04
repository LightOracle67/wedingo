import { memo } from "react";
import { useTranslation } from "react-i18next";
import SetupForm from "../../components/SetupForm";

const InvitationTab = memo(function InvitationTab() {
  const { t } = useTranslation();
  return (
    <div className="setup-layout setup-layout--full" style={{ paddingTop: "0.25rem" }}>
      <section className="setup-card setup-card--wide setup-card--full allow-select" aria-label={t("admin.editorAriaLabel")} style={{ borderRadius: "1rem" }}>
        <SetupForm prefix="admin" />
      </section>
    </div>
  );
});

export default InvitationTab;
