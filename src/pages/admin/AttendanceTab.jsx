import { memo } from "react";

const AttendanceTab = memo(function AttendanceTab({
  searchQuery, setSearchQuery,
  attendanceFilter, setAttendanceFilter,
  filteredEntries, exportCsv,
  rsvpEntries, handleClearRsvpEntries, formatDate,
}) {
  return (
    <>
      <div className="admin-filters">
        <label className="sr-only" htmlFor="adminSearchName">Buscar por nombre</label>
        <input
          id="adminSearchName"
          className="setup-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre..."
          autoComplete="off"
        />
        <div className="admin-filter-buttons">
          {["all", "yes", "no"].map((f) => (
            <button
              key={f}
              className={`setup-button setup-button--compact ${attendanceFilter === f ? "" : "setup-button--ghost"}`}
              type="button"
              onClick={() => setAttendanceFilter(f)}
            >
              {f === "all" ? "Todos" : f === "yes" ? "Confirmados" : "No asisten"}
            </button>
          ))}
        </div>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={exportCsv}>
          Exportar CSV
        </button>
      </div>

      {filteredEntries.length > 0 ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Asistencia</th>
                <th>Acompañantes</th>
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
