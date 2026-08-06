import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, doc, collection, writeBatch, getDoc, query, where } from "firebase/firestore";
import { db, INVITATIONS_COLLECTION_REF, RSVP_RESPONSES_GROUP, rsvpByInviteRef } from "../../lib/firebase";
import { useToast } from "../../hooks/useToast";
import { downloadJson } from "../../lib/file-utils";
import { logAudit } from "../../lib/audit";

interface InvitationData {
  id: string;
  firstName: string;
  secondName: string;
  adminUsername: string;
  rsvpCount: number;
  tokenCount: number;
  weddingDate: string;
  hasSession: boolean;
}

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
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  /** IDs de invitaciones seleccionadas para operaciones masivas. */
  const [selected, setSelected] = useState<Set<string>>(new Set<string>());
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
        const [invSnap, rsvpSnap] = await Promise.all([
          getDocs(INVITATIONS_COLLECTION_REF),
          getDocs(RSVP_RESPONSES_GROUP),
        ]);
        if (cancelled) return;

        // Construye contadores por inviteToken
        const rsvpCounts: Record<string, number> = {};
        for (const d of rsvpSnap.docs) {
          const tk = d.data().inviteToken;
          if (tk) rsvpCounts[tk] = (rsvpCounts[tk] || 0) + 1;
        }

        const list = invSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => {
          const data = d.data();
          const token = d.id;
          return {
            id: token,
            firstName: String(data.firstName || ""),
            secondName: String(data.secondName || ""),
            adminUsername: String(data.adminUsername || ""),
            rsvpCount: rsvpCounts[token] || 0,
            tokenCount: 0,
            weddingDate: data.weddingDay && data.weddingMonth && data.weddingYear
              ? `${String(data.weddingDay)}/${String(data.weddingMonth)}/${String(data.weddingYear)}`
              : "",
            hasSession: !!data.activeSession,
          };
        });
        list.sort((a, b) => (b.weddingDate || "").localeCompare(a.weddingDate || ""));
        setInvitations(list);
      } catch {
        if (!cancelled) addToast("error", t("errors.dataLoadFailed"));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [addToast, t]);

  /** IDs de invitaciones que no tienen datos (sin nombres configurados). */
  const emptyIds = useMemo(
    () => new Set<string>(invitations.filter((i) => !i.firstName && !i.secondName && !i.rsvpCount).map((i: InvitationData) => i.id)),
    [invitations],
  );

  // ── Selección ─────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set<string>(invitations.map((i: InvitationData) => i.id)));
  }, [invitations]);

  const deselectAll = useCallback(() => {
    setSelected(new Set<string>());
  }, []);

  // ── Export ────────────────────────────────────────────

  /**
   * Exporta los datos completos de una invitación (config + RSVPs + tokens).
   *
   * @param {string} token - Token/ID de la invitación.
   */
  const exportOne = useCallback(async (token: string) => {
    setBusy(true);
    try {
      const [invDoc, rsvpSnap] = await Promise.all([
        getDoc(doc(db, "invitations", token)),
        getDocs(rsvpByInviteRef(token)),
      ]);
      const data: Record<string, unknown> = {
        invitation: { id: token, ...(invDoc.exists() ? invDoc.data() : {}) },
        rsvps: rsvpSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
      };
      // Carga la galería desde la subcolección
      try {
        const gallerySnap = await getDocs(collection(db, "invitations", token, "gallery"));
        data.gallery = gallerySnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() }));
      } catch { data.gallery = []; }
      // El audio también forma parte del backup individual.
      try {
        const audioSnap = await getDocs(collection(db, "invitations", token, "audio"));
        data.audio = audioSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() }));
      } catch { data.audio = []; }
      downloadJson(`${token}_export_${new Date().toISOString().slice(0,10)}.json`, data);
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
        const [invDoc, rsvpSnap, gallerySnap, audioSnap] = await Promise.all([
          getDoc(doc(db, "invitations", token)),
          getDocs(rsvpByInviteRef(token)),
          getDocs(collection(db, "invitations", token, "gallery")),
          getDocs(collection(db, "invitations", token, "audio")),
        ]);
        result.push({
          invitation: { id: token, ...(invDoc.exists() ? invDoc.data() : {}) },
          rsvps: rsvpSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
          gallery: gallerySnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
          audio: audioSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
        });
      }
      downloadJson(`wedingo_export_${new Date().toISOString().slice(0,10)}.json`, result);
      addToast("success", t("superadmin.data.exportedSelected", { count: selected.size }));
    } catch {
      addToast("error", t("superadmin.data.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [selected, addToast, t]);

  /**
   * Lee la galería y el audio de una invitación (para exportar el backup
   * completo con las fotos y la música).
   */
  const loadMediaForToken = useCallback(async (token: string) => {
    const [gallerySnap, audioSnap] = await Promise.all([
      getDocs(collection(db, "invitations", token, "gallery")),
      getDocs(collection(db, "invitations", token, "audio")),
    ]);
    return {
      gallery: gallerySnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
      audio: audioSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
    };
  }, []);

  /** Exporta TODAS las invitaciones con sus datos (incluida galería/audio). */
  const exportAll = useCallback(async () => {
    setBusy(true);
    try {
      const [invSnap, rsvpSnap] = await Promise.all([
        getDocs(INVITATIONS_COLLECTION_REF),
        getDocs(RSVP_RESPONSES_GROUP),
      ]);
      // Lee la galería/audio de cada invitación con concurrencia limitada
      // (lotes de 5) para no disparar un N+1 masivo en instalaciones grandes.
      const mediaByToken: Record<string, { gallery: unknown[]; audio: unknown[] }> = {};
      const tokens = invSnap.docs.map((d) => d.id);
      for (let i = 0; i < tokens.length; i += 5) {
        const batch = tokens.slice(i, i + 5).map(async (token) => {
          mediaByToken[token] = await loadMediaForToken(token);
        });
        await Promise.all(batch);
      }
      const data = {
        exportedAt: new Date().toISOString(),
        // Se sanean los documentos: el export NO debe incluir tokens de setup
        // en claro (_activeSetupToken/legacyToken) ni hashes de sesión.
        invitations: invSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...sanitizeInvitationForExport(d.data()) })),
        rsvps: rsvpSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
        galleryByToken: mediaByToken,
      };
      downloadJson(`wedingo_full_export_${new Date().toISOString().slice(0,10)}.json`, data);
      addToast("success", t("superadmin.data.exportedAll", { count: invSnap.size }));
    } catch {
      addToast("error", t("superadmin.data.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [addToast, t, loadMediaForToken]);

  // ── Delete ────────────────────────────────────────────

  /**
   * Elimina una invitación y TODOS sus datos asociados (RSVPs, galería, tokens).
   *
   * @param {string} token - Token/ID de la invitación.
   */
  const deleteOne = useCallback(async (token: string) => {
    if (confirmText !== CONFIRM_WORD) {
      addToast("error", t("superadmin.data.confirmRequired", { word: CONFIRM_WORD }));
      return;
    }
    setBusy(true);
    try {
      await cascadeDelete(token);
      setInvitations((prev: InvitationData[]) => prev.filter((i: InvitationData) => i.id !== token));
      setSelected((prev: Set<string>) => { const n = new Set(prev); n.delete(token); return n; });
      setConfirmText("");
      addToast("success", t("superadmin.data.deletedOne", { token }));
      void logAudit("delete_invitation", token);
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
      void logAudit("delete_selected", `count=${deleted}`);
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
      setSelected(new Set<string>());
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
      <div className="data-tab-loading">
        <div className="page-loading" style={{ minHeight: "6rem" }} />
        <p>
          {t("common.loading")}
        </p>
      </div>
    );
  }

  const selectedCount = selected.size;
  const totalCount = invitations.length;
  const isEmptyCount = emptyIds.size;

  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0 }}>
      {/* ── Acciones en lote ── */}
      <div className="data-tab-actions">
        <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={selectAll} disabled={busy}>
          {t("superadmin.data.selectAll")}
        </button>
        <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={deselectAll} disabled={busy}>
          {t("superadmin.data.deselectAll")}
        </button>

        <span style={{ flex: 1, minWidth: "0.5rem" }} />

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
            onClick={() => {
              setSelected(emptyIds);
            }}
            disabled={busy}
          >
            {t("superadmin.data.selectEmpty", { count: isEmptyCount })}
          </button>
        )}
      </div>

      {/* ── Confirmación ── */}
      <div className="data-tab-confirm">
        <input
          type="text"
          className="setup-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={t("superadmin.data.confirmPlaceholder", { word: CONFIRM_WORD })}
          disabled={busy}
        />
        <button
          type="button"
          className="setup-button setup-button--danger"
          onClick={deleteAll}
          disabled={busy || confirmText !== CONFIRM_WORD}
          aria-busy={busy}
        >
          {busy ? t("common.loading") : t("superadmin.data.deleteAllBtn")}
        </button>
      </div>

      {/* ── Tabla de invitaciones ── */}
      <div className="data-tab-table-wrap">
        <table className="data-tab-table">
          <thead>
            <tr className="data-tab-sticky-header">
              <th className="data-tab-th">
                <input
                  type="checkbox"
                  checked={selectedCount === totalCount && totalCount > 0}
                  onChange={() => selectedCount === totalCount ? deselectAll() : selectAll()}
                  disabled={busy}
                  aria-label={t("superadmin.data.selectAll")}
                />
              </th>
              <th className="data-tab-th">{t("superadmin.data.colToken")}</th>
              <th className="data-tab-th">{t("superadmin.data.colNames")}</th>
              <th className="data-tab-th">{t("superadmin.data.colDate")}</th>
              <th className="data-tab-th">{t("superadmin.data.colRsvps")}</th>
              <th className="data-tab-th">{t("superadmin.data.colSession")}</th>
              <th className="data-tab-th">{t("superadmin.data.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.id} className="data-tab-tr" style={{ opacity: emptyIds.has(inv.id) ? 0.5 : 1 }}>
                <td className="data-tab-td">
                  <input
                    type="checkbox"
                    checked={selected.has(inv.id)}
                    onChange={() => toggleSelect(inv.id)}
                    disabled={busy}
                    aria-label={`${t("superadmin.data.select")} ${inv.id}`}
                  />
                </td>
                <td className="data-tab-td">
                  <code className="data-tab-code-copy" onClick={() => navigator.clipboard?.writeText(inv.id)} title={t("superadmin.data.copyToken")}>
                    {inv.id}
                  </code>
                </td>
                <td className="data-tab-td">
                  {inv.firstName ? `${inv.firstName} & ${inv.secondName}` : <span className="data-tab-empty-name">{t("superadmin.data.emptyInvitation")}</span>}
                  {inv.adminUsername ? <span className="data-tab-admin-user">@{inv.adminUsername}</span> : null}
                </td>
                <td className="data-tab-td" style={{ whiteSpace: "nowrap" }}>{inv.weddingDate || "—"}</td>
                <td className="data-tab-td" style={{ textAlign: "center" }}>{inv.rsvpCount}</td>
                <td className="data-tab-td" style={{ textAlign: "center" }}>{inv.hasSession ? "🟢" : "—"}</td>
                <td className="data-tab-td">
                  <div className="admin-flex admin-gap-sm">
                    <button type="button" className="setup-button setup-button--ghost setup-button--compact data-tab-btn-sm" onClick={() => exportOne(inv.id)} disabled={busy}>
                      {t("superadmin.data.exportBtn")}
                    </button>
                    <button type="button" className="setup-button setup-button--danger setup-button--compact data-tab-btn-danger" onClick={() => deleteOne(inv.id)} disabled={busy || confirmText !== CONFIRM_WORD}>
                      {t("superadmin.data.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!invitations.length && (
          <p className="data-tab-empty-msg">
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



/** Elimina los campos sensibles de un documento de invitación antes de
 *  exportarlo: los tokens de setup no deben viajar en claro en un JSON. */
function sanitizeInvitationForExport(data: Record<string, unknown>): Record<string, unknown> {
  const { _activeSetupToken: _t, legacyToken: _l, activeSession: _s, setupTokenHash: _h, ...safe } = data;
  return safe;
}

/**
 * Elimina en cascada una invitación y todos sus datos asociados:
 * RSVPs, imágenes de galería, tokens de setup, y el documento principal.
 *
 * @param {string} token - Token/ID de la invitación.
 */
async function cascadeDelete(token: string) {  const BATCH_SIZE = 500;
  const refsToDelete = [];

  // RSVPs
  const rsvpSnap = await getDocs(rsvpByInviteRef(token));
  for (const d of rsvpSnap.docs) refsToDelete.push(d.ref);

  // Gallery images
  const gallerySnap = await getDocs(collection(db, "invitations", token, "gallery"));
  for (const d of gallerySnap.docs) refsToDelete.push(d.ref);

  // Audio chunks
  const audioSnap = await getDocs(collection(db, "invitations", token, "audio"));
  for (const d of audioSnap.docs) refsToDelete.push(d.ref);

  // Config images
  const configImgSnap = await getDocs(collection(db, "invitations", token, "configImages"));
  for (const d of configImgSnap.docs) refsToDelete.push(d.ref);

  // Registros de tokens de setup (hash → inviteToken): sin esto quedaban
  // hashes huérfanos apuntando a una invitación inexistente.
  const setupTokenSnap = await getDocs(query(collection(db, "setupTokens"), where("inviteToken", "==", token)));
  for (const d of setupTokenSnap.docs) refsToDelete.push(d.ref);

  // Contador RSVP
  refsToDelete.push(doc(db, "rsvpResponses", token));

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
