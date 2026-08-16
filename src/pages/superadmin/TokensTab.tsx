import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteField,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useTranslation } from "react-i18next";
import { useConfirm } from "../../contexts/ConfirmContext";
import { hashSetupToken } from "../../lib/setup-token";
import { useColumnSort, type SortableColumn } from "../../lib/useColumnSort";
import { useRowSelection } from "../../hooks/useRowSelection";
import { SortableTh } from "../../components/SortableTh";
import { TableActionsBar } from "../../components/TableActionsBar";
import Pagination from "../../components/Pagination";

interface LegacyToken {
  id: string;
  activeToken: string;
}
interface HashedToken {
  hash: string;
  inviteToken: string;
}
interface TokenRow {
  key: string;
  inviteToken: string;
  type: "legacy" | "hash";
  legacyToken?: string;
  hash?: string;
}

const TokensTab = memo(function TokensTab() {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  // Tokens LEGACY: invitaciones con el campo `_activeSetupToken` (formato
  // anterior a v2.95.22). Los nuevos viven en setupTokens/{hash}.
  const [tokens, setTokens] = useState<LegacyToken[]>([]);
  // Tokens NUEVOS: registros setupTokens/{hash} → { inviteToken }.
  const [hashedTokens, setHashedTokens] = useState<HashedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadTokens = useCallback(async () => {
    try {
      const [legacySnap, hashSnap] = await Promise.all([
        getDocs(query(collection(db, "invitations"), where("_activeSetupToken", "!=", ""))),
        // list en setupTokens es solo-superadmin (reglas): aquí se ejecuta con sesión.
        getDocs(collection(db, "setupTokens")),
      ]);
      const legacy = legacySnap.docs.map((d: { id: string; data: () => { _activeSetupToken?: string } }) => ({
        id: d.id,
        activeToken: d.data()._activeSetupToken || "",
      }));
      const hashed = hashSnap.docs.map((d) => ({
        hash: d.id,
        inviteToken: String(d.data().inviteToken || ""),
      }));
      setTokens(legacy);
      setHashedTokens(hashed);
    } catch {
      setError(t("superadmin.tokenLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  /** Revoca un token LEGACY (invitación con `_activeSetupToken`). */
  const revokeOne = useCallback(
    async (invId: string) => {
      setError("");
      setMessage("");
      await updateDoc(doc(db, "invitations", invId), { _activeSetupToken: "" });
      // Un token MIGRADO vive en setupTokens/{hash}: sin borrarlo, revocar el
      // campo legacy dejaba el token aún válido (no se podía revocar nunca).
      const activeToken = tokens.find((tk) => tk.id === invId)?.activeToken;
      if (activeToken) {
        const hash = await hashSetupToken(activeToken);
        await deleteDoc(doc(db, "setupTokens", hash));
      }
      setMessage(t("superadmin.tokenRevoked"));
      await loadTokens();
    },
    [loadTokens, tokens, t],
  );

  /** Revoca un token NUEVO (setupTokens/{hash}): al borrar el registro, la
   *  regla de sesión deja de aceptar ese hash (prueba de conocimiento). */
  const revokeHashedOne = useCallback(
    async (hash: string) => {
      setError("");
      setMessage("");
      await deleteDoc(doc(db, "setupTokens", hash));
      setMessage(t("superadmin.tokenRevoked"));
      await loadTokens();
    },
    [loadTokens, t],
  );

  const handleCleanup = useCallback(async () => {    if (!(await confirm({ message: t("superadmin.cleanupConfirm") }))) return;
    setError("");
    setMessage("");
    try {
      const q = query(collection(db, "invitations"), where("_activeSetupToken", "!=", ""));
      const snap = await getDocs(q);
      // Solo se limpian los tokens NUNCA usados: una invitación con sesión
      // activa (admin en pleno flujo) se conserva. Antes se revocaba TODO.
      const unused = snap.docs.filter((d) => !d.data().activeSession);
      if (unused.length === 0) {
        setMessage(t("superadmin.noTokensToClean"));
        return;
      }
      const batch = writeBatch(db);
      unused.forEach((d) => batch.update(d.ref, { _activeSetupToken: "" }));
      await batch.commit();
      setMessage(t("superadmin.tokensCleaned", { count: unused.length }));
      await loadTokens();
    } catch {
      setError(t("superadmin.tokenCleanError"));
    }
  }, [loadTokens, t, confirm]);

  /**
   * Migra un token legacy al esquema de hash: crea el registro setupTokens
   * (el token que ya conoce el admin sigue siendo válido) y retira el campo
   * legacy del documento público. Solo el superadmin puede ejecutarlo.
   */
  const migrateOne = useCallback(
    async (invId: string, activeToken: string) => {
      setError("");
      setMessage("");
      const tokenHash = await hashSetupToken(activeToken);
      await setDoc(doc(db, "setupTokens", tokenHash), { inviteToken: invId, createdAt: new Date().toISOString() });
      await updateDoc(doc(db, "invitations", invId), {
        _activeSetupToken: deleteField(),
        legacyToken: deleteField(),
      });
      setMessage(t("superadmin.tokenMigrated"));
      await loadTokens();
    },
    [loadTokens, t],
  );

  // Unifica legacy y hashed en filas de tabla (sin exponer el token secreto).
  // Se calcula SIEMPRE (antes del early return de loading) para no violar las
  // reglas de los hooks.
  const rows = useMemo<TokenRow[]>(
    () => [
      ...tokens.map((tk) => ({
        key: `legacy-${tk.id}`,
        inviteToken: tk.id,
        type: "legacy" as const,
        legacyToken: tk.activeToken,
      })),
      ...hashedTokens.map((tk) => ({
        key: `hash-${tk.hash}`,
        inviteToken: tk.inviteToken,
        type: "hash" as const,
        hash: tk.hash,
      })),
    ],
    [tokens, hashedTokens],
  );

  // Ordenación por columnas: Invitación y Tipo (Acciones no).
  const sortColumns = useMemo<SortableColumn<TokenRow>[]>(
    () => [
      { key: "invite", type: "string", getValue: (r: TokenRow) => r.inviteToken },
      { key: "type", type: "string", getValue: (r: TokenRow) => r.type },
    ],
    [],
  );
  const { sorted: sortedRows, toggleSort, getIndicator } = useColumnSort(rows, sortColumns);

  // Filtro de búsqueda por token/hash (client-side).
  const visibleRows = search
    ? sortedRows.filter((r) => r.inviteToken.toLowerCase().includes(search.toLowerCase()))
    : sortedRows;

  // Paginación client-side: al cambiar la búsqueda se vuelve a la página 1.
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [search]);
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const pagedRows = visibleRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Conflicto de tokens: dos hashes apuntando a la MISMA invitación, o dos
  // invitaciones con el MISMO token legacy (inseguro: cualquiera de ellas
  // acepta la sesión). El superadmin debe migrar/revocar estos casos.
  const conflicts = useMemo(() => {
    const countByInvite: Record<string, number> = {};
    for (const h of hashedTokens) countByInvite[h.inviteToken] = (countByInvite[h.inviteToken] || 0) + 1;
    const duplicateInvites = Object.entries(countByInvite)
      .filter(([, n]) => n > 1)
      .map(([k]) => k);
    const countByLegacy: Record<string, number> = {};
    for (const tk of tokens) countByLegacy[tk.activeToken] = (countByLegacy[tk.activeToken] || 0) + 1;
    const duplicateLegacy = Object.entries(countByLegacy)
      .filter(([, n]) => n > 1)
      .map(([k]) => k);
    return { duplicateInvites, duplicateLegacy };
  }, [tokens, hashedTokens]);

  // Selección de filas para acciones genéricas en lote (fuera de la tabla).
  const selection = useRowSelection();
  const selectedLegacy = tokens.filter((tk) => selection.selected.has(`legacy-${tk.id}`));
  const selectedHashed = hashedTokens.filter((tk) => selection.selected.has(`hash-${tk.hash}`));

  // Revoca en lote todos los tokens seleccionados (legacy y hash), con una
  // única confirmación.
  const handleBulkRevoke = useCallback(async () => {
    const count = selectedLegacy.length + selectedHashed.length;
    if (count === 0 || !(await confirm({ message: t("superadmin.revokeSelectedConfirm", { count }) }))) return;
    setError("");
    setMessage("");
    try {
      for (const tk of selectedLegacy) await revokeOne(tk.id);
      for (const tk of selectedHashed) await revokeHashedOne(tk.hash);
      selection.clear();
    } catch {
      setError(t("superadmin.tokenRevokeError"));
    }
  }, [selectedLegacy, selectedHashed, revokeOne, revokeHashedOne, selection, t, confirm]);

  // Migra en lote los tokens legacy seleccionados (los hashed ya están migrados).
  const handleBulkMigrate = useCallback(async () => {
    if (selectedLegacy.length === 0 || !(await confirm({ message: t("superadmin.migrateSelectedConfirm", { count: selectedLegacy.length }) }))) return;
    setError("");
    setMessage("");
    try {
      for (const tk of selectedLegacy) await migrateOne(tk.id, tk.activeToken);
      selection.clear();
    } catch {
      setError(t("superadmin.tokenMigrateError"));
    }
  }, [selectedLegacy, migrateOne, selection, t, confirm]);

  if (loading) {
    return (
      <p className="setup-subtitle" style={{ textAlign: "center" }}>
        {t("superadmin.tokensLoading")}
      </p>
    );
  }

  return (
    <div>
      <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.9rem" }}>
          {t("superadmin.tokensStats", { total: tokens.length + hashedTokens.length, used: 0, available: tokens.length + hashedTokens.length })}
        </p>
      </div>

      <div className="setup-actions" style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button className="setup-button setup-button--ghost" type="button" onClick={handleCleanup}>
          {t("superadmin.cleanUnused")}
        </button>
        <input
          className="setup-input"
          style={{ maxWidth: "16rem" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("superadmin.searchTokenPlaceholder")}
          aria-label={t("superadmin.searchTokenPlaceholder")}
          autoComplete="off"
        />
      </div>

      {(conflicts.duplicateInvites.length > 0 || conflicts.duplicateLegacy.length > 0) ? (
        <div
          className="setup-background-panel"
          style={{ marginBottom: "1rem", borderColor: "#f6c7c7", borderLeft: "3px solid #ef4444", padding: "0.6rem 0.9rem" }}
        >
          <p className="setup-label" style={{ color: "#ef4444" }}>{t("superadmin.tokenConflictsTitle")}</p>
          {conflicts.duplicateLegacy.length > 0 ? (
            <p className="setup-help" style={{ margin: "0.2rem 0 0" }}>
              {t("superadmin.tokenConflictsLegacy")}: {conflicts.duplicateLegacy.join(", ")}
            </p>
          ) : null}
          {conflicts.duplicateInvites.length > 0 ? (
            <p className="setup-help" style={{ margin: "0.2rem 0 0" }}>
              {t("superadmin.tokenConflictsHash")}: {conflicts.duplicateInvites.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="setup-token-card" style={{ padding: "2rem", textAlign: "center" }}>
          <p className="setup-help" style={{ margin: 0, fontSize: "0.9rem" }}>
            {t("superadmin.noTokens")}
          </p>
        </div>
      ) : (
        <>
          <TableActionsBar
            total={visibleRows.length}
            selectedCount={selection.selectedCount}
            allSelected={selection.allSelected}
            onToggleAll={() => selection.toggleAll(visibleRows.map((r) => r.key))}
            selectAllLabel={t("superadmin.selectAllTokens")}
          >
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              disabled={selectedLegacy.length === 0}
              onClick={() => void handleBulkMigrate()}
            >
              {t("superadmin.migrateSelected", { count: selectedLegacy.length })}
            </button>
            <button
              type="button"
              className="setup-button setup-button--danger setup-button--compact"
              disabled={selection.selectedCount === 0}
              onClick={() => void handleBulkRevoke()}
            >
              {t("superadmin.revokeSelected", { count: selection.selectedCount })}
            </button>
          </TableActionsBar>

          <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <caption className="admin-table__caption">{t("superadmin.tokensTableTitle")}</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ width: "2rem" }} />
                  <SortableTh columnKey="invite" order={getIndicator("invite")} onSort={toggleSort}>
                    {t("superadmin.tableToken")}
                  </SortableTh>
                  <SortableTh columnKey="type" order={getIndicator("type")} onSort={toggleSort}>
                    {t("superadmin.tableType")}
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row: TokenRow) => (
                  <tr key={row.key}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={t("superadmin.selectToken", { token: row.inviteToken })}
                        checked={selection.isSelected(row.key)}
                        onChange={() => selection.toggle(row.key)}
                      />
                    </td>
                    <td className="admin-text-mono" style={{ fontSize: "0.8rem" }}>
                      {row.inviteToken}
                    </td>
                    <td>
                      {row.type === "legacy" ? (
                        <span className="admin-badge admin-badge--yes">{t("superadmin.statusLegacy")}</span>
                      ) : (
                        <span className="admin-badge">{t("superadmin.statusHash")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              pageSize={PAGE_SIZE}
              total={visibleRows.length}
              pageSizes={[PAGE_SIZE]}
              onPageChange={setPage}
              onPageSizeChange={() => undefined}
            />
          ) : null}
        </>
      )}

      {message ? <p className="setup-success">{message}</p> : null}
      {error ? <p className="setup-error">{error}</p> : null}
    </div>
  );
});

export default TokensTab;
