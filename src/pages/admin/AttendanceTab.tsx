import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDietarySummary } from "../../lib/admin-utils";

const PAGE_SIZES = [10, 25, 50, 100];

function parseDietaryItems(dietaryInfo: string): string[] {
  if (!dietaryInfo) return [];
  return dietaryInfo.split(" | ").map((s) => s.trim()).filter((s) => s && !s.startsWith("Menú:"));
}

function formatMenuLines(mhc: Record<string, number>, t: (key: string) => string): string[] {
  const lines: string[] = [];
  if (mhc.carne) lines.push(`${t("attendance.menuMeat")}: ${mhc.carne}`);
  if (mhc.pescado) lines.push(`${t("attendance.menuFish")}: ${mhc.pescado}`);
  if (mhc.vegano) lines.push(`${t("attendance.menuVegan")}: ${mhc.vegano}`);
  return lines.length ? lines : ["—"];
}

function getDietaryLines(dietaryInfo: string, companions: number): { item: string; count: number }[] {
  const items = parseDietaryItems(dietaryInfo);
  if (!items.length) return [];
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item] = (counts[item] || 0) + (companions || 1);
  }
  return Object.entries(counts).map(([item, count]) => ({ item, count }));
}

const AttendanceTab = memo(function AttendanceTab(props: any) {
  const config = props.config;
  const {
    searchQuery, setSearchQuery,
    attendanceFilter, setAttendanceFilter,
    filteredEntries, exportPdf,
  } = config;
  const { rsvpEntries, handleClearRsvpEntries, formatDate } = config;
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
          <select className="setup-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: "250px", fontSize: "0.85rem" }}>
            <option value="">{t("attendance.all")}</option>
            {(rsvpEntries || [])
              .filter((e: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.guestName === e.guestName) === i)
              .map((e: any) => (
                <option key={e.id} value={e.guestName}>{e.guestName}</option>
              ))}
          </select>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <span className="setup-help" style={{ margin: 0, fontSize: "0.8rem" }}>
          {t("attendance.statsLine", { yes: stats.yes, no: stats.no, companions: stats.totalCompanions, diet: stats.withDietary })}
        </span>
      </div>

      <div aria-live="polite" aria-atomic="true">
      {filterEntries.length > 0 ? (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ fontSize: "0.8rem", minWidth: "700px" }}>
            <thead>
              <tr>
                <th style={{ minWidth: "100px" }}>{t("attendance.tableName")}</th>
                <th style={{ minWidth: "70px" }}>{t("attendance.tableAttendance")}</th>
                <th style={{ minWidth: "140px" }}>{t("attendance.tableAttendees")}</th>
                <th style={{ minWidth: "120px" }}>{t("attendance.tableMenu")}</th>
                <th style={{ minWidth: "140px" }}>{t("attendance.tableDiet")}</th>
                <th style={{ minWidth: "120px" }}>{t("attendance.tableDate")}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((entry: any) => {
                const attending = entry.attendance === "yes";
                const attendeesList = entry.attendees?.length
                  ? entry.attendees
                  : (entry.guestNames
                      ? entry.guestNames.split(",").map((n: string) => n.trim()).filter(Boolean).map((n: string) => ({ name: n }))
                      : []);
                const menuLines = entry.attendees?.length
                  ? entry.attendees.map((a: any) => a.menu ? `${a.name}: ${t("rsvp.menu" + a.menu.charAt(0).toUpperCase() + a.menu.slice(1))}` : null).filter(Boolean)
                  : formatMenuLines(entry.menuHeadcounts || {}, t);
                const dietLines = entry.attendees?.length
                  ? entry.attendees.filter((a: any) => a.allergies?.length).map((a: any) => `${a.name}: ${a.allergies.join(", ")}`)
                  : (attending ? getDietaryLines(entry.dietaryInfo || "", entry.companions || 1).map((d) => `${d.item}: ${d.count}`) : []);
                const crossed = !attending ? { textDecoration: "line-through", opacity: 0.4 } : {};

                return (
                  <tr key={entry.id}>
                    <td className="admin-table__name" style={{ fontWeight: 600 }}>{entry.guestName}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${entry.attendance}`}>
                        {attending ? t("attendance.attendingValue") : t("attendance.notAttendingValue")}
                      </span>
                    </td>
                    <td>
                      {attending ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                          {attendeesList.length > 0 ? attendeesList.map((a: any, i: number) => (
                            <span key={i} style={{ fontSize: "0.78rem" }}>{a.name}</span>
                          )) : <span style={{ fontSize: "0.78rem", color: "var(--setup-muted)" }}>—</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--setup-muted)" }}>{t("attendance.notAttendingValue")}</span>
                      )}
                    </td>
                    <td>
                      <div style={crossed}>
                        {attending ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            {menuLines.length > 0 ? menuLines.map((line: any, i: number) => (
                              <span key={i} style={{ fontSize: "0.78rem" }}>{line}</span>
                            )) : <span style={{ fontSize: "0.78rem" }}>—</span>}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.78rem" }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={crossed}>
                        {attending && dietLines.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            {dietLines.map((line: any, i: number) => (
                              <span key={i} style={{ fontSize: "0.78rem" }}>{line}</span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.78rem" }}>—</span>
                        )}
                      </div>
                    </td>
                    <td className="admin-table__date" style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                      {formatDate(entry.submittedAt)}
                    </td>
                  </tr>
                );
              })}
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
                disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>←</button>
              <span className="setup-help" style={{ fontSize: "0.75rem" }}>{t("attendance.page", { current: safePage + 1, total: totalPages })}</span>
              <button className="setup-button setup-button--ghost setup-button--compact" type="button"
                disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>→</button>
            </div>
          </div>
        </div>
      ) : (
        <p className="setup-help">
          {searchQuery
            ? t("attendance.noResultsFilter")
            : t("attendance.noResults")}
        </p>
      )}
      </div>

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
