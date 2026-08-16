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
  const { t, i18n } = useTranslation();

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

  // Plantillas de cláusula de privacidad por jurisdicción (resumen breve).
  const templates = useMemo(() => {
    const es = i18n.language?.toLowerCase().startsWith("es");
    return [
      {
        code: "EU",
        label: es ? "RGPD (UE)" : "GDPR (EU)",
        text: es
          ? "Base legal: consentimiento (art. 6.1.a RGPD). Datos: nombre, asistencia, menú, alergias, contacto si el invitado lo consiente. Retención: 12 meses tras la boda. Derechos: acceso, rectificación, supresión, portabilidad."
          : "Legal basis: consent (GDPR art. 6.1.a). Data: name, attendance, menu, allergies, contact only with consent. Retention: 12 months after the wedding. Rights: access, rectification, erasure, portability.",
      },
      {
        code: "UK",
        label: es ? "UK GDPR (Reino Unido)" : "UK GDPR (United Kingdom)",
        text: es
          ? "Base legal: consentimiento (UK GDPR art. 6.1.a). Retención: 12 meses tras la boda. Transferencia: datos alojados en EEUU con SCCs vigentes."
          : "Legal basis: consent (UK GDPR art. 6.1.a). Retention: 12 months after the wedding. Transfer: data hosted in the US under current SCCs.",
      },
      {
        code: "CCPA",
        label: es ? "CCPA/CPRA (California)" : "CCPA/CPRA (California)",
        text: es
          ? "Categorías recogidas: identificadores (nombre, teléfono/email si consiente). Derechos: saber, eliminar, opt-out de venta (no se venden datos). Solo residentes de California."
          : "Categories collected: identifiers (name, phone/email with consent). Rights: know, delete, sale opt-out (no data sold). California residents only.",
      },
      {
        code: "LGPD",
        label: "LGPD (Brasil)",
        text: es
          ? "Base legal: consentimento (art. 7º I). Dados: nome, presença, menu, alergias. Retenção: 12 meses. Direitos: acesso, correção, exclusão, portabilidade."
          : "Legal basis: consent (art. 7 I). Data: name, attendance, menu, allergies. Retention: 12 months. Rights: access, correction, deletion, portability.",
      },
      {
        code: "PIPEDA",
        label: "PIPEDA (Canadá)",
        text: es
          ? "Consentimiento significativo. Fines: organización de la boda. Retención: solo lo necesario (12 meses). Acceso y corrección disponibles."
          : "Meaningful consent. Purposes: wedding planning. Retention: only as needed (12 months). Access and correction available.",
      },
      {
        code: "POPIA",
        label: "POPIA (Sudáfrica)",
        text: es
          ? "Justificación: consentimiento. Fines: organización del evento. Retención: no más de lo necesario (12 meses). Derechos: acceso, rectificación, eliminación."
          : "Justification: consent. Purposes: event planning. Retention: no longer than necessary (12 months). Rights: access, rectification, deletion.",
      },
    ];
  }, [i18n.language]);

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
          <caption className="admin-table__caption">{t("compliance.tableTitle")}</caption>
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

      {/* ── Plantillas de textos legales por país ── */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("compliance.templatesTitle")}</p>
        <p className="setup-help" style={{ fontSize: "0.8rem" }}>
          {t("compliance.templatesHelp")}
        </p>
        <div className="support-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {templates.map((tp) => (
            <div key={tp.code} className="setup-background-panel" style={{ padding: "0.6rem" }}>
              <p className="setup-label" style={{ fontSize: "0.8rem" }}>{tp.label}</p>
              <p className="setup-help" style={{ fontSize: "0.72rem", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                {tp.text}
              </p>
              <button
                type="button"
                className="setup-button setup-button--ghost setup-button--compact"
                onClick={() => void navigator.clipboard?.writeText(tp.text)}
              >
                {t("compliance.copyTemplate")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ComplianceTab;
