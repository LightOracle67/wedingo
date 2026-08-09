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
import { hashSetupToken } from "../../lib/setup-token";
import { useColumnSort, type SortableColumn } from "../../lib/useColumnSort";
import { SortableTh } from "../../components/SortableTh";

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
  // Tokens LEGACY: invitaciones con el campo `_activeSetupToken` (formato
  // anterior a v2.95.22). Los nuevos viven en setupTokens/{hash}.
  const [tokens, setTokens] = useState<LegacyToken[]>([]);
  // Tokens NUEVOS: registros setupTokens/{hash} → { inviteToken }.
  const [hashedTokens, setHashedTokens] = useState<HashedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  const handleRevoke = useCallback(
    async (invId: string) => {
      if (!window.confirm(t("superadmin.revokeConfirm"))) return;
      setError("");
      setMessage("");
      try {
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
      } catch {
        setError(t("superadmin.tokenRevokeError"));
      }
    },
    [loadTokens, tokens, t],
  );

  const handleCleanup = useCallback(async () => {
    if (!window.confirm(t("superadmin.cleanupConfirm"))) return;
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
  }, [loadTokens, t]);

  /**
   * Migra un token legacy al esquema de hash: crea el registro setupTokens
   * (el token que ya conoce el admin sigue siendo válido) y retira el campo
   * legacy del documento público. Solo el superadmin puede ejecutarlo.
   */
  const handleMigrate = useCallback(
    async (invId: string, activeToken: string) => {
      if (!window.confirm(t("superadmin.migrateConfirm"))) return;
      setError("");
      setMessage("");
      try {
        const tokenHash = await hashSetupToken(activeToken);
        await setDoc(doc(db, "setupTokens", tokenHash), { inviteToken: invId, createdAt: new Date().toISOString() });
        await updateDoc(doc(db, "invitations", invId), {
          _activeSetupToken: deleteField(),
          legacyToken: deleteField(),
        });
        setMessage(t("superadmin.tokenMigrated"));
        await loadTokens();
      } catch {
        setError(t("superadmin.tokenMigrateError"));
      }
    },
    [loadTokens, t],
  );

  /** Revoca un token NUEVO (setupTokens/{hash}): al borrar el registro, la
   *  regla de sesión deja de aceptar ese hash (prueba de conocimiento). */
  const handleRevokeHashed = useCallback(
    async (hash: string) => {
      if (!window.confirm(t("superadmin.revokeConfirm"))) return;
      setError("");
      setMessage("");
      try {
        await deleteDoc(doc(db, "setupTokens", hash));
        setMessage(t("superadmin.tokenRevoked"));
        await loadTokens();
      } catch {
        setError(t("superadmin.tokenRevokeError"));
      }
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

      <div className="setup-actions" style={{ marginBottom: "1rem" }}>
        <button className="setup-button setup-button--ghost" type="button" onClick={handleCleanup}>
          {t("superadmin.cleanUnused")}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="setup-token-card" style={{ padding: "2rem", textAlign: "center" }}>
          <p className="setup-help" style={{ margin: 0, fontSize: "0.9rem" }}>
            {t("superadmin.noTokens")}
          </p>
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <SortableTh columnKey="invite" order={getIndicator("invite")} onSort={toggleSort}>
                  {t("superadmin.tableToken")}
                </SortableTh>
                <SortableTh columnKey="type" order={getIndicator("type")} onSort={toggleSort}>
                  {t("superadmin.tableType")}
                </SortableTh>
                <th>{t("superadmin.tableActions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row: TokenRow) => (
                <tr key={row.key}>
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
                  <td style={{ whiteSpace: "nowrap" }}>
                    {row.type === "legacy" ? (
                      <button
                        className="setup-button setup-button--ghost"
                        type="button"
                        style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
                        onClick={() => handleMigrate(row.inviteToken, row.legacyToken || "")}
                      >
                        {t("superadmin.migrateButton")}
                      </button>
                    ) : null}
                    <button
                      className="setup-button setup-button--ghost"
                      type="button"
                      style={{
                        padding: "0.3rem 0.7rem",
                        fontSize: "0.8rem",
                        borderColor: "#f6c7c7",
                        color: "#f6c7c7",
                        marginLeft: row.type === "legacy" ? "0.4rem" : 0,
                      }}
                      onClick={() => (row.type === "legacy" ? handleRevoke(row.inviteToken) : handleRevokeHashed(row.hash || ""))}
                    >
                      {t("superadmin.revokeButton")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message ? <p className="setup-success">{message}</p> : null}
      {error ? <p className="setup-error">{error}</p> : null}
    </div>
  );
});

export default TokensTab;
