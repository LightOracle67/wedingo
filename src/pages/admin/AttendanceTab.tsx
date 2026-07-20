import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDietarySummary } from "../../lib/admin-utils";

const PAGE_SIZES = [10, 25, 50, 100];

const AttendanceTab = memo(function AttendanceTab(props: any) {
  const config = props.config;
  const {
  searchQuery, setSearchQuery,
  attendanceFilter, setAttendanceFilter,
  filteredEntries, exportPdf,
} = config;
  const { rsvpEntries, handleClearRsvpEntries, formatDate } = props;
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const filterEntries = filteredEntries || [];
  const dietary = useMemo(() => getDietarySummary(rsvpEntries), [rsvpEntries]);

  const totalPages = Math.max(1, Math.ceil(filterEntries.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filterEntries.slice(safePage * pageSize, (safePage + 1) * pageSize);

  useEffect(() => { setPage(0); }, [searchQuery, attendanceFilter]);

  const stats = useMemo(() => {
    const entries = rsvpEntries || [];
    const yes = entries.filter((e: any) => e.attendance === "yes").length;
    const no = entries.filter((e: any) => e.attendance === "no").length;
    const totalCompanions = entries
      .filter((e: any) => e.attendance === "yes")
      .reduce((s: any, e: any) => s + (Number(e.companions) || 0), 0);
    const withDietary = entries.filter((e: any) => e.attendance === "yes" && e.dietaryInfo?.trim()).length;
    return { yes, no, totalCompanions, withDietary };
  }, [rsvpEntries]);

  return (
    <>
      <div className="admin-filters">
        <label className="sr-only" htmlFor="adminSearchName">{t("attendance.searchLabel")}</label>
        <input id="adminSearchName" className="setup-input" value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("attendance.searchPlaceholder")} autoComplete="off" />
        <div className="admin-filter-buttons">
          {["all", "yes", "no"].map((f: any) => (
            <button key={f}
              className={`setup-button setup-button--compact ${attendanceFilter === f ? "" : "setup-button--ghost"}`}
              type="button" onClick={() => setAttendanceFilter(f)}>
              {f === "all" ? t("attendance.all") : f === "yes" ? t("attendance.confirmed") : t("attendance.notAttending")}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <span className="setup-help" style={{ margin: 0, fontSize: "0.8rem" }}>
          {t("attendance.statsLine", { yes: stats.yes, no: stats.no, companions: stats.totalCompanions, diet: stats.withDietary })}
        </span>
      </div>

      {dietary.length > 0 && (
        <div className="setup-token-card" style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem" }}>
          <details>
            <summary style={{ cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "var(--setup-title)" }}>
              {t("attendance.dietarySummary", { count: dietary.length })}
            </summary>
            <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {dietary.map((d: any) => (
                <div key={d.item} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ textTransform: "capitalize" }}>{d.item}</span>
                  <span style={{ fontWeight: 600 }}>{d.count}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {filterEntries.length > 0 ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("attendance.tableName")}</th>
                <th>{t("attendance.tableAttendance")}</th>
                <th>{t("attendance.tableCompanions")}</th>
                <th>{t("attendance.tableDiet")}</th>
                <th>{t("attendance.tableNote")}</th>
                <th>{t("attendance.tableDate")}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((entry: any) => (
                <tr key={entry.id}>
                  <td className="admin-table__name">{entry.guestName}</td>
                  <td>
                    <span className={`admin-badge admin-badge--${entry.attendance}`}>
                      {entry.attendance === "yes" ? t("attendance.attendingValue") : t("attendance.notAttendingValue")}
                    </span>
                  </td>
                  <td>{entry.attendance === "yes" ? entry.companions : "—"}</td>
                  <td className="admin-table__note">{entry.dietaryInfo || "—"}</td>
                  <td className="admin-table__note">{entry.note || "—"}</td>
                  <td className="admin-table__date">{formatDate(entry.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span className="setup-help" style={{ fontSize: "0.75rem" }}>{t("attendance.show")}</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                style={{ fontSize: "0.75rem", padding: "0.15rem 0.3rem", borderRadius: "4px", border: "1px solid var(--setup-border)", background: "var(--setup-bg)", color: "var(--setup-text)" }}>
                {PAGE_SIZES.map((s: any) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="setup-help" style={{ fontSize: "0.75rem" }}>
                &middot; {t("attendance.total", { count: filterEntries.length })}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <button className="setup-button setup-button--ghost setup-button--compact" type="button"
                disabled={safePage === 0} onClick={() => setPage(safePage - 1)}
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>←</button>
              <span className="setup-help" style={{ fontSize: "0.75rem" }}>{t("attendance.page", { current: safePage + 1, total: totalPages })}</span>
              <button className="setup-button setup-button--ghost setup-button--compact" type="button"
                disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>→</button>
            </div>
          </div>
        </div>
      ) : (
        <p className="setup-help">
          {searchQuery || attendanceFilter !== "all"
            ? t("attendance.noResultsFilter")
            : t("attendance.noResults")}
        </p>
      )}

      {(rsvpEntries || []).length > 0 && (
        <div className="setup-actions">
          <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={exportPdf}>
            {t("attendance.exportPdf")}
          </button>
          <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClearRsvpEntries}>
            {t("attendance.clearAttendance")}
          </button>
        </div>
      )}
    </>
  );
});

export default AttendanceTab;
