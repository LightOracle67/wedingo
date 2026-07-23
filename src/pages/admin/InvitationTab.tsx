import { memo } from "react";
import SetupForm from "../../components/SetupForm";

const InvitationTab = memo(function InvitationTab() {
  return (
    <div className="setup-layout setup-layout--full" style={{ paddingTop: "0.25rem" }}>
      <section className="setup-card setup-card--wide setup-card--full allow-select" aria-label="Invitation editor" style={{ borderRadius: "1rem" }}>
        <SetupForm prefix="admin" />
      </section>
    </div>
  );
});

export default InvitationTab;
