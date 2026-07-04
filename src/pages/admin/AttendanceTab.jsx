import { memo, useMemo } from "react";
import { getDietarySummary } from "../../lib/admin-utils";

const AttendanceTab = memo(function AttendanceTab({
  searchQuery, setSearchQuery,
  attendanceFilter, setAttendanceFilter,
  filteredEntries, exportCsv,
  rsvpEntries, handleClearRsvpEntries, formatDate,
}) {
  const dietary = useMemo(() => getDietarySummary(rsvpEntries), [rsvpEntries]);

  const stats = useMemo(() => {
    const yes = rsvpEntries.filter((e) => e.attendance === "yes").length;
    const no = rsvpEntries.filter((e) => e.attendance === "no").length;
    const totalCompanions = rsvpEntries
      .filter((e) => e.attendance === "yes")
      .reduce((s, e) => s + (Number(e.companions) || 0), 0);
    const withDietary = rsvpEntries.filter((e) => e.attendance === "yes" && e.dietaryInfo?.trim()).length;
    return { yes, no, totalCompanions, withDietary };
  }, [rsvpEntries]);

  return (
    <>
      <div className="admin-filters">
        <label className="sr-only" htmlFor="adminSearchName">Buscar por nombre</label>
        <input id="adminSearchName" className="setup-input" value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por nombre..." autoComplete="off" />
        <div className="admin-filter-buttons">
          {["all", "yes", "no"].map((f) => (
            <button key={f}
              className={`setup-button setup-button--compact ${attendanceFilter === f ? "" : "setup-button--ghost"}`}
              type="button" onClick={() => setAttendanceFilter(f)}>
              {f === "all" ? "Todos" : f === "yes" ? "Confirmados" : "No asisten"}
            </button>
          ))}
        </div>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={exportCsv}>
          Exportar CSV
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <span className="setup-help" style={{ margin: 0, fontSize: "0.8rem" }}>
          <strong>{stats.yes}</strong> confirman &middot; <strong>{stats.no}</strong> declinan &middot;
          <strong>{stats.totalCompanions}</strong> acompañantes &middot;
          {stats.withDietary > 0 && <> <strong>{stats.withDietary}</strong> con dieta especial</>}
        </span>
      </div>

      {dietary.length > 0 && (
        <div className="setup-token-card" style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem" }}>
          <details>
            <summary style={{ cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "var(--setup-title)" }}>
              Preferencias alimentarias ({dietary.length})
            </summary>
            <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {dietary.map((d) => (
                <div key={d.item} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ textTransform: "capitalize" }}>{d.item}</span>
                  <span style={{ fontWeight: 600 }}>{d.count}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {filteredEntries.length > 0 ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Asistencia</th>
                <th>Acompañantes</th>
                <th>Info alimentaria</th>
                <th>Nota</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="admin-table__name">{entry.guestName}</td>
                  <td>
                    <span className={`admin-badge admin-badge--${entry.attendance}`}>
                      {entry.attendance === "yes" ? "Sí" : "No"}
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
        </div>
      ) : (
        <p className="setup-help">
          {searchQuery || attendanceFilter !== "all"
            ? "No se encontraron resultados con ese filtro."
            : "Todavía no hay respuestas de asistencia."}
        </p>
      )}

      {rsvpEntries.length > 0 && (
        <div className="setup-actions">
          <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={handleClearRsvpEntries}>
            Vaciar asistencia
          </button>
        </div>
      )}
    </>
  );
});

export default AttendanceTab;
