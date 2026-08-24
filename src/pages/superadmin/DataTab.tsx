import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, doc, collection, writeBatch, getDoc } from "firebase/firestore";
import { db, INVITATIONS_COLLECTION_REF, RSVP_RESPONSES_GROUP, rsvpByInviteRef } from "../../lib/firebase";
import { useToast } from "../../hooks/useToast";
import { downloadJson } from "../../lib/file-utils";
import { escHtml } from "../../lib/utils";
import { logAudit } from "../../lib/audit";
import { useColumnSort, type SortableColumn } from "../../lib/useColumnSort";
import { SortableTh } from "../../components/SortableTh";
import InvitationDetailModal from "./InvitationDetailModal";
import { useConfirm } from "../../contexts/ConfirmContext";

interface InvitationData {
  id: string;
  firstName: string;
  secondName: string;
  adminUsername: string;
  rsvpCount: number;
  tokenCount: number;
  weddingDate: string;
  hasSession: boolean;
  visits: number;
  lastActivity: string;
  createdAt: string;
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
  // Confirmaciones/prompts accesibles (Modal global con provider en la raíz).
  const { confirm, prompt } = useConfirm();

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
  /** Filtro de actividad: "hoy", "semana", "sesion" o "todas". */
  const [activityFilter, setActivityFilter] = useState("todas");
  /** Invitación abierta en el modal de detalle. */
  const [detailToken, setDetailToken] = useState<string | null>(null);
  /** Búsqueda global de PII (invitados por nombre en todas las invitaciones). */
  const [piiQuery, setPiiQuery] = useState("");
  const [piiResults, setPiiResults] = useState<Array<{ token: string; name: string; attendance: string }>>([]);
  /** Tema a aplicar en bloque a las invitaciones seleccionadas. */
  const [bulkTheme, setBulkTheme] = useState("golden");
  const [bulkingTheme, setBulkingTheme] = useState(false);

  const searchPii = useCallback(async () => {
    const q = piiQuery.trim();
    if (q.length < 3) {
      addToast("info", t("superadmin.data.piiMinChars"));
      return;
    }
    try {
      const { collectionGroup, query: qry, where } = await import("firebase/firestore");
      // Búsqueda PII ampliada: nombre, teléfono y email (derechos GDPR).
      const fields = ["guestName", "phone", "email"];
      const seen = new Set<string>();
      const results: Array<{ token: string; name: string; attendance: string }> = [];
      for (const field of fields) {
        const snap = await getDocs(
          qry(collectionGroup(db, "responses"), where(field, ">=", q), where(field, "<=", q + "\uf8ff")),
        );
        for (const d of snap.docs) {
          const id = d.id;
          if (seen.has(id)) continue;
          seen.add(id);
          results.push({
            token: String(d.data().inviteToken || ""),
            name: String(d.data().guestName || ""),
            attendance: String(d.data().attendance || ""),
          });
        }
      }
      setPiiResults(results);
      if (results.length === 0) addToast("info", t("superadmin.data.piiNone"));
    } catch {
      addToast("error", t("errors.dataLoadFailed"));
    }
  }, [piiQuery, addToast, t]);

  const applyBulkTheme = useCallback(async () => {
    if (!selected.size) return;
    if (!(await confirm({ title: t("superadmin.data.bulkThemeTitle"), message: t("superadmin.data.bulkThemeConfirm", { count: selected.size }) })))
      return;
    setBulkingTheme(true);
    try {
      const { writeBatch: wb } = await import("firebase/firestore");
      const batch = wb(db);
      for (const token of selected) batch.update(doc(db, "invitations", token), { theme: bulkTheme });
      await batch.commit();
      addToast("success", t("superadmin.data.bulkThemeDone", { count: selected.size }));
    } catch {
      addToast("error", t("errors.generic"));
    } finally {
      setBulkingTheme(false);
    }
  }, [selected, bulkTheme, addToast, t, confirm]);

