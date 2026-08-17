import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Pagination from "../../components/Pagination";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import { useColumnSort, type SortableColumn } from "../../lib/useColumnSort";
import { SortableTh } from "../../components/SortableTh";
import { withWriteRetry } from "../../lib/async-utils";

interface RsvpEntry {
  id: string;
  rsvpType?: "main" | "companion";
  guestName: string;
  attendance: string;
  companions: number;
  dietaryInfo: string;
  attendees?: { name: string; menu: string; allergies: string[] }[];
  mealChoice?: string;
  guestNames?: string;
  submittedAt: string;
  mainGuestName?: string;
  companionDocIds?: string[];
  birthDate?: string;
  parentalConsent?: boolean;
  healthConsent?: boolean;
  transportChoice?: string;
  phone?: string;
  email?: string;
  contactConsent?: boolean;
  transportMode?: string;
  transportTime?: string;
  companionTransportChoices?: string[];
  companionTransportModes?: string[];
  mainGuestDocId?: string;
}

export interface AttendanceTabProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  attendanceFilter: string;
  setAttendanceFilter: (filter: string) => void;
  filteredEntries: RsvpEntry[];
  exportPdf: () => void;
  rsvpEntries: RsvpEntry[];
  handleClearRsvpEntries: () => void;
  handleDeleteRsvpEntries: (ids: string[]) => void;
  formatDate: (date: string) => string;
  transportDepartures?: string;
  /** Token de la invitación (para añadir/editar respuestas manuales,
   *  p. ej. invitaciones físicas a personas sin dispositivo). */
  inviteToken?: string;
  /** Se invoca tras añadir/editar manualmente para recargar la lista. */
  onDataChanged?: () => void;
}

const PAGE_SIZES = [10, 25, 50, 100];

function parseDietaryItems(dietaryInfo: string): string[] {
  if (!dietaryInfo) return [];
  return dietaryInfo
    .split(" | ")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("Menú:"));
}

function getDietaryItems(dietaryInfo: string): string[] {
  return parseDietaryItems(dietaryInfo);
}

function formatMenuLabel(mealChoice: string, t: (key: string) => string): string | null {
  if (!mealChoice) return null;
  return t("rsvp.menu" + mealChoice.charAt(0).toUpperCase() + mealChoice.slice(1));
}

