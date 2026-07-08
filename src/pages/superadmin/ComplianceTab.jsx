import { useTranslation } from "react-i18next";

export default function ComplianceTab() {
  const { t } = useTranslation();
  return (
    <div className="support-section">
      <h3>{t("compliance:title")}</h3>
      <p style={{ fontSize: "0.8rem", color: "var(--setup-subtitle)", marginBottom: "1rem" }}>
        {t("compliance:updated")}
      </p>

      <table className="admin-table" style={{ fontSize: "0.8rem" }}>
        <thead>
          <tr>
            <th>{t("compliance:tableActivity")}</th>
            <th>{t("compliance:tableData")}</th>
            <th>{t("compliance:tableLegalBasis")}</th>
            <th>{t("compliance:tablePurpose")}</th>
            <th>{t("compliance:tableRetention")}</th>
            <th>{t("compliance:tableRecipients")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("compliance:row1Activity")}</td>
            <td>{t("compliance:row1Data")}</td>
            <td>{t("compliance:row1Basis")}</td>
            <td>{t("compliance:row1Purpose")}</td>
            <td>{t("compliance:row1Retention")}</td>
            <td>{t("compliance:row1Recipients")}</td>
          </tr>
          <tr>
            <td>{t("compliance:row2Activity")}</td>
            <td>{t("compliance:row2Data")}</td>
            <td>{t("compliance:row2Basis")}</td>
            <td>{t("compliance:row2Purpose")}</td>
            <td>{t("compliance:row2Retention")}</td>
            <td>{t("compliance:row2Recipients")}</td>
          </tr>
          <tr>
            <td>{t("compliance:row3Activity")}</td>
            <td>{t("compliance:row3Data")}</td>
            <td>{t("compliance:row3Basis")}</td>
            <td>{t("compliance:row3Purpose")}</td>
            <td>{t("compliance:row3Retention")}</td>
            <td>{t("compliance:row3Recipients")}</td>
          </tr>
          <tr>
            <td>{t("compliance:row4Activity")}</td>
            <td>{t("compliance:row4Data")}</td>
            <td>{t("compliance:row4Basis")}</td>
            <td>{t("compliance:row4Purpose")}</td>
            <td>{t("compliance:row4Retention")}</td>
            <td>{t("compliance:row4Recipients")}</td>
          </tr>
          <tr>
            <td>{t("compliance:row5Activity")}</td>
            <td>{t("compliance:row5Data")}</td>
            <td>{t("compliance:row5Basis")}</td>
            <td>{t("compliance:row5Purpose")}</td>
            <td>{t("compliance:row5Retention")}</td>
            <td>{t("compliance:row5Recipients")}</td>
          </tr>
        </tbody>
      </table>

      <hr className="support-divider" />

      <h3>{t("compliance:internationalTitle")}</h3>
      <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--setup-subtitle)" }}>
        {t("compliance:internationalText")}
      </p>
      <ul className="support-list" style={{ fontSize: "0.85rem", color: "var(--setup-subtitle)" }}>
        <li>{t("compliance:scc")}</li>
        <li>{t("compliance:dpf")}</li>
      </ul>

      <hr className="support-divider" />

      <h3>{t("compliance:measuresTitle")}</h3>
      <ul className="support-list" style={{ fontSize: "0.85rem", color: "var(--setup-subtitle)" }}>
        <li>{t("compliance:measureEncryption")}</li>
        <li>{t("compliance:measureTls")}</li>
        <li>{t("compliance:measureFirestore")}</li>
        <li>{t("compliance:measureStorage")}</li>
        <li>{t("compliance:measureRetention")}</li>
        <li>{t("compliance:measureSuperadmin")}</li>
      </ul>
    </div>
  );
}
