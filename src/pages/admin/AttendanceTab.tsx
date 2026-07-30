import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Pagination from "../../components/Pagination";

interface RsvpEntry {
  id: string;
  rsvpType?: "main" | "companion";
  guestName: string;
  attendance: "yes" | "no";
  companions: number;
  dietaryInfo: string;
  attendees?: { name: string; menu: string; allergies: string[] }[];
  menuHeadcounts?: Record<string, number>;
  guestNames?: string;
  submittedAt: string;
  mainGuestName?: string;
  companionDocIds?: string[];
}

export interface AttendanceTabProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  attendanceFilter: string;
  setAttendanceFilter: (filter: string) => void;
  filteredEntries: RsvpEntry[];
  exportPdf: () => void;
  rsvpEntries: RsvpEntry[];
  handleClearRsvpEntries: () => void;
  handleDeleteRsvpEntries: (ids: string[]) => void;
  formatDate: (date: string) => string;
}

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

const AttendanceTab = memo(function AttendanceTab(props: AttendanceTabProps) {
  const {
    searchQuery, setSearchQuery,
    attendanceFilter,
    filteredEntries, exportPdf,
    rsvpEntries, handleClearRsvpEntries, handleDeleteRsvpEntries, formatDate,
  } = props;
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filterEntries = filteredEntries || [];

  const totalPages = Math.max(1, Math.ceil(filterEntries.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filterEntries.slice(safePage * pageSize, (safePage + 1) * pageSize);

  useEffect(() => { setPage(0); }, [searchQuery, attendanceFilter]);

  const stats = useMemo(() => {
    const entries = rsvpEntries || [];
    const mainEntries = entries.filter((e) => e.rsvpType !== "companion");
    const yes = mainEntries.filter((e: RsvpEntry) => e.attendance === "yes").length;
    const no = mainEntries.filter((e: RsvpEntry) => e.attendance === "no").length;
    const totalCompanions = entries.filter((e: RsvpEntry) => e.rsvpType === "companion").length;
    const withDietary = entries.filter((e: RsvpEntry) => e.attendance === "yes" && e.dietaryInfo?.trim()).length;
    return { yes, no, totalCompanions, withDietary };
  }, [rsvpEntries]);

  const toggleAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((e) => e.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = () => {
    const companionIds = [...selectedIds].filter((id) => {
      const entry = rsvpEntries.find((e) => e.id === id);
      return entry?.rsvpType === "companion";
    });
    const mainIds = [...selectedIds].filter((id) => {
      const entry = rsvpEntries.find((e) => e.id === id);
      return entry?.rsvpType !== "companion";
    });
    const allToDelete = new Set(selectedIds);
    // Also delete companions linked to selected main entries
    for (const mid of mainIds) {
      const main = rsvpEntries.find((e) => e.id === mid);
      if (main?.companionDocIds) {
        for (const cid of main.companionDocIds) {
          allToDelete.add(cid);
        }
      }
    }
    handleDeleteRsvpEntries([...allToDelete]);
    setSelectedIds(new Set());
  };

  return (
    <>
      <div className="admin-filters">
        <label className="sr-only" htmlFor="adminSearchName">{t("attendance.searchLabel")}</label>
          <select className="setup-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: "250px", fontSize: "0.85rem" }}>
            <option value="">{t("attendance.all")}</option>
            {(rsvpEntries || [])
              .filter((e: RsvpEntry, i: number, arr: RsvpEntry[]) => arr.findIndex((x: RsvpEntry) => x.guestName === e.guestName) === i)
              .map((e: RsvpEntry) => (
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
          <table className="admin-table" style={{ fontSize: "0.8rem", minWidth: "800px" }}>
            <thead>
              <tr>
                <th style={{ width: "2rem" }}>
                  <input type="checkbox" onChange={toggleAll}
                    checked={paginated.length > 0 && selectedIds.size === paginated.length}
                    aria-label={t("attendance.selectAll")} />
                </th>
                <th style={{ minWidth: "100px" }}>{t("attendance.tableName")}</th>
                <th style={{ minWidth: "120px" }}>{t("attendance.tableAccompanies")}</th>
                <th style={{ minWidth: "70px" }}>{t("attendance.tableAttendance")}</th>
                <th style={{ minWidth: "120px" }}>{t("attendance.tableMenu")}</th>
                <th style={{ minWidth: "140px" }}>{t("attendance.tableDiet")}</th>
                <th style={{ minWidth: "120px" }}>{t("attendance.tableDate")}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((entry: RsvpEntry) => {
                const isCompanion = entry.rsvpType === "companion";
                const attending = entry.attendance === "yes";
                const menuLines = entry.attendees?.length
                  ? entry.attendees.map((a) => a.menu ? `${a.name}: ${t("rsvp.menu" + a.menu.charAt(0).toUpperCase() + a.menu.slice(1))}` : null).filter((x): x is string => x !== null)
                  : formatMenuLines(entry.menuHeadcounts || {}, t);
                const dietLines = entry.attendees?.length
                  ? entry.attendees.filter((a) => a.allergies?.length).map((a) => `${a.name}: ${a.allergies.join(", ")}`)
                  : (attending ? getDietaryLines(entry.dietaryInfo || "", entry.companions || 1).map((d) => `${d.item}: ${d.count}`) : []);
                const crossed = !attending ? { textDecoration: "line-through", opacity: 0.4 } : {};

                return (
                  <tr key={entry.id}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(entry.id)}
                        onChange={() => toggleOne(entry.id)}
                        aria-label={t("attendance.selectEntry", { name: entry.guestName })} />
                    </td>
                    <td className="admin-table__name" style={{ fontWeight: isCompanion ? 400 : 600 }}>
                      {entry.guestName}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--setup-muted)" }}>
                      {isCompanion && entry.mainGuestName ? entry.mainGuestName : "—"}
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge--${entry.attendance}`}>
                        {attending ? t("attendance.attendingValue") : t("attendance.notAttendingValue")}
                      </span>
                    </td>
                    <td>
                      <div style={crossed}>
                        {attending ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            {menuLines.length > 0 ? menuLines.map((line, i) => (
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
                            {dietLines.map((line, i) => (
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
          <Pagination
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            total={filterEntries.length}
            pageSizes={PAGE_SIZES}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
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
        <div className="setup-actions" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "1rem" }}>
          <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={exportPdf}>
            {t("attendance.exportPdf")}
          </button>
          <button className="setup-button setup-button--ghost setup-button--compact" type="button"
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0}
            style={{ background: selectedIds.size > 0 ? "#ef4444" : undefined, color: selectedIds.size > 0 ? "#fff" : undefined }}>
            {t("attendance.deleteSelected", { count: selectedIds.size })}
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