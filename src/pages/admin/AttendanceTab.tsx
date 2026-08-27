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
import { encrypt } from "../../lib/crypto-utils";
import { parseDietaryInfo } from "../../lib/rsvp-utils";
import { parseTransportDepartures } from "../../lib/transport-utils";
import { departureLabel, type Departure } from "../sections/rsvp/derive";
import { ALLERGIES } from "../sections/rsvp/constants";

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
  // Flag de niño (nuevo modelo): sustituye a la columna de fecha nacimiento.
  isChild?: boolean;
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
  /// Datos de acompañantes (arrays paralelos que guarda el doc principal).
  companionNames?: string[];
  companionMenus?: string[];
  companionAllergies?: string[][];
  companionAllergiesOther?: string[];
  companionIsChildren?: string[];
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
  /** Si la invitación tiene menú (menuEnabled === true) el modal de edición
   *  ofrece la selección de plato (carne/pescado/vegano). */
  menuEnabled?: boolean;
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

/** Icono de lápiz (editar). SVG inline: sin dependencias ni emojis. */
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

/** Icono de papelera (eliminar). SVG inline: sin dependencias ni emojis. */
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
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
    menuEnabled,
  } = props;
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Añadir/editar respuesta manualmente (invitaciones físicas) ──
  // El estado de edición incluye TODOS los datos modificables del invitado
  // (menú, alergias, transporte y acompañantes) para poder corregir cualquier
  // campo, también de respuestas enviadas por los propios invitados.
  interface EditingCompanion {
    /** Id del doc del acompañante si ya existía; si no, se crea al guardar. */
    docId?: string | undefined;
    name: string;
    menu: string;
    allergies: string[];
    other: string;
    isChild: boolean;
  }
  interface EditingState {
    id?: string;
    /** Ids de docs de acompañantes existentes (para borrar los que se quitan). */
    companionDocIds: string[];
    name: string;
    attendance: "yes" | "no";
    notes: string;
    mealChoice: string;
    allergySelection: string[];
    allergyOther: string;
    transportMode: string;
    transportChoice: string;
    companions: EditingCompanion[];
  }
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [savingManual, setSavingManual] = useState(false);

  /** Lista de salidas de transporte (se parsea de la config de la invitación). */
  const departuresList: Departure[] = useMemo(() => {
    try {
      return parseTransportDepartures(transportDepartures || "");
    } catch {
      return [];
    }
  }, [transportDepartures]);

  const openEdit = useCallback((entry: RsvpEntry) => {
    const parsed = parseDietaryInfo(entry.dietaryInfo || "", !!entry.mealChoice);
    // Acompañantes: el hook de RSVP reconstruye los arrays paralelos del main
    // desde los docs de acompañantes, así que aquí se leen tal cual.
    const companions: EditingCompanion[] = (entry.companionNames ?? []).map((name: string, i: number) => {
      const rawAl: unknown = entry.companionAllergies?.[i] ?? "";
      const selection = Array.isArray(rawAl)
        ? rawAl.filter((x): x is string => typeof x === "string")
        : parseDietaryInfo(String(rawAl), false).dietarySelection;
      return {
        docId: entry.companionDocIds?.[i],
        name: name ?? "",
        menu: entry.companionMenus?.[i] ?? "",
        allergies: selection,
        other: entry.companionAllergiesOther?.[i] ?? "",
        isChild: entry.companionIsChildren?.[i] === "yes",
      };
    });
    setEditing({
      id: entry.id,
      companionDocIds: entry.companionDocIds ?? [],
      name: entry.guestName || "",
      attendance: entry.attendance === "yes" ? "yes" : "no",
      notes: entry.dietaryInfo || "",
      mealChoice: entry.mealChoice || "",
      allergySelection: parsed.dietarySelection,
      allergyOther: parsed.dietaryOther || "",
      transportMode: entry.transportMode || "own",
      transportChoice: entry.transportChoice || "",
      companions,
    });
  }, []);

  const openAdd = useCallback(() => {
    setEditing({
      companionDocIds: [],
      name: "",
      attendance: "yes",
      notes: "",
      mealChoice: "",
      allergySelection: [],
      allergyOther: "",
      transportMode: "own",
      transportChoice: "",
      companions: [],
    });
  }, []);

  /** CRUD del estado del modal sobre la lista de acompañantes. */
  const addCompanion = useCallback(() => {
    setEditing((prev) =>
      prev ? { ...prev, companions: [...prev.companions, { name: "", menu: "", allergies: [], other: "", isChild: false }] } : prev,
    );
  }, []);
  const removeCompanionAt = useCallback((index: number) => {
    setEditing((prev) =>
      prev ? { ...prev, companions: prev.companions.filter((_, i) => i !== index) } : prev,
    );
  }, []);
  const patchCompanion = useCallback((index: number, patch: Partial<EditingCompanion>) => {
    setEditing((prev) =>
      prev
        ? { ...prev, companions: prev.companions.map((c, i) => (i === index ? { ...c, ...patch } : c)) }
        : prev,
    );
  }, []);
  const toggleCompanionAllergy = useCallback((index: number, allergy: string) => {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            companions: prev.companions.map((c, i) =>
              i === index
                ? { ...c, allergies: c.allergies.includes(allergy) ? c.allergies.filter((a) => a !== allergy) : [...c.allergies, allergy] }
                : c,
            ),
          }
        : prev,
    );
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
      const now = serverTimestamp();
      const isUpdate = Boolean(editing.id);
      // Id determinista para nuevos mains (misma convención que antes).
      const norm = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 30);
      const mainId = editing.id ?? `main_manual_${norm || "invitado"}_${crypto.randomUUID()}`;
      const attending = editing.attendance === "yes";
      // Las alergias se aplanan igual que el RSVP (join " | ") y se cifran
      // como hace el cliente: las reglas exigen dietaryInfo cifrado o vacío.
      const allergyText = [...editing.allergySelection, editing.allergyOther].filter((a: string) => a.trim()).join(" | ");
      const encryptedDietary = allergyText ? encrypt(allergyText, inviteToken) : "";
      const complements = editing.companions.filter((c) => c.name.trim());
      // Esquema que cumple la regla create/update de rsvpResponses/.../responses
      // (whitelist de campos; todos los usados están permitidos).
      const payload: Record<string, unknown> = {
        rsvpType: "main",
        guestName: name.slice(0, 120),
        attendance: editing.attendance,
        dietaryInfo: encryptedDietary,
        inviteToken,
        submittedAt: now,
        privacyConsent: true,
        privacyConsentAt: now,
      };
      if (attending) {
        if (editing.mealChoice) payload.mealChoice = editing.mealChoice.slice(0, 30);
        if (allergyText) {
          payload.healthConsent = true;
          payload.healthConsentAt = now;
        }
        payload.transportMode = editing.transportMode.slice(0, 10);
        if (editing.transportChoice) payload.transportChoice = editing.transportChoice.slice(0, 20);
        if (complements.length) {
          payload.companionCount = complements.length;
          payload.companionNames = complements.map((c) => c.name.trim().slice(0, 120));
          payload.companionMenus = complements.map((c) => (c.menu ? c.menu.slice(0, 30) : ""));
          payload.companionAllergies = complements.map((c) => [...c.allergies, c.other].filter((a: string) => a.trim()).join(" | "));
          payload.companionAllergiesOther = complements.map((c) => c.other.slice(0, 200));
        }
      }
      const batch = writeBatch(db);
      if (isUpdate) {
        batch.update(doc(db, "rsvpResponses", inviteToken, "responses", editing.id!), payload);
      } else {
        batch.set(doc(db, "rsvpResponses", inviteToken, "responses", mainId), payload);
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
      // Acompañantes: cada uno se guarda en su doc (con menú y alergias) igual
      // que hace el flujo público, enlazado al main. Los niños ya no son
      // compañeros individuales: se declaran con contador en el principal.
      if (attending && complements.length) {
        complements.forEach((c) => {
          const compId = c.docId ?? `comp_manual_${norm || "invitado"}_${crypto.randomUUID()}`;
          const compAllergyText = [...c.allergies, c.other].filter((a: string) => a.trim()).join(" | ");
          const compPayload: Record<string, unknown> = {
            rsvpType: "companion",
            guestName: c.name.trim().slice(0, 120),
            attendance: "yes",
            dietaryInfo: compAllergyText ? encrypt(compAllergyText, inviteToken) : "",
            inviteToken,
            submittedAt: now,
            privacyConsent: true,
            privacyConsentAt: now,
            mainGuestDocId: mainId,
            mainGuestName: name.slice(0, 120),
          };
          if (compAllergyText) {
            compPayload.healthConsent = true;
            compPayload.healthConsentAt = now;
          }
          if (c.docId) batch.update(doc(db, "rsvpResponses", inviteToken, "responses", compId), compPayload);
          else batch.set(doc(db, "rsvpResponses", inviteToken, "responses", compId), compPayload);
        });
      }
      // Borra los docs de acompañantes que ya no están en la lista: evita
      // filas huérfanas en la tabla (la sesión de admin lo permite).
      const keptDocIds = new Set(complements.map((c) => c.docId).filter((d): d is string => Boolean(d)));
      for (const oldId of editing.companionDocIds) {
        if (!keptDocIds.has(oldId)) batch.delete(doc(db, "rsvpResponses", inviteToken, "responses", oldId));
      }
      await withWriteRetry(() => batch.commit());
      addToast("success", t(isUpdate ? "attendance.manualUpdated" : "attendance.manualAdded"));
      setEditing(null);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code?: unknown }).code) : "";
      addToast(
        "error",
        code === "permission-denied" ? t("attendance.manualLimitReached") : t("attendance.manualError"),
      );
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

  // Nombres únicos para el select de búsqueda, memoizados con un Set (O(n)
  // en vez del O(n²) de findIndex por render anterior: con 500 respuestas
  // eran ~250k comparaciones en cada renderización del tab).
  const uniqueGuestNames = useMemo(() => {
    const seen = new Set<string>();
    const out: RsvpEntry[] = [];
    for (const e of rsvpEntries || []) {
      const n = e.guestName || "";
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
    return out;
  }, [rsvpEntries]);

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
            return e.attendees
              .filter((a) => a.allergies?.length)
              .map((a) => `${a.name}: ${a.allergies.join(", ")}`)
              .join(", ");
          }
          return e.attendance === "yes" ? getDietaryItems(e.dietaryInfo || "").join(", ") : "";
        },
      },
      {
        key: "transport",
        type: "string",
        getValue: (e: RsvpEntry) =>
          e.attendance === "yes"
            ? resolveTransportLabel(e.transportMode || "", e.transportChoice || "", e.transportTime || "")
            : "",
      },
      { key: "child", type: "boolean", getValue: (e: RsvpEntry) => Boolean(e.isChild) },
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
    // Niños confirmados: acompañantes con el flag isChild y asistencia sí.
    const children = entries.filter(
      (e: RsvpEntry) => e.rsvpType === "companion" && e.isChild === true && e.attendance === "yes",
    ).length;
    return { yes, no, totalCompanions, withDietary, children };
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
          {uniqueGuestNames.map((e: RsvpEntry) => (
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
        {/* Restablece búsqueda y filtro con un solo toque (UX de listas). */}
        {searchQuery || attendanceFilter !== "all" ? (
          <button
            type="button"
            className="setup-button setup-button--ghost setup-button--compact"
            onClick={() => {
              setSearchQuery("");
              setAttendanceFilter("all");
            }}
          >
            {t("attendance.resetFilters")}
          </button>
        ) : null}
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
        {/* Estadística de niños confirmados (flag isChild del nuevo modelo). */}
        <span className="setup-help" style={{ margin: 0, fontSize: "0.8rem" }}>
          {t("attendance.childrenConfirmed", { count: stats.children })}
        </span>
      </div>

      {/* Contador de resultados filtrados (UX: el admin sabe cuántas filas
          coinciden con la búsqueda/filtro actuales, aria-live incluido). */}
      <div aria-live="polite" style={{ marginBottom: "0.5rem" }}>
        <span className="setup-help" style={{ margin: 0, fontSize: "0.78rem" }} data-testid="attendance-results-count">
          {filterEntries.length} {t("attendance.resultsCount", { count: filterEntries.length })}
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
                  <SortableTh
                    columnKey="name"
                    order={getIndicator("name")}
                    onSort={toggleSort}
                    style={{ minWidth: "100px" }}
                  >
                    {t("attendance.tableName")}
                  </SortableTh>
                  <SortableTh
                    columnKey="accompanies"
                    order={getIndicator("accompanies")}
                    onSort={toggleSort}
                    style={{ minWidth: "120px" }}
                  >
                    {t("attendance.tableAccompanies")}
                  </SortableTh>
                  <SortableTh
                    columnKey="attendance"
                    order={getIndicator("attendance")}
                    onSort={toggleSort}
                    style={{ minWidth: "70px" }}
                  >
                    {t("attendance.tableAttendance")}
                  </SortableTh>
                  <SortableTh
                    columnKey="menu"
                    order={getIndicator("menu")}
                    onSort={toggleSort}
                    style={{ minWidth: "120px" }}
                  >
                    {t("attendance.tableMenu")}
                  </SortableTh>
                  <SortableTh
                    columnKey="diet"
                    order={getIndicator("diet")}
                    onSort={toggleSort}
                    style={{ minWidth: "140px" }}
                  >
                    {t("attendance.tableDiet")}
                  </SortableTh>
                  <SortableTh
                    columnKey="transport"
                    order={getIndicator("transport")}
                    onSort={toggleSort}
                    style={{ minWidth: "120px" }}
                  >
                    {t("attendance.tableTransport")}
                  </SortableTh>
                  <SortableTh
                    // La clave DEBE coincidir con el key "child" de sortColumns:
                    // con el antiguo "birth" el find() fallaba, caía al fallback
                    // row["birth"] (siempre undefined) y la columna nunca ordenaba.
                    columnKey="child"
                    order={getIndicator("child")}
                    onSort={toggleSort}
                    style={{ minWidth: "110px" }}
                  >
                    {t("attendance.tableChild")}
                  </SortableTh>
                  <SortableTh
                    columnKey="consents"
                    order={getIndicator("consents")}
                    onSort={toggleSort}
                    style={{ minWidth: "120px" }}
                  >
                    {t("attendance.tableConsents")}
                  </SortableTh>
                  <SortableTh
                    columnKey="contact"
                    order={getIndicator("contact")}
                    onSort={toggleSort}
                    style={{ minWidth: "120px" }}
                  >
                    {t("attendance.tableContact")}
                  </SortableTh>
                  <SortableTh
                    columnKey="submittedAt"
                    order={getIndicator("submittedAt")}
                    onSort={toggleSort}
                    style={{ minWidth: "120px" }}
                  >
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
                        {/* Acciones en línea: seleccionar, editar (icono lápiz) y
                            eliminar (icono papelera, pide confirmación). */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", justifyContent: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleOne(entry.id)}
                            aria-label={t("attendance.selectEntry", { name: entry.guestName })}
                          />
                          {inviteToken ? (
                            <>
                              <button
                                type="button"
                                className="setup-button setup-button--ghost setup-button--compact"
                                style={{ padding: "0.2rem 0.45rem", display: "inline-flex", alignItems: "center" }}
                                onClick={() => openEdit(entry)}
                                aria-label={`${t("attendance.editManual")}: ${entry.guestName}`}
                                title={t("attendance.editManual")}
                              >
                                <IconEdit />
                              </button>
                              <button
                                type="button"
                                className="setup-button setup-button--ghost setup-button--compact"
                                style={{ padding: "0.2rem 0.45rem", display: "inline-flex", alignItems: "center", color: "var(--danger, #c0392b)" }}
                                onClick={() => handleDeleteRsvpEntries([entry.id])}
                                aria-label={`${t("attendance.deleteEntry")}: ${entry.guestName}`}
                                title={t("attendance.deleteEntry")}
                              >
                                <IconTrash />
                              </button>
                            </>
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
                            {/* Columna "Niño": muestra el flag isChild del doc
                                (los docs antiguos, sin flag, muestran "—"). */}
                            {entry.isChild ? t("attendance.childYes") : "—"}
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
                                <span style={{ fontSize: "0.75rem", color: "var(--setup-muted)" }}>
                                  {t("attendance.contactConsentOnly")}
                                </span>
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

      {/* Modal de añadir/editar respuesta manual (invitaciones físicas y
          corrección de respuestas de invitados): todos los datos editables. */}
      {editing ? (
        <Modal
          title={editing.id ? t("attendance.manualEditTitle") : t("attendance.manualAddTitle")}
          closeLabel={t("common.close")}
          onClose={() => setEditing(null)}
          style={{ maxWidth: "560px" }}
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

            {/* Solo si asiste: menú, alergias y transporte. */}
            {editing.attendance === "yes" ? (
              <>
                {menuEnabled ? (
                  <>
                    <label className="setup-label" htmlFor="manualRsvpMeal" style={{ marginTop: "0.6rem" }}>
                      {t("rsvp.menuLabel")}
                    </label>
                    <select
                      id="manualRsvpMeal"
                      className="setup-input"
                      value={editing.mealChoice}
                      onChange={(e) => setEditing({ ...editing, mealChoice: e.target.value })}
                      disabled={savingManual}
                    >
                      <option value="">{t("rsvp.menuPlaceholder")}</option>
                      <option value="carne">{t("rsvp.menuCarne")}</option>
                      <option value="pescado">{t("rsvp.menuPescado")}</option>
                      <option value="vegano">{t("rsvp.menuVegano")}</option>
                    </select>
                  </>
                ) : null}
                <fieldset style={{ border: "none", padding: 0, marginTop: "0.6rem" }}>
                  <legend className="setup-label">{t("rsvp.allergiesLegend")}</legend>
                  {ALLERGIES.map((a) => (
                    <label key={a} className="setup-checkbox-label" style={{ fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={editing.allergySelection.includes(a)}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            allergySelection: e.target.checked
                              ? [...editing.allergySelection, a]
                              : editing.allergySelection.filter((x) => x !== a),
                          })
                        }
                      />
                      {t("rsvp.allergies." + a)}
                    </label>
                  ))}
                  <input
                    className="setup-input"
                    value={editing.allergyOther}
                    onChange={(e) => setEditing({ ...editing, allergyOther: e.target.value })}
                    maxLength={200}
                    placeholder={t("rsvp.allergiesPlaceholder")}
                    style={{ marginTop: "0.3rem" }}
                    disabled={savingManual}
                  />
                </fieldset>
                <label className="setup-label" htmlFor="manualRsvpTransport" style={{ marginTop: "0.6rem" }}>
                  {t("rsvp.transportLabel")}
                </label>
                <select
                  id="manualRsvpTransport"
                  className="setup-input"
                  value={editing.transportMode}
                  onChange={(e) => setEditing({ ...editing, transportMode: e.target.value })}
                  disabled={savingManual}
                >
                  <option value="own">{t("rsvp.transportOwnCarOption")}</option>
                  <option value="bus">{t("rsvp.transportBusOption")}</option>
                  <option value="taxi">{t("rsvp.transportTaxiOption")}</option>
                </select>
                {editing.transportMode !== "own" && departuresList.length > 0 ? (
                  <>
                    <label className="setup-label" htmlFor="manualRsvpDeparture" style={{ marginTop: "0.6rem" }}>
                      {t("rsvp.transportDepartureLabel")}
                    </label>
                    <select
                      id="manualRsvpDeparture"
                      className="setup-input"
                      value={editing.transportChoice}
                      onChange={(e) => setEditing({ ...editing, transportChoice: e.target.value })}
                      disabled={savingManual}
                    >
                      {departuresList.map((d, i) => (
                        <option key={String(i)} value={String(i)}>
                          {departureLabel(d, t)}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}

                {/* Acompañantes: lista editable con todos sus campos. */}
                <fieldset style={{ border: "none", padding: 0, marginTop: "0.6rem" }}>
                  <legend className="setup-label">{t("attendance.manualCompanionsLabel")}</legend>
                  {editing.companions.map((comp, ci) => (
                    <div
                      key={String(ci)}
                      style={{
                        border: "1px solid var(--setup-border)",
                        borderRadius: "8px",
                        padding: "0.5rem",
                        marginBottom: "0.4rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.3rem",
                      }}
                    >
                      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                        <input
                          className="setup-input"
                          style={{ flex: 1 }}
                          value={comp.name}
                          onChange={(e) => patchCompanion(ci, { name: e.target.value })}
                          maxLength={120}
                          placeholder={t("attendance.manualNamePlaceholder")}
                          aria-label={`${t("attendance.manualCompanionsLabel")} ${ci + 1} - ${t("attendance.manualNameLabel")}`}
                        />
                        <button
                          type="button"
                          className="setup-button setup-button--ghost setup-button--compact"
                          onClick={() => removeCompanionAt(ci)}
                          aria-label={`${t("attendance.manualRemoveCompanion")} ${ci + 1}`}
                          title={t("attendance.manualRemoveCompanion")}
                        >
                          ✕
                        </button>
                      </div>
                      {menuEnabled ? (
                        <select
                          className="setup-input"
                          value={comp.menu}
                          onChange={(e) => patchCompanion(ci, { menu: e.target.value })}
                          aria-label={`${t("attendance.manualCompanionsLabel")} ${ci + 1} - ${t("rsvp.menuLabel")}`}
                        >
                          <option value="">{t("rsvp.menuPlaceholder")}</option>
                          <option value="carne">{t("rsvp.menuCarne")}</option>
                          <option value="pescado">{t("rsvp.menuPescado")}</option>
                          <option value="vegano">{t("rsvp.menuVegano")}</option>
                        </select>
                      ) : null}
                      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                        {ALLERGIES.map((a) => (
                          <label key={a} className="setup-checkbox-label" style={{ fontWeight: 400, fontSize: "0.85rem" }}>
                            <input
                              type="checkbox"
                              checked={comp.allergies.includes(a)}
                              onChange={() => toggleCompanionAllergy(ci, a)}
                            />
                            {t("rsvp.allergies." + a)}
                          </label>
                        ))}
                        <input
                          className="setup-input"
                          style={{ flex: 1, minWidth: "8rem" }}
                          value={comp.other}
                          onChange={(e) => patchCompanion(ci, { other: e.target.value })}
                          maxLength={200}
                          placeholder={t("rsvp.allergiesPlaceholder")}
                          aria-label={`${t("attendance.manualCompanionsLabel")} ${ci + 1} - ${t("rsvp.allergiesPlaceholder")}`}
                        />
                      </div>
                    </div>
                  ))}
                  <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={addCompanion}>
                    {t("attendance.manualAddCompanion")}
                  </button>
                </fieldset>
              </>
            ) : null}

            <div className="setup-actions" style={{ marginTop: "0.8rem" }}>
              <button className="setup-button" type="submit" disabled={savingManual || !editing.name.trim()}>
                {savingManual
                  ? t("common.loading")
                  : editing.id
                    ? t("attendance.manualSave")
                    : t("attendance.manualAdd")}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
});

export default AttendanceTab;
