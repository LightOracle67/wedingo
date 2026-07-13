import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, doc, collection, writeBatch, getDoc } from "firebase/firestore";
import { db, INVITATIONS_COLLECTION_REF, RSVP_COLLECTION_REF, rsvpByInviteRef } from "../../lib/firebase";
import { useToast } from "../../contexts/ToastContext";
import { downloadJson } from "../../lib/file-utils";

/**
 * Pestaña de gestión de datos para el superadmin.
 * Permite exportar y eliminar datos de invitaciones de forma individual,
 * masiva o completa, con confirmación por texto para acciones destructivas.
 *
 * @returns {JSX.Element} Panel de gestión de datos.
 */
export default function DataTab() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  /** Lista completa de invitaciones con metadatos. */
  const [invitations, setInvitations] = useState([]);
  /** IDs de invitaciones seleccionadas para operaciones masivas. */
  const [selected, setSelected] = useState(new Set());
  /** Texto de confirmación para eliminaciones destructivas. */
  const [confirmText, setConfirmText] = useState("");
  /** ¿Está cargando datos? */
  const [loading, setLoading] = useState(true);
  /** ¿Está ejecutando una operación? */
  const [busy, setBusy] = useState(false);

  /** Texto requerido para confirmar eliminaciones. */
  const CONFIRM_WORD = "ELIMINAR";

  // ── Carga de datos ────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [invSnap, rsvpSnap, tokenSnap] = await Promise.all([
          getDocs(INVITATIONS_COLLECTION_REF),
          getDocs(RSVP_COLLECTION_REF),
          getDocs(collection(db, "setupTokens")),
        ]);
        if (cancelled) return;

        // Construye contadores por inviteToken
        const rsvpCounts = {};
        const tokenCounts = {};
        for (const d of rsvpSnap.docs) {
          const tk = d.data().inviteToken;
          if (tk) rsvpCounts[tk] = (rsvpCounts[tk] || 0) + 1;
        }
        for (const d of tokenSnap.docs) {
          const tk = d.data().inviteToken;
          if (tk) tokenCounts[tk] = (tokenCounts[tk] || 0) + 1;
        }

        const list = invSnap.docs.map((d) => {
          const data = d.data();
          const token = d.id;
          return {
            id: token,
            firstName: data.firstName || "",
            secondName: data.secondName || "",
            adminUsername: data.adminUsername || "",
            rsvpCount: rsvpCounts[token] || 0,
            tokenCount: tokenCounts[token] || 0,
            weddingDate: data.weddingDay && data.weddingMonth && data.weddingYear
              ? `${data.weddingDay}/${data.weddingMonth}/${data.weddingYear}`
              : "",
            hasSession: !!data.activeSession,
          };
        });
        list.sort((a, b) => (b.weddingDate || "").localeCompare(a.weddingDate || ""));
        setInvitations(list);
      } catch { /* silencioso */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  /** IDs de invitaciones que no tienen datos (sin nombres configurados). */
  const emptyIds = useMemo(
    () => new Set(invitations.filter((i) => !i.firstName && !i.secondName && !i.rsvpCount).map((i) => i.id)),
    [invitations],
  );

  // ── Selección ─────────────────────────────────────────

  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(invitations.map((i) => i.id)));
  }, [invitations]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  // ── Export ────────────────────────────────────────────

  /**
   * Exporta los datos completos de una invitación (config + RSVPs + tokens).
   *
   * @param {string} token - Token/ID de la invitación.
   */
  const exportOne = useCallback(async (token) => {
    setBusy(true);
    try {
      const [invDoc, rsvpSnap] = await Promise.all([
        getDoc(doc(db, "invitations", token)),
        getDocs(rsvpByInviteRef(token)),
      ]);
      const data = {
        invitation: { id: token, ...(invDoc.exists() ? invDoc.data() : {}) },
        rsvps: rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
      // Carga la galería si existe
      try {
        const gallerySnap = await getDocs(collection(db, "invitations", token, "gallery"));
        data.gallery = gallerySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch { data.gallery = []; }
      downloadJson(`${token}_export.json`, data);
      addToast("success", t("superadmin.data.exportedOne", { token }));
    } catch {
      addToast("error", t("superadmin.data.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [addToast, t]);

  /** Exporta todas las invitaciones seleccionadas en un solo JSON. */
  const exportSelected = useCallback(async () => {
    if (!selected.size) return;
    setBusy(true);
    try {
      const result = [];
      for (const token of selected) {
        const [invDoc, rsvpSnap] = await Promise.all([
          getDoc(doc(db, "invitations", token)),
          getDocs(rsvpByInviteRef(token)),
        ]);
        result.push({
          invitation: { id: token, ...(invDoc.exists() ? invDoc.data() : {}) },
          rsvps: rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        });
      }
      downloadJson("wedingo_export.json", result);
      addToast("success", t("superadmin.data.exportedSelected", { count: selected.size }));
    } catch {
      addToast("error", t("superadmin.data.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [selected, addToast, t]);

  /** Exporta TODAS las invitaciones con sus datos. */
  const exportAll = useCallback(async () => {
    setBusy(true);
    try {
      const [invSnap, rsvpSnap, tokenSnap] = await Promise.all([
        getDocs(INVITATIONS_COLLECTION_REF),
        getDocs(RSVP_COLLECTION_REF),
        getDocs(collection(db, "setupTokens")),
      ]);
      const data = {
        exportedAt: new Date().toISOString(),
        invitations: invSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        rsvps: rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        tokens: tokenSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
      downloadJson("wedingo_full_export.json", data);
      addToast("success", t("superadmin.data.exportedAll", { count: invSnap.size }));
    } catch {
      addToast("error", t("superadmin.data.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [addToast, t]);

  // ── Delete ────────────────────────────────────────────

  /**
   * Elimina una invitación y TODOS sus datos asociados (RSVPs, galería, tokens).
   *
   * @param {string} token - Token/ID de la invitación.
   */
  const deleteOne = useCallback(async (token) => {
    if (confirmText !== CONFIRM_WORD) {
      addToast("error", t("superadmin.data.confirmRequired", { word: CONFIRM_WORD }));
      return;
    }
    setBusy(true);
    try {
      await cascadeDelete(token);
      setInvitations((prev) => prev.filter((i) => i.id !== token));
      setSelected((prev) => { const n = new Set(prev); n.delete(token); return n; });
      setConfirmText("");
      addToast("success", t("superadmin.data.deletedOne", { token }));
    } catch {
      addToast("error", t("superadmin.data.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }, [confirmText, addToast, t]);

  /** Elimina las invitaciones seleccionadas. */
  const deleteSelected = useCallback(async () => {
    if (!selected.size) return;
    if (confirmText !== CONFIRM_WORD) {
      addToast("error", t("superadmin.data.confirmRequired", { word: CONFIRM_WORD }));
      return;
    }
    setBusy(true);
    let deleted = 0;
    try {
      for (const token of selected) {
        await cascadeDelete(token);
        deleted++;
      }
      setInvitations((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
      setConfirmText("");
      addToast("success", t("superadmin.data.deletedSelected", { count: deleted }));
    } catch {
      addToast("error", t("superadmin.data.partialDelete", { deleted, total: selected.size }));
    } finally {
      setBusy(false);
    }
  }, [selected, confirmText, addToast, t]);

  /** Elimina TODAS las invitaciones y datos del sistema. */
  const deleteAll = useCallback(async () => {
    if (confirmText !== CONFIRM_WORD) {
      addToast("error", t("superadmin.data.confirmRequired", { word: CONFIRM_WORD }));
      return;
    }
    if (!window.confirm(t("superadmin.data.deleteAllConfirm"))) return;
    setBusy(true);
    try {
      const invSnap = await getDocs(INVITATIONS_COLLECTION_REF);
      let deleted = 0;
      for (const d of invSnap.docs) {
        await cascadeDelete(d.id);
        deleted++;
      }
      setInvitations([]);
      setSelected(new Set());
      setConfirmText("");
      addToast("success", t("superadmin.data.deletedAll", { count: deleted }));
    } catch {
      addToast("error", t("superadmin.data.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }, [confirmText, addToast, t]);

  // ── Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "12rem", height: "100%" }}>
        <div className="page-loading" style={{ minHeight: "6rem" }} />
        <p style={{ textAlign: "center", color: "var(--setup-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          {t("common.loading")}
        </p>
      </div>
    );
  }

  const selectedCount = selected.size;
  const totalCount = invitations.length;
  const isEmptyCount = emptyIds.size;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* ── Acciones en lote ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.8rem", alignItems: "center", flexShrink: 0 }}>
        <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={selectAll} disabled={busy}>
          {t("superadmin.data.selectAll")}
        </button>
        <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={deselectAll} disabled={busy}>
          {t("superadmin.data.deselectAll")}
        </button>

        <span style={{ flex: 1 }} />

        <button type="button" className="setup-button setup-button--compact" onClick={exportAll} disabled={busy}>
          {t("superadmin.data.exportAllBtn")} ({totalCount})
        </button>

        {selectedCount > 0 && (
          <>
            <button type="button" className="setup-button setup-button--compact" onClick={exportSelected} disabled={busy}>
              {t("superadmin.data.exportSelectedBtn", { count: selectedCount })}
            </button>
            <button
              type="button"
              className="setup-button setup-button--danger setup-button--compact"
              onClick={deleteSelected}
              disabled={busy || confirmText !== CONFIRM_WORD}
            >
              {t("superadmin.data.deleteSelectedBtn", { count: selectedCount })}
            </button>
          </>
        )}

        {isEmptyCount > 0 && (
          <button
            type="button"
            className="setup-button setup-button--danger setup-button--compact"
            onClick={async () => {
              setSelected(emptyIds);
            }}
            disabled={busy}
          >
            {t("superadmin.data.selectEmpty", { count: isEmptyCount })}
          </button>
        )}
      </div>

      {/* ── Confirmación ── */}
      <div style={{ marginBottom: "0.8rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="text"
          className="setup-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={t("superadmin.data.confirmPlaceholder", { word: CONFIRM_WORD })}
          disabled={busy}
          style={{ maxWidth: "16rem", fontSize: "0.82rem" }}
        />
        <button
          type="button"
          className="setup-button setup-button--danger"
          onClick={deleteAll}
          disabled={busy || confirmText !== CONFIRM_WORD}
          style={{ fontSize: "0.8rem" }}
        >
          {t("superadmin.data.deleteAllBtn")}
        </button>
      </div>

      {/* ── Tabla de invitaciones ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", border: "1px solid var(--setup-border)", borderRadius: "0.5rem" }}>
        <table className="superadmin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ position: "sticky", top: 0, background: "var(--setup-card-bg)", zIndex: 1 }}>
              <th style={thStyle}>
                <input
                  type="checkbox"
                  checked={selectedCount === totalCount && totalCount > 0}
                  onChange={() => selectedCount === totalCount ? deselectAll() : selectAll()}
                  disabled={busy}
                  aria-label={t("superadmin.data.selectAll")}
                />
              </th>
              <th style={thStyle}>{t("superadmin.data.colToken")}</th>
              <th style={thStyle}>{t("superadmin.data.colNames")}</th>
              <th style={thStyle}>{t("superadmin.data.colDate")}</th>
              <th style={thStyle}>{t("superadmin.data.colRsvps")}</th>
              <th style={thStyle}>{t("superadmin.data.colSession")}</th>
              <th style={thStyle}>{t("superadmin.data.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "1px solid var(--setup-border)", opacity: emptyIds.has(inv.id) ? 0.5 : 1 }}>
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={selected.has(inv.id)}
                    onChange={() => toggleSelect(inv.id)}
                    disabled={busy}
                    aria-label={`${t("superadmin.data.select")} ${inv.id}`}
                  />
                </td>
                <td style={tdStyle}>
                  <code style={{ fontSize: "0.75rem", cursor: "pointer" }} onClick={() => navigator.clipboard?.writeText(inv.id)} title={t("superadmin.data.copyToken")}>
                    {inv.id}
                  </code>
                </td>
                <td style={tdStyle}>
                  {inv.firstName ? `${inv.firstName} & ${inv.secondName}` : <span style={{ color: "var(--setup-muted)", fontStyle: "italic" }}>{t("superadmin.data.emptyInvitation")}</span>}
                  {inv.adminUsername ? <span style={{ color: "var(--setup-muted)", fontSize: "0.7rem", display: "block" }}>@{inv.adminUsername}</span> : null}
                </td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{inv.weddingDate || "—"}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{inv.rsvpCount}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{inv.hasSession ? "🟢" : "—"}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => exportOne(inv.id)} disabled={busy} style={{ fontSize: "0.7rem" }}>
                      {t("superadmin.data.export")}
                    </button>
                    <button type="button" className="setup-button setup-button--danger setup-button--compact" onClick={() => deleteOne(inv.id)} disabled={busy || confirmText !== CONFIRM_WORD} style={{ fontSize: "0.7rem" }}>
                      {t("superadmin.data.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!invitations.length && (
          <p style={{ textAlign: "center", color: "var(--setup-muted)", padding: "1.5rem" }}>
            {t("superadmin.data.noInvitations")}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

const thStyle = { padding: "0.4rem 0.5rem", textAlign: "left", fontWeight: 600, borderBottom: "2px solid var(--setup-border)", whiteSpace: "nowrap" };
const tdStyle = { padding: "0.35rem 0.5rem", verticalAlign: "middle" };

/**
 * Elimina en cascada una invitación y todos sus datos asociados:
 * RSVPs, imágenes de galería, tokens de setup, y el documento principal.
 *
 * @param {string} token - Token/ID de la invitación.
 */
async function cascadeDelete(token) {
  const BATCH_SIZE = 500;
  const refsToDelete = [];

  // RSVPs
  const rsvpSnap = await getDocs(rsvpByInviteRef(token));
  for (const d of rsvpSnap.docs) refsToDelete.push(d.ref);

  // Gallery images
  const gallerySnap = await getDocs(collection(db, "invitations", token, "gallery"));
  for (const d of gallerySnap.docs) refsToDelete.push(d.ref);

  // Setup tokens (busca por inviteToken)
  const tokenSnap = await getDocs(collection(db, "setupTokens"));
  for (const d of tokenSnap.docs) {
    if (d.data().inviteToken === token) refsToDelete.push(d.ref);
  }

  // Invitation doc (siempre al final)
  refsToDelete.push(doc(db, "invitations", token));

  // Firestore permite un máximo de 500 operaciones por batch.
  // Troceamos las referencias en lotes y confirmamos cada uno por separado
  // para evitar que invitaciones con muchos RSVPs/imágenes fallen silenciosamente.
  for (let i = 0; i < refsToDelete.length; i += BATCH_SIZE) {
    const chunk = refsToDelete.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const ref of chunk) batch.delete(ref);
    await batch.commit();
  }
}
