import { useCallback, useEffect, useMemo, useState } from "react";
import { getDocs } from "firebase/firestore";
import { INVITATIONS_COLLECTION_REF, RSVP_COLLECTION_REF } from "../../lib/firebase";
import { formatRSVPsForCSV } from "../../lib/admin-utils";
import { rsvpByInvitation } from "../../lib/superadmin-utils";

export default function RsvpsTab() {
  const [rsvps, setRsvps] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAttendance, setFilterAttendance] = useState("all");
  const [filterInvite, setFilterInvite] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rsvpSnap, invSnap] = await Promise.all([
        getDocs(RSVP_COLLECTION_REF),
        getDocs(INVITATIONS_COLLECTION_REF),
      ]);
      setRsvps(rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setInvitations(invSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => rsvpByInvitation(rsvps), [rsvps]);

  const invLookup = useMemo(() => {
    const map = {};
    for (const inv of invitations) map[inv.id] = `${inv.firstName || ""} ${inv.secondName || ""}`.trim() || inv.id;
    return map;
  }, [invitations]);

  const filtered = useMemo(() => {
    let list = rsvps;
    if (filterAttendance !== "all") list = list.filter((r) => r.attendance === filterAttendance);
    if (filterInvite) list = list.filter((r) => r.inviteToken === filterInvite);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => (r.guestName || "").toLowerCase().includes(q));
    }
    return list;
  }, [rsvps, filterAttendance, filterInvite, search]);

  const handleExport = useCallback(() => {
    const csv = formatRSVPsForCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wedingo-rsvps-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const inviteOptions = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  if (loading) return <p className="setup-subtitle" style={{ textAlign: "center" }}>Cargando respuestas...</p>;

  return (
    <div>
      <div className="admin-filters">
        <input className="setup-input" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..." autoComplete="off" />
        <select className="setup-input" value={filterAttendance} onChange={(e) => setFilterAttendance(e.target.value)}
          style={{ maxWidth: 140 }}>
          <option value="all">Todos</option>
          <option value="yes">Confirman</option>
          <option value="no">Declinan</option>
        </select>
        <select className="setup-input" value={filterInvite} onChange={(e) => setFilterInvite(e.target.value)}
          style={{ maxWidth: 180 }}>
          <option value="">Todas las invitaciones</option>
          {inviteOptions.map((tok) => (
            <option key={tok} value={tok}>{invLookup[tok] || tok}</option>
          ))}
        </select>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button"
          onClick={handleExport} disabled={!filtered.length}>
          Exportar CSV
        </button>
      </div>

      <div className="admin-stats-grid" style={{ marginBottom: "1rem" }}>
        <span className="setup-help" style={{ margin: 0 }}>
          <strong>{rsvps.length}</strong> respuestas totales
        </span>
        <span className="setup-help" style={{ margin: 0 }}>
          <strong>{Object.keys(grouped).length}</strong> invitaciones con respuestas
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="setup-help">No se encontraron respuestas.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Invitación</th>
                <th>Nombre</th>
                <th>Asistencia</th>
                <th>Acompañantes</th>
                <th>Info alimentaria</th>
                <th>Nota</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const inviteName = invLookup[entry.inviteToken] || entry.inviteToken || "—";
                const ts = entry.submittedAt?.toDate?.() || (entry.submittedAt?.seconds ? new Date(entry.submittedAt.seconds * 1000) : null);
                return (
                  <tr key={entry.id}>
                    <td style={{ fontSize: "0.75rem", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }} title={entry.inviteToken}>
                      {inviteName}
                    </td>
                    <td className="admin-table__name">{entry.guestName || "—"}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${entry.attendance}`}>
                        {entry.attendance === "yes" ? "Sí" : "No"}
                      </span>
                    </td>
                    <td>{entry.attendance === "yes" ? entry.companions : "—"}</td>
                    <td className="admin-table__note">{entry.dietaryInfo || "—"}</td>
                    <td className="admin-table__note">{entry.note || "—"}</td>
                    <td className="admin-table__date">{ts ? ts.toLocaleDateString("es-ES") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
