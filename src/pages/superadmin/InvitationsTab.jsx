import { useCallback, useEffect, useState } from "react";
import { deleteDoc, doc, getDocs } from "firebase/firestore";
import { INVITATIONS_COLLECTION_REF } from "../../lib/firebase";
import { searchInvitations, formatBytes } from "../../lib/superadmin-utils";

export default function InvitationsTab() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(INVITATIONS_COLLECTION_REF);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setInvitations(list);
      setError("");
    } catch { setError("No se pudieron cargar las invitaciones."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm(`¿Eliminar la invitación "${id}" permanentemente?`)) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(INVITATIONS_COLLECTION_REF, id));
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch { setError("No se pudo eliminar la invitación."); }
    setDeleting(null);
  }, []);

  const handleExportAll = useCallback(async () => {
    try {
      const { getDocs } = await import("firebase/firestore");
      const snap = await getDocs(INVITATIONS_COLLECTION_REF);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedingo-invitaciones-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError("Error al exportar."); }
  }, []);

  const filtered = searchInvitations(invitations, search);
  const totalBytes = invitations.reduce((acc, d) => {
    try { return acc + new Blob([JSON.stringify(d)]).size; } catch { return acc; }
  }, 0);

  if (loading) return <p className="setup-subtitle" style={{ textAlign: "center" }}>Cargando invitaciones...</p>;

  return (
    <div>
      {error && <p className="setup-error">{error}</p>}

      <div className="admin-filters" style={{ marginBottom: "1rem" }}>
        <input className="setup-input" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por token..." autoComplete="off" />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <span className="setup-help" style={{ margin: 0 }}>
          <strong>{invitations.length}</strong> invitaciones &middot; <strong>{formatBytes(totalBytes)}</strong> ocupados
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="setup-help">
          {search ? "No se encontraron invitaciones con ese criterio." : "No hay invitaciones todavía."}
        </p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Tema</th>
                <th>Fecha boda</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontSize: "0.7rem", fontFamily: "monospace" }}>
                    {inv.id}
                  </td>
                  <td>{inv.theme || "—"}</td>
                  <td className="admin-table__date">
                    {inv.weddingDay && inv.weddingMonth && inv.weddingYear
                      ? `${inv.weddingDay} ${inv.weddingMonth} ${inv.weddingYear}`
                      : "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="setup-button setup-button--ghost setup-button--compact" style={{ fontSize: "0.7rem", color: "#ef4444" }}
                      type="button" onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id}>
                      {deleting === inv.id ? "…" : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
