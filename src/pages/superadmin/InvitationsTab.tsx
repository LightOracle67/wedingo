import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDocs, writeBatch, collection, query, where } from "firebase/firestore";
import { db, INVITATIONS_COLLECTION_REF, rsvpByInviteRef } from "../../lib/firebase";
import { searchInvitations, formatBytes } from "../../lib/superadmin-utils";
import { useTranslation } from "react-i18next";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useColumnSort, type SortableColumn } from "../../lib/useColumnSort";
import { useRowSelection } from "../../hooks/useRowSelection";
import { SortableTh } from "../../components/SortableTh";
import { TableActionsBar } from "../../components/TableActionsBar";
import Pagination from "../../components/Pagination";
import EmptyState from "../../components/EmptyState";

interface InvitationRow {
  id: string;
  theme?: string;
  weddingDay?: string;
  weddingMonth?: string;
  weddingYear?: string;
  adminUsername?: string;
  tags?: string;
}

/** Filas por página (paginación client-side; las invitaciones se cargan enteras). */
const PAGE_SIZE = 50;

const InvitationsTab = memo(function InvitationsTab() {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  // Página actual: se reinicia al cambiar los filtros (useEffect abajo).
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(INVITATIONS_COLLECTION_REF);
      const list = snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
        id: d.id,
        ...d.data(),
      }));
      setInvitations(list);
      setError("");
    } catch {
      setError(t("superadmin.invitationLoadError"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Selección de filas para acciones genéricas en lote (fuera de la tabla).
  const selection = useRowSelection();

  // Borrado en cascada COMPLETO (sin confirmación: la gestiona quien llama):
  // sin esto las subcolecciones (RSVP, galería, audio, configImages,
  // setupTokens) quedaban huérfanas. Las FUNCIONES SOCIALES
  // (reactions/notes/songs/rides/gifts) y _counters guardan datos personales
  // de los invitados: si no se borran, quedan huérfanas y legibles para
  // siempre (GDPR art. 17). El consentLog también debe limpiarse.
  const deleteOne = useCallback(async (id: string) => {
    const refs: Array<{ ref: unknown }> = [];
    const snap = await getDocs(rsvpByInviteRef(id));
    for (const d of snap.docs) refs.push(d.ref as never);
    const SUB_COLLECTIONS = ["gallery", "audio", "configImages", "reactions", "notes", "songs", "rides", "gifts", "_counters", "consentLog"];
    for (const name of SUB_COLLECTIONS) {
      const subSnap = await getDocs(collection(db, "invitations", id, name));
      for (const d of subSnap.docs) refs.push(d.ref as never);
    }
    const tokenSnap = await getDocs(query(collection(db, "setupTokens"), where("inviteToken", "==", id)));
    for (const d of tokenSnap.docs) refs.push(d.ref as never);
    refs.push(doc(db, "rsvpResponses", id) as never);
    refs.push(doc(INVITATIONS_COLLECTION_REF, id) as never);
    // Firestore limita a 500 operaciones por batch: se trocea.
    for (let i = 0; i < refs.length; i += 400) {
      const chunk = refs.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const r of chunk) batch.delete(r.ref as never);
      await batch.commit();
    }
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // Borrado en lote de las invitaciones seleccionadas (una sola confirmación).
  const handleBulkDelete = useCallback(async () => {
    const ids = [...selection.selected];
    if (ids.length === 0 || !(await confirm({ message: t("superadmin.deleteConfirmBulk", { count: ids.length }) }))) return;
    setError("");
    try {
      for (const id of ids) await deleteOne(id);
      selection.clear();
    } catch {
      setError(t("superadmin.deleteError"));
    }
  }, [selection, deleteOne, t]);

  const handleExportAll = useCallback(async () => {
    try {
      const snap = await getDocs(INVITATIONS_COLLECTION_REF);
      // Sin tokens de setup en claro en el JSON exportado.
      const data = snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => {
        const { _activeSetupToken: _t, legacyToken: _l, activeSession: _s, setupTokenHash: _h, ...safe } = d.data();
        return { id: d.id, ...safe };
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedingo-invitaciones-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("superadmin.exportError"));
    }
  }, [t]);

  const filtered = searchInvitations(invitations as unknown as Record<string, unknown>[], search) as unknown as InvitationRow[];
  // F3-5: filtro por etiquetas del superadmin.
  const filteredByTag = tagFilter
    ? filtered.filter((inv) => (inv.tags || "").toLowerCase().includes(tagFilter.toLowerCase()))
    : filtered;

  // Ordenación por columnas: Token, Tema, Fecha y Usuario (Acciones no).
  const sortColumns = useMemo<SortableColumn<InvitationRow>[]>(
    () => [
      { key: "token", type: "string", getValue: (r: InvitationRow) => r.id },
      { key: "theme", type: "string", getValue: (r: InvitationRow) => r.theme },
      {
        key: "date",
        type: "string",
        getValue: (r: InvitationRow) =>
          r.weddingDay && r.weddingMonth && r.weddingYear ? `${r.weddingDay} ${r.weddingMonth} ${r.weddingYear}` : "",
      },
      { key: "user", type: "string", getValue: (r: InvitationRow) => r.adminUsername },
    ],
    [],
  );
  const { sorted: sortedInvitations, toggleSort, getIndicator } = useColumnSort(filteredByTag, sortColumns);

  // Al cambiar la búsqueda o las etiquetas se vuelve a la primera página.
  useEffect(() => {
    setPage(0);
  }, [search, tagFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredByTag.length / PAGE_SIZE));
  const pagedRows = sortedInvitations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalBytes = invitations.reduce((acc, d) => {
    try {
      return acc + new Blob([JSON.stringify(d)]).size;
    } catch {
      return acc;
    }
  }, 0);

  if (loading)
    return (
      <p className="setup-subtitle" style={{ textAlign: "center" }}>
        {t("common.loading")}
      </p>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {error && <p className="setup-error">{error}</p>}

      <div className="admin-filters" style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          id="superadminSearch"
          className="setup-input"
          style={{ flex: 1, minWidth: "10rem" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("superadmin.searchTokenPlaceholder")}
          autoComplete="off"
          aria-label={t("superadmin.searchTokenPlaceholder")}
        />
        <input
          className="setup-input"
          style={{ width: "10rem" }}
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder={t("superadmin.filterTagPlaceholder")}
          aria-label={t("superadmin.filterTagPlaceholder")}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <span className="setup-help" style={{ margin: 0 }}>
          {t("superadmin.invitationsCount", { count: invitations.length, size: formatBytes(totalBytes) })}
        </span>
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={handleExportAll}
          disabled={!invitations.length}
        >
          {t("superadmin.data.exportAllBtn")}
        </button>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {filteredByTag.length === 0 ? (
          search || tagFilter ? (
            <EmptyState title={t("superadmin.noResultsFilter")} description={t("superadmin.noResultsFilterHint")} />
          ) : (
            <EmptyState title={t("superadmin.noInvitations")} />
          )
        ) : (
          <>
            <TableActionsBar
              total={filteredByTag.length}
              selectedCount={selection.selectedCount}
              allSelected={selection.allSelected}
              onToggleAll={() => selection.toggleAll(filteredByTag.map((r) => r.id))}
              selectAllLabel={t("superadmin.selectAllInvitations")}
            >
              <button
                type="button"
                className="setup-button setup-button--danger setup-button--compact"
                disabled={selection.selectedCount === 0}
                onClick={() => void handleBulkDelete()}
              >
                {t("superadmin.deleteSelected", { count: selection.selectedCount })}
              </button>
            </TableActionsBar>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: "2rem" }} />
                    <SortableTh columnKey="token" order={getIndicator("token")} onSort={toggleSort}>
                      {t("superadmin.tableToken")}
                    </SortableTh>
                    <SortableTh columnKey="theme" order={getIndicator("theme")} onSort={toggleSort}>
                      {t("superadmin.tableTheme")}
                    </SortableTh>
                    <SortableTh columnKey="date" order={getIndicator("date")} onSort={toggleSort}>
                      {t("superadmin.tableDate")}
                    </SortableTh>
                    <SortableTh columnKey="user" order={getIndicator("user")} onSort={toggleSort}>
                      {t("superadmin.tableUser")}
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map(
                    (inv: InvitationRow) => (
                      <tr key={inv.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={t("superadmin.selectInvitation", { id: inv.id })}
                            checked={selection.isSelected(inv.id)}
                            onChange={() => selection.toggle(inv.id)}
                          />
                        </td>
                        <td style={{ fontSize: "0.7rem", fontFamily: "monospace" }}>{inv.id}</td>
                        <td>{inv.theme || "—"}</td>
                        <td className="admin-table__date">
                          {inv.weddingDay && inv.weddingMonth && inv.weddingYear
                            ? `${inv.weddingDay} ${inv.weddingMonth} ${inv.weddingYear}`
                            : "—"}
                        </td>
                        <td>{inv.adminUsername ? `@${inv.adminUsername}` : "—"}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <Pagination
                page={page}
                totalPages={totalPages}
                pageSize={PAGE_SIZE}
                total={filteredByTag.length}
                pageSizes={[PAGE_SIZE]}
                onPageChange={setPage}
                onPageSizeChange={() => undefined}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
});

export default InvitationsTab;
