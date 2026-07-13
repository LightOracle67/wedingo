import { memo, useCallback, useEffect, useState } from "react";
import { deleteDoc, doc, getDocs } from "firebase/firestore";
import { INVITATIONS_COLLECTION_REF } from "../../lib/firebase";
import { searchInvitations, formatBytes } from "../../lib/superadmin-utils";
import { useTranslation } from "react-i18next";

const InvitationsTab = memo(function InvitationsTab() {
  const { t } = useTranslation();
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
    } catch { setError(t("superadmin.invitationLoadError")); }
    setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm(t("superadmin.deleteConfirmInvitation", { id }))) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(INVITATIONS_COLLECTION_REF, id));
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch { setError(t("superadmin.deleteError")); }
    setDeleting(null);
  }, [t]);

  const handleExportAll = useCallback(async () => {
    try {
      const snap = await getDocs(INVITATIONS_COLLECTION_REF);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedingo-invitaciones-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError(t("superadmin.exportError")); }
  }, [t]);

  const filtered = searchInvitations(invitations, search);
  const totalBytes = invitations.reduce((acc, d) => {
    try { return acc + new Blob([JSON.stringify(d)]).size; } catch { return acc; }
  }, 0);

  if (loading) return <p className="setup-subtitle" style={{ textAlign: "center" }}>{t("common.loading")}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {error && <p className="setup-error">{error}</p>}

      <div className="admin-filters" style={{ marginBottom: "1rem" }}>
        <input className="setup-input" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("superadmin.searchTokenPlaceholder")} autoComplete="off" />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <span className="setup-help" style={{ margin: 0 }}>
          {t("superadmin.invitationsCount", { count: invitations.length, size: formatBytes(totalBytes) })}
        </span>
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={handleExportAll}
          disabled={!invitations.length}
        >
          {t("superadmin.exportAllBtn")}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="setup-help">
          {search ? t("superadmin.noResultsFilter") : t("superadmin.noInvitations")}
        </p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("superadmin.tableToken")}</th>
                <th>{t("superadmin.tableTheme")}</th>
                <th>{t("superadmin.tableDate")}</th>
                <th>{t("superadmin.tableActions")}</th>
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
                      {deleting === inv.id ? "…" : t("superadmin.deleteButton")}
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
});

export default InvitationsTab;
