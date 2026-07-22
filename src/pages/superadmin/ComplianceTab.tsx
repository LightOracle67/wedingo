import { memo } from "react";
import { useTranslation } from "react-i18next";

const ComplianceTab = memo(function ComplianceTab() {
  const { t } = useTranslation();
  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0 }}>
      <div className="setup-background-panel" style={{ marginBottom: "0.75rem" }}>
        <p className="setup-label">{t("compliance.title")}</p>
        <p className="setup-help" style={{ fontSize: "0.8rem" }}>{t("compliance.updated")}</p>
      </div>

      <div className="setup-background-panel" style={{ marginBottom: "0.75rem", overflowX: "auto" }}>
        <table className="admin-table" style={{ fontSize: "0.8rem", width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "0.4rem 0.5rem", textAlign: "left", borderBottom: "1px solid var(--setup-border)", color: "var(--setup-muted)", fontWeight: 600 }}>{t("compliance.tableActivity")}</th>
              <th style={{ padding: "0.4rem 0.5rem", textAlign: "left", borderBottom: "1px solid var(--setup-border)", color: "var(--setup-muted)", fontWeight: 600 }}>{t("compliance.tableData")}</th>
              <th style={{ padding: "0.4rem 0.5rem", textAlign: "left", borderBottom: "1px solid var(--setup-border)", color: "var(--setup-muted)", fontWeight: 600 }}>{t("compliance.tableLegalBasis")}</th>
              <th style={{ padding: "0.4rem 0.5rem", textAlign: "left", borderBottom: "1px solid var(--setup-border)", color: "var(--setup-muted)", fontWeight: 600 }}>{t("compliance.tablePurpose")}</th>
              <th style={{ padding: "0.4rem 0.5rem", textAlign: "left", borderBottom: "1px solid var(--setup-border)", color: "var(--setup-muted)", fontWeight: 600 }}>{t("compliance.tableRetention")}</th>
              <th style={{ padding: "0.4rem 0.5rem", textAlign: "left", borderBottom: "1px solid var(--setup-border)", color: "var(--setup-muted)", fontWeight: 600 }}>{t("compliance.tableRecipients")}</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)", color: "var(--setup-title)" }}>{t(`compliance.row${i}Activity`)}</td>
                <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)", color: "var(--setup-subtitle)" }}>{t(`compliance.row${i}Data`)}</td>
                <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)", color: "var(--setup-subtitle)" }}>{t(`compliance.row${i}Basis`)}</td>
                <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)", color: "var(--setup-subtitle)" }}>{t(`compliance.row${i}Purpose`)}</td>
                <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)", color: "var(--setup-subtitle)" }}>{t(`compliance.row${i}Retention`)}</td>
                <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)", color: "var(--setup-subtitle)" }}>{t(`compliance.row${i}Recipients`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="support-grid" style={{ marginBottom: "0.75rem" }}>
        <div className="setup-background-panel">
          <p className="setup-label">{t("compliance.internationalTitle")}</p>
          <p className="setup-help" style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>{t("compliance.internationalText")}</p>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--setup-subtitle)" }}>
            <li style={{ marginBottom: "0.2rem" }}>{t("compliance.scc")}</li>
            <li>{t("compliance.dpf")}</li>
          </ul>
        </div>

        <div className="setup-background-panel">
          <p className="setup-label">{t("compliance.measuresTitle")}</p>
          <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--setup-subtitle)", lineHeight: 1.8 }}>
            <li>{t("compliance.measureEncryption")}</li>
            <li>{t("compliance.measureTls")}</li>
            <li>{t("compliance.measureFirestore")}</li>
            <li>{t("compliance.measureStorage")}</li>
            <li>{t("compliance.measureRetention")}</li>
            <li>{t("compliance.measureSuperadmin")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
});

export default ComplianceTab;