const AttendanceTab = memo(function AttendanceTab(props: AttendanceTabProps) {
  const {
    searchQuery,
    setSearchQuery,
    attendanceFilter,
    setAttendanceFilter,
    filteredEntries,
    exportPdf,
    rsvpEntries,
    handleClearRsvpEntries,
    handleDeleteRsvpEntries,
    formatDate,
    transportDepartures,
    inviteToken,
    onDataChanged,
  } = props;
  const { t, i18n } = useTranslation();
  const { addToast } = useToast();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Añadir/editar respuesta manualmente (invitaciones físicas) ──
  const [editing, setEditing] = useState<{ id?: string; name: string; attendance: "yes" | "no"; notes: string } | null>(null);
  const [savingManual, setSavingManual] = useState(false);

  const openEdit = useCallback((entry: RsvpEntry) => {
    setEditing({
      id: entry.id,
      name: entry.guestName || "",
      attendance: entry.attendance === "yes" ? "yes" : "no",
      notes: entry.dietaryInfo || "",
    });
  }, []);

  const openAdd = useCallback(() => {
    setEditing({ name: "", attendance: "yes", notes: "" });
  }, []);

  /** Guarda la respuesta manual: crea si no tiene id, actualiza si lo tiene.
   *  CASOS CATASTRÓFICOS: sin token o sin nombre → no hace nada; fallo de red
   *  → toast de error sin corromper el estado. */
  const saveManual = useCallback(async () => {
    if (!editing || !inviteToken) return;
    const name = editing.name.trim();
    if (!name) {
      addToast("error", t("attendance.manualNameRequired"));
      return;
    }
    setSavingManual(true);
    try {
      // Esquema que cumple la regla create de rsvpResponses/.../responses
      // (privacyConsent + el resto). En un batch: crear/actualizar el doc y
      // ajustar el contador del grupo si es una creación.
      const now = serverTimestamp();
      const payload: Record<string, unknown> = {
        rsvpType: "main",
        guestName: name.slice(0, 120),
        attendance: editing.attendance,
        dietaryInfo: editing.notes.slice(0, 4000),
        inviteToken,
        submittedAt: now,
        privacyConsent: true,
        privacyConsentAt: now,
      };
      const batch = writeBatch(db);
      if (editing.id) {
        batch.update(doc(db, "rsvpResponses", inviteToken, "responses", editing.id), payload);
      } else {
        // Id determinista a partir del nombre (reintento idempotente y sin
        // caracteres de ruta ilegales). Buffer no está disponible en el
        // navegador SPA, así que se genera con codificación base64url local.
        const norm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").slice(0, 30);
        const id = `main_manual_${norm || "invitado"}_${Math.random().toString(36).slice(2, 6)}`;
        batch.set(doc(db, "rsvpResponses", inviteToken, "responses", id), payload);
        // El contador del grupo debe existir e incrementarse para que la regla
        // create (exists + count < 500) valide.
        await withWriteRetry(async () => {
          const { getDoc } = await import("firebase/firestore");
          const counterRef = doc(db, "rsvpResponses", inviteToken);
          const snap = await getDoc(counterRef);
          if (!snap.exists()) batch.set(counterRef, { count: 1 });
          else batch.update(counterRef, { count: snap.data()!.count + 1 });
        });
      }
      await withWriteRetry(() => batch.commit());
      addToast("success", t(editing.id ? "attendance.manualUpdated" : "attendance.manualAdded"));
      setEditing(null);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code?: unknown }).code) : "";
      addToast("error", code === "permission-denied" ? t("attendance.manualLimitReached") : t("attendance.manualError"));
    } finally {
      setSavingManual(false);
    }
  }, [editing, inviteToken, onDataChanged, addToast, t]);

  /** Descarga un Excel con todas las respuestas RSVP (filtradas o no). */
  const handleExportExcel = useCallback(async () => {
    // No se exporta si no hay respuestas: se avisa y se evita un fichero vacío.
    if ((filteredEntries || []).length === 0) {
      addToast("info", t("attendance.noResults"));
      return;
    }
    try {
      const { buildRSVPSheet, buildMenuSheet } = await import("../../lib/excel-builders");
      const { exportToXlsx } = await import("../../lib/excel-utils");
      exportToXlsx(`asistencia_${new Date().toISOString().slice(0, 10)}`, [
        buildRSVPSheet(filteredEntries || [], t),
        buildMenuSheet(filteredEntries || [], t),
      ]);
    } catch {
      addToast("error", t("attendance.exportExcelError"));
    }
  }, [filteredEntries, t, addToast]);

  const departures = useMemo(() => {
    try {
      const parsed = JSON.parse(transportDepartures || "");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((d) => d && typeof d === "object");
    } catch {
      return [];
    }
  }, [transportDepartures]);

  const resolveTransportLabel = useCallback(
    (mode: string, choice: string, storedTime: string) => {
      if (!mode && !choice && !storedTime) return "—";
      if (!mode || mode === "own") return t("attendance.transportOwnCar");
      const typeLabel = t(mode === "taxi" ? "transport.typeTaxi" : "transport.typeBus");
      if (storedTime) return `${typeLabel} (${storedTime})`;
      const idx = Number.parseInt(choice, 10);
      const dep = departures[idx] as { time?: string } | undefined;
      if (dep && dep.time) return `${typeLabel} (${dep.time})`;
      return typeLabel;
    },
    [departures, t],
  );

  const formatBirthDate = useCallback(
    (iso: string) => {
      if (!iso) return "—";
      try {
        return new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(i18n.language || "es");
      } catch {
        return iso;
      }
    },
    [i18n.language],
  );

  const filterEntries = filteredEntries || [];

  // Ordenación por columnas de la tabla de asistencias (checkbox no). Cada
  // columna extrae su valor comparable (texto, número, fecha o booleano).
  const sortColumns = useMemo<SortableColumn<RsvpEntry>[]>(
    () => [
      { key: "name", type: "string", getValue: (e: RsvpEntry) => e.guestName },
      {
        key: "accompanies",
        type: "string",
        getValue: (e: RsvpEntry) => (e.rsvpType === "companion" ? e.mainGuestName || "" : ""),
      },
      { key: "attendance", type: "string", getValue: (e: RsvpEntry) => e.attendance },
      {
        key: "menu",
        type: "string",
        getValue: (e: RsvpEntry) => {
          if (e.attendees?.length) {
            return e.attendees
              .map((a) => (a.menu ? `${a.name}: ${formatMenuLabel(a.menu, t)}` : ""))
              .filter(Boolean)
              .join(", ");
          }
          return formatMenuLabel(e.mealChoice || "", t) || "";
        },
      },
      {
        key: "diet",
        type: "string",
        getValue: (e: RsvpEntry) => {
          if (e.attendees?.length) {
            return e.attendees.filter((a) => a.allergies?.length).map((a) => `${a.name}: ${a.allergies.join(", ")}`).join(", ");
          }
          return e.attendance === "yes" ? getDietaryItems(e.dietaryInfo || "").join(", ") : "";
        },
      },
      {
        key: "transport",
        type: "string",
        getValue: (e: RsvpEntry) =>
          e.attendance === "yes" ? resolveTransportLabel(e.transportMode || "", e.transportChoice || "", e.transportTime || "") : "",
      },
      { key: "birth", type: "date", getValue: (e: RsvpEntry) => e.birthDate || "" },
      {
        key: "consents",
        type: "boolean",
        getValue: (e: RsvpEntry) => Boolean(e.parentalConsent || e.healthConsent),
      },
      {
        key: "contact",
        type: "string",
        getValue: (e: RsvpEntry) => [e.phone, e.email].filter(Boolean).join(" "),
      },
      { key: "submittedAt", type: "date", getValue: (e: RsvpEntry) => e.submittedAt },
    ],
    [t, resolveTransportLabel],
  );
  const { sorted: sortedFilterEntries, toggleSort, getIndicator } = useColumnSort(filterEntries, sortColumns);

  const totalPages = Math.max(1, Math.ceil(sortedFilterEntries.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sortedFilterEntries.slice(safePage * pageSize, (safePage + 1) * pageSize);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, attendanceFilter]);

  const stats = useMemo(() => {
    const entries = rsvpEntries || [];
    const mainEntries = entries.filter((e) => e.rsvpType !== "companion");
    const yes = mainEntries.filter((e: RsvpEntry) => e.attendance === "yes").length;
    const no = mainEntries.filter((e: RsvpEntry) => e.attendance === "no").length;
    const totalCompanions = entries.filter((e: RsvpEntry) => e.rsvpType === "companion").length;
    const withDietary = entries.filter((e: RsvpEntry) => e.attendance === "yes" && e.dietaryInfo?.trim()).length;
    return { yes, no, totalCompanions, withDietary };
  }, [rsvpEntries]);

  const toggleAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((e) => e.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = () => {
    const mainIds = [...selectedIds].filter((id) => {
      const entry = rsvpEntries.find((e) => e.id === id);
      return entry?.rsvpType !== "companion";
    });
    const allToDelete = new Set(selectedIds);
    // Also delete companions linked to selected main entries
    for (const mid of mainIds) {
      const main = rsvpEntries.find((e) => e.id === mid);
      if (main?.companionDocIds) {
        for (const cid of main.companionDocIds) {
          allToDelete.add(cid);
        }
      }
    }
    handleDeleteRsvpEntries([...allToDelete]);
    setSelectedIds(new Set());
  };

  return (
    <>
      <div className="admin-filters">
        <label className="sr-only" htmlFor="adminSearchName">
          {t("attendance.searchLabel")}
        </label>
        <select
          id="adminSearchName"
          className="setup-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: "250px", fontSize: "0.85rem" }}
        >
          <option value="">{t("attendance.all")}</option>
          {(rsvpEntries || [])
            .filter(
              (e: RsvpEntry, i: number, arr: RsvpEntry[]) =>
                arr.findIndex((x: RsvpEntry) => x.guestName === e.guestName) === i,
            )
            .map((e: RsvpEntry) => (
              <option key={e.id} value={e.guestName}>
                {e.guestName}
              </option>
            ))}
        </select>
        {/* Filtro de asistencia: el estado existía pero no había UI para
              cambiarlo (feature muerta). */}
        <label className="sr-only" htmlFor="adminAttendanceFilter">
          {t("attendance.filterLabel")}
        </label>
        <select
          id="adminAttendanceFilter"
          className="setup-input"
          value={attendanceFilter}
          onChange={(e) => setAttendanceFilter(e.target.value)}
          style={{ maxWidth: "180px", fontSize: "0.85rem" }}
        >
          <option value="all">{t("attendance.filterAll")}</option>
          <option value="yes">{t("attendance.filterYes")}</option>
          <option value="no">{t("attendance.filterNo")}</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <span className="setup-help" style={{ margin: 0, fontSize: "0.8rem" }}>
          {t("attendance.statsLine", {
            yes: stats.yes,
            no: stats.no,
            companions: stats.totalCompanions,
            diet: stats.withDietary,
          })}
        </span>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {filterEntries.length > 0 ? (
          <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ fontSize: "0.8rem", minWidth: "800px" }}>
              <caption className="admin-table__caption">{t("attendance.tableTitle")}</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ width: "2rem" }}>
                    <input
                      type="checkbox"
                      onChange={toggleAll}
                      checked={paginated.length > 0 && selectedIds.size === paginated.length}
                      aria-label={t("attendance.selectAll")}
                    />
                  </th>
                  <SortableTh columnKey="name" order={getIndicator("name")} onSort={toggleSort} style={{ minWidth: "100px" }}>
                    {t("attendance.tableName")}
                  </SortableTh>
                  <SortableTh columnKey="accompanies" order={getIndicator("accompanies")} onSort={toggleSort} style={{ minWidth: "120px" }}>
                    {t("attendance.tableAccompanies")}
                  </SortableTh>
                  <SortableTh columnKey="attendance" order={getIndicator("attendance")} onSort={toggleSort} style={{ minWidth: "70px" }}>
                    {t("attendance.tableAttendance")}
                  </SortableTh>
                  <SortableTh columnKey="menu" order={getIndicator("menu")} onSort={toggleSort} style={{ minWidth: "120px" }}>
                    {t("attendance.tableMenu")}
                  </SortableTh>
                  <SortableTh columnKey="diet" order={getIndicator("diet")} onSort={toggleSort} style={{ minWidth: "140px" }}>
                    {t("attendance.tableDiet")}
                  </SortableTh>
                  <SortableTh columnKey="transport" order={getIndicator("transport")} onSort={toggleSort} style={{ minWidth: "120px" }}>
                    {t("attendance.tableTransport")}
                  </SortableTh>
                  <SortableTh columnKey="birth" order={getIndicator("birth")} onSort={toggleSort} style={{ minWidth: "110px" }}>
                    {t("attendance.tableBirth")}
                  </SortableTh>
                  <SortableTh columnKey="consents" order={getIndicator("consents")} onSort={toggleSort} style={{ minWidth: "120px" }}>
                    {t("attendance.tableConsents")}
                  </SortableTh>
                  <SortableTh columnKey="contact" order={getIndicator("contact")} onSort={toggleSort} style={{ minWidth: "120px" }}>
                    {t("attendance.tableContact")}
                  </SortableTh>
                  <SortableTh columnKey="submittedAt" order={getIndicator("submittedAt")} onSort={toggleSort} style={{ minWidth: "120px" }}>
                    {t("attendance.tableDate")}
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {paginated.map((entry: RsvpEntry) => {
                  const isCompanion = entry.rsvpType === "companion";
                  const attending = entry.attendance === "yes";
                  const menuLines = entry.attendees?.length
                    ? entry.attendees
                        .map((a) =>
                          a.menu
                            ? `${a.name}: ${t("rsvp.menu" + a.menu.charAt(0).toUpperCase() + a.menu.slice(1))}`
                            : null,
                        )
                        .filter((x): x is string => x !== null)
                    : formatMenuLabel(entry.mealChoice || "", t)
                      ? [formatMenuLabel(entry.mealChoice || "", t)!]
                      : [];
                  const dietLines = entry.attendees?.length
                    ? entry.attendees
                        .filter((a) => a.allergies?.length)
                        .map((a) => `${a.name}: ${a.allergies.join(", ")}`)
                    : attending
                      ? getDietaryItems(entry.dietaryInfo || "")
                      : [];
                  const crossed = !attending ? { textDecoration: "line-through", opacity: 0.4 } : {};
                  const transportLabel = resolveTransportLabel(
                    entry.transportMode || "",
                    entry.transportChoice || "",
                    entry.transportTime || "",
                  );
                  const consentBadges: string[] = [];
                  if (entry.parentalConsent) consentBadges.push(t("attendance.consentParental"));
                  if (entry.healthConsent) consentBadges.push(t("attendance.consentHealth"));

                  return (
                    <tr key={entry.id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleOne(entry.id)}
                            aria-label={t("attendance.selectEntry", { name: entry.guestName })}
                          />
                          {inviteToken && !isCompanion ? (
                            <button
                              type="button"
                              className="setup-button setup-button--ghost setup-button--compact"
                              style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}
                              onClick={() => openEdit(entry)}
                            >
                              {t("attendance.editManual")}
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="admin-table__name" style={{ fontWeight: isCompanion ? 400 : 600 }}>
                        {entry.guestName}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--setup-muted)" }}>
                        {isCompanion && entry.mainGuestName ? entry.mainGuestName : "—"}
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge--${entry.attendance}`}>
                          {attending ? t("attendance.attendingValue") : t("attendance.notAttendingValue")}
                        </span>
                      </td>
                      <td>
                        <div style={crossed}>
                          {attending ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              {menuLines.length > 0 ? (
                                menuLines.map((line, i) => (
                                  <span key={i} style={{ fontSize: "0.78rem" }}>
                                    {line}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: "0.78rem" }}>—</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.78rem" }}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={crossed}>
                          {attending && dietLines.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              {dietLines.map((line, i) => (
                                <span key={i} style={{ fontSize: "0.78rem" }}>
                                  {line}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.78rem" }}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={crossed}>
                          <span style={{ fontSize: "0.78rem" }}>{attending ? transportLabel : "—"}</span>
                        </div>
                      </td>
                      <td>
                        <div style={crossed}>
                          <span style={{ fontSize: "0.78rem" }}>
                            {entry.birthDate ? formatBirthDate(entry.birthDate) : "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={crossed}>
                          {attending && consentBadges.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              {consentBadges.map((b, i) => (
                                <span key={i} style={{ fontSize: "0.72rem", color: "var(--setup-accent)" }}>
                                  {b}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.78rem" }}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={crossed}>
                          {entry.contactConsent ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                              {entry.phone ? <span style={{ fontSize: "0.75rem" }}>{entry.phone}</span> : null}
                              {entry.email ? <span style={{ fontSize: "0.75rem" }}>{entry.email}</span> : null}
                              {!entry.phone && !entry.email ? (
                                <span style={{ fontSize: "0.75rem", color: "var(--setup-muted)" }}>{t("attendance.contactConsentOnly")}</span>
                              ) : null}
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.78rem" }}>—</span>
                          )}
                        </div>
                      </td>
                      <td className="admin-table__date" style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                        {formatDate(entry.submittedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              total={filterEntries.length}
              pageSizes={PAGE_SIZES}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        ) : searchQuery ? (
          <EmptyState title={t("attendance.noResultsFilter")} description={t("attendance.noResultsFilterHint")} />
        ) : (
          <EmptyState title={t("attendance.noResults")} />
        )}
      </div>

      {(rsvpEntries || []).length > 0 && (
        <div
          className="setup-actions"
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "1rem" }}
        >
          {inviteToken ? (
            <button className="setup-button setup-button--compact" type="button" onClick={openAdd}>
              {t("attendance.addManual")}
            </button>
          ) : null}
          <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={exportPdf}>
            {t("attendance.exportPdf")}
          </button>
          <button
            className="setup-button setup-button--ghost setup-button--compact"
            type="button"
            onClick={() => void handleExportExcel()}
          >
            {t("attendance.exportExcel")}
          </button>
          <button
            className="setup-button setup-button--ghost setup-button--compact"
            type="button"
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0}
            style={{
              background: selectedIds.size > 0 ? "#ef4444" : undefined,
              color: selectedIds.size > 0 ? "#fff" : undefined,
            }}
          >
            {t("attendance.deleteSelected", { count: selectedIds.size })}
          </button>
          <button
            className="setup-button setup-button--ghost setup-button--compact"
            type="button"
            onClick={handleClearRsvpEntries}
          >
            {t("attendance.clearAttendance")}
          </button>
        </div>
      )}

      {/* Modal de añadir/editar respuesta manual (invitaciones físicas). */}
      {editing ? (
        <Modal
          title={editing.id ? t("attendance.manualEditTitle") : t("attendance.manualAddTitle")}
          closeLabel={t("common.close")}
          onClose={() => setEditing(null)}
          style={{ maxWidth: "460px" }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveManual();
            }}
          >
            <label className="setup-label" htmlFor="manualRsvpName">
              {t("attendance.manualNameLabel")}
            </label>
            <input
              id="manualRsvpName"
              className="setup-input"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              maxLength={120}
              placeholder={t("attendance.manualNamePlaceholder")}
              disabled={savingManual}
            />
            <label className="setup-label" htmlFor="manualRsvpAttendance" style={{ marginTop: "0.6rem" }}>
              {t("attendance.manualAttendanceLabel")}
            </label>
            <select
              id="manualRsvpAttendance"
              className="setup-input"
              value={editing.attendance}
              onChange={(e) => setEditing({ ...editing, attendance: e.target.value as "yes" | "no" })}
              disabled={savingManual}
            >
              <option value="yes">{t("attendance.filterYes")}</option>
              <option value="no">{t("attendance.filterNo")}</option>
            </select>
            <label className="setup-label" htmlFor="manualRsvpNotes" style={{ marginTop: "0.6rem" }}>
              {t("attendance.manualNotesLabel")}
            </label>
            <textarea
              id="manualRsvpNotes"
              className="setup-textarea"
              rows={2}
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              maxLength={4000}
              placeholder={t("attendance.manualNotesPlaceholder")}
              disabled={savingManual}
            />
            <div className="setup-actions" style={{ marginTop: "0.8rem" }}>
              <button className="setup-button" type="submit" disabled={savingManual || !editing.name.trim()}>
                {savingManual ? t("common.loading") : editing.id ? t("attendance.manualSave") : t("attendance.manualAdd")}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
});

export default AttendanceTab;