  /** Invitaciones filtradas por actividad (confirmaciones hoy/semana, sesión activa). */
  const filtered = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 86400000;
    return invitations.filter((inv) => {
      if (activityFilter === "sesion") return inv.hasSession;
      if (activityFilter === "hoy") {
        const a = inv.lastActivity ? Date.parse(inv.lastActivity) : 0;
        return a >= todayStart.getTime();
      }
      if (activityFilter === "semana") {
        const a = inv.lastActivity ? Date.parse(inv.lastActivity) : 0;
        return a >= weekAgo;
      }
      return true;
    });
  }, [invitations, activityFilter]);

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
          const sessionAt = data.activeSession as { seconds?: number } | null | undefined;
          const lastActivity = sessionAt && typeof sessionAt === "object" && "seconds" in sessionAt
            ? new Date(Number(sessionAt.seconds) * 1000).toISOString()
            : String(data.createdAt || "");
          return {
            id: token,
            firstName: String(data.firstName || ""),
            secondName: String(data.secondName || ""),
            adminUsername: String(data.adminUsername || ""),
            rsvpCount: rsvpCounts[token] || 0,
            tokenCount: 0,
            weddingDate:
              data.weddingDay && data.weddingMonth && data.weddingYear
                ? `${String(data.weddingDay)}/${String(data.weddingMonth)}/${String(data.weddingYear)}`
                : "",
            hasSession: !!data.activeSession,
            visits: Number(data._visits) || 0,
            lastActivity,
            createdAt: String(data.createdAt || ""),
          };
        });
        list.sort((a, b) => (b.weddingDate || "").localeCompare(a.weddingDate || ""));
        setInvitations(list);
      } catch {
        if (!cancelled) addToast("error", t("errors.dataLoadFailed"));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast, t]);

  /** IDs de invitaciones que no tienen datos (sin nombres configurados). */
  const emptyIds = useMemo(
    () =>
      new Set<string>(
        invitations.filter((i) => !i.firstName && !i.secondName && !i.rsvpCount).map((i: InvitationData) => i.id),
      ),
    [invitations],
  );

  // ── Selección ─────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
          invitation: { id: token, ...(invDoc.exists() ? sanitizeInvitationForExport(invDoc.data()) : {}) },
          rsvps: rsvpSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
            id: d.id,
            ...d.data(),
          })),
          gallery: gallerySnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
            id: d.id,
            ...d.data(),
          })),
          audio: audioSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
            id: d.id,
            ...d.data(),
          })),
        });
      }
      downloadJson(`wedingo_export_${new Date().toISOString().slice(0, 10)}.json`, result);
      addToast("success", t("superadmin.data.exportedSelected", { count: selected.size }));
    } catch {
      addToast("error", t("superadmin.data.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [selected, addToast, t]);

  /** Exporta las invitaciones creadas en un rango de fechas (YYYY-MM-DD). */
  const exportRange = useCallback(async () => {
    const from = await prompt({ title: t("superadmin.data.rangeTitle"), message: t("superadmin.data.rangeFromPrompt"), inputLabel: t("superadmin.data.rangeFromPrompt") });
    if (!from) return;
    const to = await prompt({ title: t("superadmin.data.rangeTitle"), message: t("superadmin.data.rangeToPrompt"), inputLabel: t("superadmin.data.rangeToPrompt") });
    if (!to) return;
    const fromT = new Date(from).getTime();
    const toT = new Date(to).getTime();
    if (Number.isNaN(fromT) || Number.isNaN(toT)) {
      addToast("error", t("superadmin.data.rangeInvalid"));
      return;
    }
    const tokens = invitations
      .filter((i) => {
        const c = new Date(i.createdAt).getTime();
        return !Number.isNaN(c) && c >= fromT && c <= toT + 86400000;
      })
      .map((i) => i.id);
    if (tokens.length === 0) {
      addToast("info", t("superadmin.data.rangeEmpty"));
      return;
    }
    setBusy(true);
    try {
      const result = [];
      for (const token of tokens) {
        const [invDoc, rsvpSnap, gallerySnap, audioSnap] = await Promise.all([
          getDoc(doc(db, "invitations", token)),
          getDocs(rsvpByInviteRef(token)),
          getDocs(collection(db, "invitations", token, "gallery")),
          getDocs(collection(db, "invitations", token, "audio")),
        ]);
        result.push({
          invitation: { id: token, ...(invDoc.exists() ? sanitizeInvitationForExport(invDoc.data()) : {}) },
          rsvps: rsvpSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
          gallery: gallerySnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
          audio: audioSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })),
        });
      }
      downloadJson(`wedingo_export_rango_${from}_${to}.json`, result);
      addToast("success", t("superadmin.data.exportedSelected", { count: tokens.length }));
      void logAudit("export_range", `from=${from} to=${to} count=${tokens.length}`);
    } catch {
      addToast("error", t("superadmin.data.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [invitations, addToast, t, prompt]);

  /** F5-1 (F12): abre una ventana imprimible con el resumen de confirmaciones
   *  de una invitación (para imprimir/guardar en PDF). */
  const printRsvps = useCallback(
    async (token: string) => {
      try {
        const rsvpSnap = await getDocs(rsvpByInviteRef(token));
        const rows = rsvpSnap.docs.map((d) => d.data());
        // Sin respuestas no se abre una ventana de impresión vacía.
        if (rows.length === 0) {
          addToast("info", t("superadmin.data.noRsvp", { token }));
          return;
        }
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${token} — RSVP</title><style>
          body{font-family:system-ui,sans-serif;padding:2rem;color:#222}
          h1{font-size:1.3rem}h2{font-size:1rem;margin-top:1.5rem}
          table{border-collapse:collapse;width:100%;font-size:0.85rem}
          th,td{border:1px solid #ccc;padding:0.4rem 0.5rem;text-align:left}
          th{background:#f4f4f4}</style></head><body>
          {/* Cabeceras del informe traducidas; asistencia con las mismas
              etiquetas que el Excel del admin para consistencia. */}
          <h1>${t("superadmin.data.exportTitle", { token })}</h1>
          <h2>${t("superadmin.data.exportCount", { count: rows.length })}</h2>
          <table><thead><tr><th>${t("attendance.tableName")}</th><th>${t("attendance.tableAttendance")}</th><th>${t("attendance.tableAccompanies")}</th></tr></thead><tbody>
          ${rows
            .map(
              (r) =>
                `<tr><td>${escHtml(r.guestName)}</td><td>${escHtml(r.attendance === "yes" ? t("attendance.attendingValue") : r.attendance === "no" ? t("attendance.notAttendingValue") : escHtml(r.attendance))}</td><td>${Number(r.companionCount) || 0}</td></tr>`,
            )
            .join("")}
          </tbody></table></body></html>`;
        const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        const win = window.open(url, "_blank");
        if (win) win.addEventListener("load", () => win.print());
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch {
        addToast("error", t("superadmin.data.exportFailed"));
      }
    },
    [addToast, t],
  );

  /** Exporta las confirmaciones de una invitación en Excel (hoja de cálculo). */
  const exportRsvpExcel = useCallback(
    async (token: string) => {
      try {
        const rsvpSnap = await getDocs(rsvpByInviteRef(token));
        // Sin confirmaciones no se genera un fichero vacío.
        if (rsvpSnap.docs.length === 0) {
          addToast("info", t("superadmin.data.noRsvp", { token }));
          return;
        }
        const { exportToXlsx } = await import("../../lib/excel-utils");
        const { buildRsvpSheet } = await import("../../lib/excel-builders");
        const sheet = buildRsvpSheet(token, rsvpSnap.docs.map((d) => d.data() as Record<string, unknown>));
        exportToXlsx(`${token}_rsvp`, [sheet]);
        addToast("success", t("superadmin.data.exportedOne", { token }));
      } catch {
        addToast("error", t("superadmin.data.exportFailed"));
      }
    },
    [addToast, t],
  );

  /** Resumen de menús (cuántos pidieron carne/pescado/vegano) de una invitación. */
  const menuSummary = useCallback(async (token: string) => {
    const rsvpSnap = await getDocs(rsvpByInviteRef(token));
    const counts: Record<string, number> = {};
    for (const d of rsvpSnap.docs) {
      const m = String(d.data().mealChoice || "");
      if (m) counts[m] = (counts[m] || 0) + 1;
    }
    return counts;
  }, []);

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
      gallery: gallerySnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
        id: d.id,
        ...d.data(),
      })),
      audio: audioSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
        id: d.id,
        ...d.data(),
      })),
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
      // Sin invitaciones registradas no se exporta un backup vacío.
      if (invSnap.docs.length === 0) {
        addToast("info", t("superadmin.data.noInvitations"));
        setBusy(false);
        return;
      }
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
        invitations: invSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
          id: d.id,
          ...sanitizeInvitationForExport(d.data()),
        })),
        rsvps: rsvpSnap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
          id: d.id,
          ...d.data(),
        })),
        galleryByToken: mediaByToken,
      };
      downloadJson(`wedingo_full_export_${new Date().toISOString().slice(0, 10)}.json`, data);
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

  // Acciones genéricas sobre la selección (fuera de la tabla). Imprimir,
  // Excel y resumen de menús recorren las invitaciones seleccionadas.
  const handlePrintSelected = useCallback(async () => {
    for (const token of selected) await printRsvps(token);
  }, [selected, printRsvps]);

  const handleExcelSelected = useCallback(async () => {
    for (const token of selected) await exportRsvpExcel(token);
  }, [selected, exportRsvpExcel]);

  const handleMenusSelected = useCallback(async () => {
    const parts: string[] = [];
    for (const token of selected) {
      const s = await menuSummary(token);
      parts.push(`${token}: ${Object.entries(s).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
    }
    addToast("info", parts.join("  //  ") || t("superadmin.data.noMenuData"));
  }, [selected, menuSummary, addToast, t]);

  // El detalle y el enlace al panel del admin solo tienen sentido con UNA
  // invitación seleccionada.
  const singleSelected = selected.size === 1 ? [...selected][0] : "";

  /** Aplica una fecha de expiración manual a las invitaciones seleccionadas. */
  const handleBulkExpiry = useCallback(async () => {
    if (!selected.size) return;
    const dateStr = await prompt({
      title: t("superadmin.data.bulkExpiryTitle"),
      message: t("superadmin.data.bulkExpiryPrompt"),
      inputLabel: t("superadmin.data.bulkExpiryPrompt"),
      placeholder: "2027-12-31",
    });
    if (!dateStr) return;
    setBusy(true);
    try {
      const batch = writeBatch(db);
      for (const token of selected) batch.update(doc(db, "invitations", token), { manualExpiry: dateStr });
      await batch.commit();
      addToast("success", t("superadmin.data.bulkExpiryDone", { count: selected.size }));
      void logAudit("bulk_expiry", `count=${selected.size}`);
    } catch {
      addToast("error", t("superadmin.data.bulkExpiryError"));
    } finally {
      setBusy(false);
    }
  }, [selected, addToast, t, prompt]);

  /** Marca el sello de verificación en las invitaciones seleccionadas. */
  const handleBulkSeal = useCallback(async () => {
    if (!selected.size) return;
    if (!(await confirm({ title: t("superadmin.data.bulkSealTitle"), message: t("superadmin.data.bulkSealConfirm", { count: selected.size }) })))
      return;
    setBusy(true);
    try {
      const batch = writeBatch(db);
      for (const token of selected) batch.update(doc(db, "invitations", token), { verified: "true" });
      await batch.commit();
      addToast("success", t("superadmin.data.bulkSealDone", { count: selected.size }));
      void logAudit("bulk_seal", `count=${selected.size}`);
    } catch {
      addToast("error", t("superadmin.data.bulkSealError"));
    } finally {
      setBusy(false);
    }
  }, [selected, addToast, t, confirm]);

  /** Convierte "dd/mm/yyyy" a una fecha comparable, o null si no es válida. */
  const parseDDMMYYYY = (value: string): Date | null => {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  /** Purga (GDPR) invitaciones con boda anterior a N meses: borra en cascada. */
  const handlePurgeOld = useCallback(async () => {
    const monthsStr = await prompt({
      title: t("superadmin.data.purgeTitle"),
      message: t("superadmin.data.purgePrompt"),
      inputLabel: t("superadmin.data.purgePrompt"),
      placeholder: "12",
      initial: "12",
    });
    const months = Number(monthsStr);
    if (!Number.isFinite(months) || months < 1) return;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const targets = invitations.filter((i) => {
      const d = parseDDMMYYYY(i.weddingDate || "");
      return d !== null && d.getTime() < cutoff.getTime();
    });
    if (targets.length === 0) {
      addToast("info", t("superadmin.data.purgeEmpty"));
      return;
    }
    if (!(await confirm({ title: t("superadmin.data.purgeTitle"), message: t("superadmin.data.purgeConfirm", { count: targets.length }), danger: true })))
      return;
    setBusy(true);
    try {
      for (const inv of targets) await cascadeDelete(inv.id);
      setInvitations((prev) => prev.filter((i) => !targets.some((x) => x.id === i.id)));
      setSelected(new Set());
      setConfirmText("");
      addToast("success", t("superadmin.data.purgeDone", { count: targets.length }));
      void logAudit("purge_old", `count=${targets.length}`);
    } catch {
      addToast("error", t("superadmin.data.purgeError"));
    } finally {
      setBusy(false);
    }
  }, [invitations, addToast, t, confirm, prompt]);

  /** Elimina TODAS las invitaciones y datos del sistema. */
  const deleteAll = useCallback(async () => {
    if (confirmText !== CONFIRM_WORD) {
      addToast("error", t("superadmin.data.confirmRequired", { word: CONFIRM_WORD }));
      return;
    }
    if (!(await confirm({ title: t("superadmin.data.deleteAllTitle"), message: t("superadmin.data.deleteAllConfirm"), danger: true, requireText: CONFIRM_WORD })))
      return;
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
  }, [confirmText, addToast, t, confirm]);

  // ── Render ────────────────────────────────────────────

  // Ordenación por columnas de la tabla de invitaciones (checkbox y acciones
  // no). Se calcula SIEMPRE (antes del early return de loading) para no violar
  // las reglas de los hooks.
  const sortColumns = useMemo<SortableColumn<InvitationData>[]>(
    () => [
      { key: "token", type: "string", getValue: (r: InvitationData) => r.id },
      {
        key: "names",
        type: "string",
        getValue: (r: InvitationData) => `${r.firstName} ${r.secondName} ${r.adminUsername}`,
      },
      {
        key: "date",
        type: "date",
        // "dd/mm/yyyy" → timestamp comparable cronológicamente.
        getValue: (r: InvitationData) => {
          const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(r.weddingDate || "");
          return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() : r.weddingDate;
        },
      },
      { key: "rsvps", type: "number", getValue: (r: InvitationData) => r.rsvpCount },
      { key: "visits", type: "number", getValue: (r: InvitationData) => r.visits },
      { key: "session", type: "boolean", getValue: (r: InvitationData) => r.hasSession },
      { key: "activity", type: "date", getValue: (r: InvitationData) => r.lastActivity },
    ],
    [],
  );
  const { sorted: sortedInvitations, toggleSort, getIndicator } = useColumnSort(invitations, sortColumns);

  if (loading) {
    return (
      <div className="data-tab-loading">
        <div className="page-loading" style={{ minHeight: "6rem" }} />
        <p>{t("common.loading")}</p>
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
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={selectAll}
          disabled={busy}
        >
          {t("superadmin.data.selectAll")}
        </button>
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={deselectAll}
          disabled={busy}
        >
          {t("superadmin.data.deselectAll")}
        </button>

        <span style={{ flex: 1, minWidth: "0.5rem" }} />

        <button type="button" className="setup-button setup-button--compact" onClick={exportAll} disabled={busy}>
          {t("superadmin.data.exportAllBtn")} ({totalCount})
        </button>
        <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void exportRange()} disabled={busy}>
          {t("superadmin.data.rangeBtn")}
        </button>

        {selectedCount > 0 && (
          <>
            {singleSelected ? (
              <button
                type="button"
                className="setup-button setup-button--ghost setup-button--compact"
                onClick={() => setDetailToken(singleSelected)}
                disabled={busy}
              >
                {t("superadmin.data.detailBtn")}
              </button>
            ) : null}
            {singleSelected ? (
              <a
                className="setup-button setup-button--ghost setup-button--compact"
                href={`/${singleSelected}/admin`}
                target="_blank"
                rel="noreferrer"
              >
                {t("superadmin.data.adminLink")}
              </a>
            ) : null}
            <button
              type="button"
              className="setup-button setup-button--compact"
              onClick={exportSelected}
              disabled={busy}
            >
              {t("superadmin.data.exportSelectedBtn", { count: selectedCount })}
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={() => void handlePrintSelected()}
              disabled={busy}
            >
              {t("superadmin.data.printBtn")} ({selectedCount})
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={() => void handleExcelSelected()}
              disabled={busy}
            >
              {t("superadmin.data.excelBtn")} ({selectedCount})
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={() => void handleMenusSelected()}
              disabled={busy}
            >
              {t("superadmin.data.menusBtn")} ({selectedCount})
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={() => void handleBulkExpiry()}
              disabled={busy}
            >
              {t("superadmin.data.bulkExpiryBtn")} ({selectedCount})
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={() => void handleBulkSeal()}
              disabled={busy}
            >
              {t("superadmin.data.bulkSealBtn")} ({selectedCount})
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
          aria-label={t("superadmin.data.confirmInputLabel")}
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
        <button
          type="button"
          className="setup-button setup-button--danger setup-button--ghost"
          onClick={() => void handlePurgeOld()}
          disabled={busy}
        >
          {t("superadmin.data.purgeBtn")}
        </button>
      </div>

      {/* ── Filtro de actividad ── */}
      <div className="admin-filters" style={{ marginBottom: "0.75rem" }}>
        <select
          className="setup-input"
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          aria-label={t("superadmin.data.activityFilter")}
          style={{ maxWidth: "16rem" }}
        >
          <option value="todas">{t("superadmin.data.activityAll")}</option>
          <option value="hoy">{t("superadmin.data.activityToday")}</option>
          <option value="semana">{t("superadmin.data.activityWeek")}</option>
          <option value="sesion">{t("superadmin.data.activitySession")}</option>
        </select>
        <span className="setup-help" style={{ margin: 0 }}>
          {t("superadmin.data.filteredCount", { count: filtered.length, total: totalCount })}
        </span>
      </div>

      {/* ── Búsqueda global de PII (derechos GDPR) ── */}
      <div className="admin-filters" style={{ marginBottom: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          className="setup-input"
          style={{ flex: 1, minWidth: "12rem" }}
          value={piiQuery}
          onChange={(e) => setPiiQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void searchPii(); }}
          placeholder={t("superadmin.data.piiPlaceholder")}
          aria-label={t("superadmin.data.piiPlaceholder")}
        />
        <button className="setup-button setup-button--compact" type="button" onClick={() => void searchPii()}>
          {t("superadmin.data.piiSearch")}
        </button>
        {piiResults.length > 0 ? (
          <span className="setup-help" style={{ margin: 0 }}>
            {t("superadmin.data.piiCount", { count: piiResults.length })}
          </span>
        ) : null}
      </div>
      {piiResults.length > 0 ? (
        <div style={{ marginBottom: "0.75rem", maxHeight: "8rem", overflowY: "auto", border: "1px solid var(--setup-border)", borderRadius: "0.5rem" }}>
          {piiResults.map((r, i) => (
            <div key={i} style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem", borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)" }}>
              {r.name} — {r.attendance} · <code>{r.token}</code>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Tema en bloque para la selección ── */}
      <div className="admin-flex" style={{ marginBottom: "0.75rem", gap: "0.5rem", flexWrap: "wrap" }}>
        <select className="setup-input" value={bulkTheme} onChange={(e) => setBulkTheme(e.target.value)} aria-label={t("superadmin.data.bulkTheme")} style={{ maxWidth: "12rem" }}>
          {["golden", "forest", "rose", "linen-soft", "blush-pearl", "lavender-mist", "champagne-bubble", "amber-night", "onyx-gold", "midnight-royal", "burgundy-velvet", "sapphire-night", "emerald-grove", "plum-twilight", "rainbow", "trans", "nonbinary", "lesbian", "bi", "pan", "ace"].map((th) => (
            <option key={th} value={th}>{th}</option>
          ))}
        </select>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => void applyBulkTheme()} disabled={!selected.size || bulkingTheme}>
          {t("superadmin.data.bulkTheme", { count: selected.size })}
        </button>
      </div>

      {/* ── Tabla de invitaciones ── */}
      <div className="data-tab-table-wrap">
        <table className="data-tab-table">
          {/* caption visible solo para lectores de pantalla (WCAG 1.3.1). */}
          <caption className="sr-only">{t("superadmin.data.tableCaption")}</caption>
          <thead>
            <tr className="data-tab-sticky-header">
              <th scope="col" className="data-tab-th">
                <input
                  type="checkbox"
                  checked={selectedCount === totalCount && totalCount > 0}
                  onChange={() => (selectedCount === totalCount ? deselectAll() : selectAll())}
                  disabled={busy}
                  aria-label={t("superadmin.data.selectAll")}
                />
              </th>
              <SortableTh columnKey="token" order={getIndicator("token")} onSort={toggleSort} className="data-tab-th">
                {t("superadmin.data.colToken")}
              </SortableTh>
              <SortableTh columnKey="names" order={getIndicator("names")} onSort={toggleSort} className="data-tab-th">
                {t("superadmin.data.colNames")}
              </SortableTh>
              <SortableTh columnKey="date" order={getIndicator("date")} onSort={toggleSort} className="data-tab-th">
                {t("superadmin.data.colDate")}
              </SortableTh>
              <SortableTh columnKey="rsvps" order={getIndicator("rsvps")} onSort={toggleSort} className="data-tab-th">
                {t("superadmin.data.colRsvps")}
              </SortableTh>
              <SortableTh columnKey="visits" order={getIndicator("visits")} onSort={toggleSort} className="data-tab-th">
                {t("superadmin.data.colVisits")}
              </SortableTh>
              <SortableTh columnKey="session" order={getIndicator("session")} onSort={toggleSort} className="data-tab-th">
                {t("superadmin.data.colSession")}
              </SortableTh>
              <SortableTh columnKey="activity" order={getIndicator("activity")} onSort={toggleSort} className="data-tab-th">
                {t("superadmin.data.colActivity")}
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {sortedInvitations.map((inv) => (
              <tr key={inv.id} className="data-tab-tr" style={{ opacity: emptyIds.has(inv.id) ? 0.7 : 1 }}>
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
                  {/* Token copiable con teclado: role=button + Enter/Espacio
                      (WCAG 2.1.1), además del clic. */}
                  <code
                    className="data-tab-code-copy"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigator.clipboard?.writeText(inv.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigator.clipboard?.writeText(inv.id);
                      }
                    }}
                    aria-label={`${t("superadmin.data.copyToken")}: ${inv.id}`}
                  >
                    {inv.id}
                  </code>
                </td>
                <td className="data-tab-td">
                  {inv.firstName ? (
                    `${inv.firstName} & ${inv.secondName}`
                  ) : (
                    <span className="data-tab-empty-name">{t("superadmin.data.emptyInvitation")}</span>
                  )}
                  {inv.adminUsername ? <span className="data-tab-admin-user">@{inv.adminUsername}</span> : null}
                </td>
                <td className="data-tab-td" style={{ whiteSpace: "nowrap" }}>
                  {inv.weddingDate || "—"}
                </td>
                <td className="data-tab-td" style={{ textAlign: "center" }}>
                  {inv.rsvpCount}
                </td>
                <td className="data-tab-td" style={{ textAlign: "center" }}>
                  {inv.visits}
                </td>
                <td className="data-tab-td" style={{ textAlign: "center" }}>
                  {inv.hasSession ? "🟢" : "—"}
                </td>
                <td className="data-tab-td" style={{ fontSize: "0.7rem", color: "var(--setup-muted)" }}>
                  {inv.lastActivity ? new Date(inv.lastActivity).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!invitations.length && <p className="data-tab-empty-msg">{t("superadmin.data.noInvitations")}</p>}
      </div>

      {/* Modal de detalle de invitación (moderación social, RSVP, configLog…). */}
      {detailToken ? <InvitationDetailModal token={detailToken} onClose={() => setDetailToken(null)} /> : null}
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
async function cascadeDelete(token: string) {
  // Borrado en cascada completo y centralizado: RSVPs, todas las
  // subcolecciones (incluidas las sociales con PII), mesas con nombres de
  // invitados, tokens de setup, contador RSVP y el documento de invitación,
  // troceado en lotes de 500. Usa el helper compartido para no duplicar la
  // lógica en cada panel del superadmin.
  const { deleteInvitationCascade } = await import("../../lib/invitation-subcollections");
  await deleteInvitationCascade(token, db);
}
