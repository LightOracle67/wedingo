import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useColumnSort, type SortableColumn } from "../../lib/useColumnSort";
import { SortableTh } from "../../components/SortableTh";

interface ComplianceRow {
  activity: string;
  data: string;
  basis: string;
  purpose: string;
  retention: string;
  recipients: string;
}

const ComplianceTab = memo(function ComplianceTab() {
  const { t } = useTranslation();

  // Filas del registro de tratamientos (contenido estático traducido).
  const rows = useMemo<ComplianceRow[]>(
    () =>
      [1, 2, 3, 4, 5].map((i) => ({
        activity: t(`compliance.row${i}Activity`),
        data: t(`compliance.row${i}Data`),
        basis: t(`compliance.row${i}Basis`),
        purpose: t(`compliance.row${i}Purpose`),
        retention: t(`compliance.row${i}Retention`),
        recipients: t(`compliance.row${i}Recipients`),
      })),
    [t],
  );

  const sortColumns = useMemo<SortableColumn<ComplianceRow>[]>(
    () => [
      { key: "activity", type: "string", getValue: (r: ComplianceRow) => r.activity },
      { key: "data", type: "string", getValue: (r: ComplianceRow) => r.data },
      { key: "basis", type: "string", getValue: (r: ComplianceRow) => r.basis },
      { key: "purpose", type: "string", getValue: (r: ComplianceRow) => r.purpose },
      { key: "retention", type: "string", getValue: (r: ComplianceRow) => r.retention },
      { key: "recipients", type: "string", getValue: (r: ComplianceRow) => r.recipients },
    ],
    [],
  );
  const { sorted: sortedRows, toggleSort, getIndicator } = useColumnSort(rows, sortColumns);

  const thStyle: React.CSSProperties = {
    padding: "0.4rem 0.5rem",
    textAlign: "left",
    borderBottom: "1px solid var(--setup-border)",
    color: "var(--setup-muted)",
    fontWeight: 600,
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.4rem 0.5rem",
    borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)",
    color: "var(--setup-subtitle)",
  };

  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0 }}>
      <div className="setup-background-panel" style={{ marginBottom: "0.75rem" }}>
        <p className="setup-label">{t("compliance.title")}</p>
        <p className="setup-help" style={{ fontSize: "0.8rem" }}>
          {t("compliance.updated")}
        </p>
      </div>

      <div className="setup-background-panel" style={{ marginBottom: "0.75rem", overflowX: "auto" }}>
        <table className="admin-table" style={{ fontSize: "0.8rem", width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <SortableTh columnKey="activity" order={getIndicator("activity")} onSort={toggleSort} style={thStyle}>
                {t("compliance.tableActivity")}
              </SortableTh>
              <SortableTh columnKey="data" order={getIndicator("data")} onSort={toggleSort} style={thStyle}>
                {t("compliance.tableData")}
              </SortableTh>
              <SortableTh columnKey="basis" order={getIndicator("basis")} onSort={toggleSort} style={thStyle}>
                {t("compliance.tableLegalBasis")}
              </SortableTh>
              <SortableTh columnKey="purpose" order={getIndicator("purpose")} onSort={toggleSort} style={thStyle}>
                {t("compliance.tablePurpose")}
              </SortableTh>
              <SortableTh columnKey="retention" order={getIndicator("retention")} onSort={toggleSort} style={thStyle}>
                {t("compliance.tableRetention")}
              </SortableTh>
              <SortableTh columnKey="recipients" order={getIndicator("recipients")} onSort={toggleSort} style={thStyle}>
                {t("compliance.tableRecipients")}
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.activity}>
                <td style={{ ...tdStyle, color: "var(--setup-title)" }}>{row.activity}</td>
                <td style={tdStyle}>{row.data}</td>
                <td style={tdStyle}>{row.basis}</td>
                <td style={tdStyle}>{row.purpose}</td>
                <td style={tdStyle}>{row.retention}</td>
                <td style={tdStyle}>{row.recipients}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="support-grid" style={{ marginBottom: "0.75rem" }}>
        <div className="setup-background-panel">
          <p className="setup-label">{t("compliance.internationalTitle")}</p>
          <p className="setup-help" style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
            {t("compliance.internationalText")}
          </p>
          <ul
            style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--setup-subtitle)" }}
          >
            <li style={{ marginBottom: "0.2rem" }}>{t("compliance.scc")}</li>
            <li>{t("compliance.dpf")}</li>
          </ul>
        </div>

        <div className="setup-background-panel">
          <p className="setup-label">{t("compliance.measuresTitle")}</p>
          <ul
            style={{
              margin: "0.3rem 0 0",
              paddingLeft: "1.2rem",
              fontSize: "0.85rem",
              color: "var(--setup-subtitle)",
              lineHeight: 1.8,
            }}
          >
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
