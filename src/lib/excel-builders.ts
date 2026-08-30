/**
 * excel-builders — Constructores puros de hojas Excel para todos los exports.
 *
 * Cada builder recibe únicamente datos tipados (los mismos que maneja cada
 * componente) y devuelve una `ExcelSheet` lista para `exportToXlsx`. Al ser
 * funciones puras se pueden probar de forma aislada: la suite de tests genera
 * el .xlsx con `buildWorkbook` y lo reabre con la librería `xlsx` para
 * comprobar que todas las celdas conservan su valor, orden y tipo.
 */
import { excelDate, type ExcelSheet } from "./excel-utils";
import i18n from "../i18n";
import { formatDateLocalized } from "./safe-date";
import type { TFunction } from "i18next";

/** Traductor usado por los constructores: `t` real de i18next (mismo tipo que derive.ts). */
export type Translate = TFunction<"translation", undefined>;

// ── Tipos de entrada (estructuras que ya usan los componentes) ──

/** Fila de respuesta RSVP (subconjunto de RsvpEntry). */
interface RsvpRowLike {
  guestName?: string;
  attendance?: string;
  mealChoice?: string;
  attendees?: Array<{ name: string; menu?: string; allergies?: string[] }>;
  dietaryInfo?: string;
  submittedAt?: string;
  transportChoice?: string;
  transportMode?: string;
  /** Hora de salida elegida que se guarda junto al modo de transporte. */
  transportTime?: string;
  /** Invitado al que acompaña (solo compañeros); undefined en principales. */
  mainGuestName?: string;
  /** Niños declarados por el invitado principal (contador del nuevo modelo). */
  childrenCount?: number;
  childrenAllergies?: string[];
  childrenAllergiesOther?: string;
  /** Consentimiento de salud de la confirmación (alergias declaradas). */
  healthConsent?: boolean;
}



/** Mesa de una sección (solo los campos que se exportan). */
interface TableLike {
  name: string;
  shape: string;
  w: number;
  h: number;
  seats: number;
  guests: string[];
}

/** Sección del plano de mesas. */
interface SectionLike {
  id: string;
  name: string;
}

/** Fila del embudo de métricas globales. */
interface MetricRowLike {
  id: string;
  firstName: string;
  secondName: string;
  adminUsername: string;
  weddingDateLabel: string;
  visits: number;
  rsvpCount: number;
  confirmed: number;
  companions: number;
  conversion: number;
}

/** Invitación del superadmin (para el export global de confirmaciones). */
interface InviteRowLike {
  id: string;
  firstName: string;
  secondName: string;
}

/** Datos crudos de un documento RSVP (d.data() de Firestore). */
interface RsvpDocLike {
  inviteToken?: unknown;
  guestName?: unknown;
  attendance?: unknown;
  companionCount?: unknown;
  mealChoice?: unknown;
  allergiesOther?: unknown;
  dietaryInfo?: unknown;
  submittedAt?: unknown;
  attendees?: unknown;
}

/** Fila del registro de auditoría. */
interface AuditRowLike {
  action: string;
  detail: string;
  ts: string;
}

// Etiqueta de plato unificada en menu-utils (v2.186): antes había una copia
// local aquí además de la de attendance-core/AdminPage/AttendanceTab.
import { formatMenuLabel as menuLabel } from "./menu-utils";

// ── Admin: asistencia y menús ──

/** Hoja "Asistencia": una fila por respuesta RSVP. */
export function buildRSVPSheet(entries: RsvpRowLike[], t: Translate): ExcelSheet {
  const childrenTexto = (e: RsvpRowLike) => {
    const base = (e.childrenAllergies || []).filter(Boolean).join(", ");
    const extra = (e.childrenAllergiesOther || "").trim();
    return [base, extra].filter(Boolean).join(", ");
  };
  // Modo de transporte legible: own se traduce a "Coche propio" y bus/taxi a
  // "Autobús"/"Taxi" con la hora de salida si está guardada (los valores
  // crudos "bus"/"taxi" eran ilegibles para el anfitrión en el Excel).
  const transporte = (e: RsvpRowLike) => {
    const mode = e.transportMode || "";
    if (!mode) return "";
    if (mode === "own") return t("attendance.transportOwnCar");
    const tipo = t(mode === "taxi" ? "transport.typeTaxi" : "transport.typeBus");
    const hora = e.transportTime || "";
    return hora ? `${tipo} (${hora})` : tipo;
  };
  const rows: Array<Array<string | number>> = (entries || []).map((e) => [
    e.guestName || "",
    // Acompaña a: solo para compañeros; los principales quedan vacíos.
    e.mainGuestName || "",
    e.attendance === "yes"
      ? t("attendance.attendingValue")
      : e.attendance === "no"
        ? t("attendance.notAttendingValue")
        : "",
    // Menú legible: si asiste sin haber elegido plato entra la opción
    // predefinida del anfitrión (antes quedaba vacía y no informaba).
    e.attendance === "yes" && !e.mealChoice
      ? t("rsvp.menuPredefined")
      : menuLabel(e.mealChoice || "", t),
    e.dietaryInfo || "",
    // Niños del nuevo modelo: "Sí, N" en vez del número suelto.
    e.attendance === "yes" && (e.childrenCount || 0) > 0
      ? t("attendance.childrenYes", { count: e.childrenCount })
      : "",
    e.attendance === "yes" && childrenTexto(e) ? childrenTexto(e) : "",
    transporte(e),
    // Consentimiento de salud (alergias declaradas) con la etiqueta de la tabla.
    e.healthConsent ? t("attendance.consentHealth") : "",
    e.submittedAt ? excelDate(e.submittedAt) : "",
  ]);
  return {
    name: t("attendance.sheetAttendance"),
    headers: [
      t("attendance.tableName"),
      t("attendance.tableAccompanies"),
      t("attendance.tableAttendance"),
      t("attendance.tableMenu"),
      t("attendance.tableDiet"),
      t("attendance.tableChildren"),
      t("attendance.tableChildrenDiet"),
      t("attendance.tableTransport"),
      t("attendance.tableConsents"),
      t("attendance.tableDate"),
    ],
    rows,
    colWidths: [24, 20, 14, 20, 26, 14, 28, 20, 22, 18],
  };
}

/** Hoja "Menús": qué plato pidió cada confirmado (y sus acompañantes). */
export function buildMenuSheet(entries: RsvpRowLike[], t: Translate): ExcelSheet {
  const rows: Array<Array<string>> = [];
  for (const e of entries || []) {
    // Los que declinan no comen: no aportan fila al catering.
    if (e.attendance === "no") continue;
    if (e.attendees && e.attendees.length > 0) {
      for (const a of e.attendees) {
        rows.push([a.name, menuLabel(a.menu || "", t)]);
      }
    } else if (e.mealChoice) {
      rows.push([e.guestName || "", menuLabel(e.mealChoice, t)]);
    }
  }
  return {
    name: t("attendance.sheetMenus"),
    headers: [t("attendance.tableName"), t("attendance.tableMenu")],
    rows,
    colWidths: [24, 22],
  };
}

// ── Admin: buzón privado ──

// ── Admin: mesas por sección ──

/**
 * Hoja "Mesas": una fila por invitado asignado (y una fila con el invitado
 * vacío para las mesas sin asignados, para que ninguna mesa quede invisible).
 */
export function buildTablesSheet(
  sections: SectionLike[],
  activeSectionId: string,
  tables: TableLike[],
  t: Translate,
): ExcelSheet {
  const active = sections.find((s) => s.id === activeSectionId);
  const rows: Array<Array<string | number>> = [];
  for (const tb of tables || []) {
    // Tamaño en una sola celda (w × h) para que las 6 columnas coincidan con
    // los 6 encabezados: sección, mesa, forma, tamaño (px), plazas, invitado.
    const size = `${tb.w ?? ""}×${tb.h ?? ""}`;
    if (tb.guests.length === 0) {
      rows.push([active?.name || "", tb.name, tb.shape, size, tb.seats, ""]);
    } else {
      for (const g of tb.guests) {
        rows.push([active?.name || "", tb.name, tb.shape, size, tb.seats, g]);
      }
    }
  }
  return {
    name: t("distribucion.sheetTables"),
    headers: [
      t("distribucion.sectionValue"),
      t("distribucion.tableValue"),
      t("distribucion.shapeValue"),
      t("distribucion.sizeValue"),
      t("distribucion.capacityValue"),
      t("distribucion.guestValue"),
    ],
    rows,
    colWidths: [20, 18, 14, 12, 12, 24],
  };
}

// ── Superadmin: métricas globales ──

/** Hoja "Métricas": embudo global de conversión por invitación. */
export function buildMetricsSheet(funnel: MetricRowLike[]): ExcelSheet {
  const rows: Array<Array<string | number>> = (funnel || []).map((r) => [
    r.id,
    `${r.firstName} ${r.secondName}`.trim(),
    r.adminUsername,
    r.weddingDateLabel,
    r.visits,
    r.rsvpCount,
    r.confirmed,
    r.rsvpCount - r.confirmed,
    r.companions,
    r.conversion,
  ]);
  return {
    name: "Métricas",
    headers: [
      "Token",
      "Invitación",
      "Admin",
      "Fecha boda",
      "Visitas",
      "RSVP",
      "Confirmados",
      "Declinados",
      "Acompañantes",
      "Conversión(%)",
    ],
    rows,
    colWidths: [12, 24, 16, 14, 10, 10, 12, 12, 14, 12],
  };
}

// ── Superadmin: todas las confirmaciones de todos los tokens ──

/**
 * Hoja "Invitados": cada confirmación de cada invitación (se aplica el mismo
 * filtro de invitación que usaba el CSV: solo respuestas del token en curso).
 */
export function buildGlobalGuestsSheet(perInvite: Array<{ invite: InviteRowLike; rsvps: RsvpDocLike[] }>): ExcelSheet {
  const rows: Array<Array<string | number>> = [];
  for (const { invite, rsvps } of perInvite || []) {
    for (const rd of rsvps || []) {
      if (rd.inviteToken !== invite.id) continue;
      rows.push([
        invite.id,
        `${invite.firstName} ${invite.secondName}`.trim(),
        String(rd.guestName || ""),
        String(rd.attendance || ""),
        Array.isArray(rd.attendees)
          ? (rd.attendees as Array<{ menu?: string }>).map((a) => a.menu || "").join("; ")
          : String(rd.mealChoice || ""),
        Array.isArray(rd.allergiesOther) ? (rd.allergiesOther as string[]).join("; ") : String(rd.dietaryInfo || ""),
        String(rd.submittedAt || ""),
      ]);
    }
  }
  return {
    name: "Invitados",
    headers: ["Token", "Invitación", "Nombre", "Asistencia", "Menú", "Alergias", "Fecha"],
    rows,
    colWidths: [12, 24, 22, 14, 22, 24, 20],
  };
}

// ── Superadmin: RSVP de una invitación (DataTab) ──

/** Hoja "RSVP" para un token concreto. */
export function buildRsvpSheet(token: string, docs: RsvpDocLike[]): ExcelSheet {
  const rows: Array<Array<string | number>> = (docs || []).map((r) => [
    String(r.guestName || ""),
    String(r.attendance || ""),
    Number(r.companionCount) || 0,
    String(r.mealChoice || ""),
    Array.isArray(r.allergiesOther) ? (r.allergiesOther as string[]).join("; ") : String(r.allergiesOther || ""),
    // submittedAt puede ser string ISO, epoch numérico o un Firestore
    // Timestamp. Sin este parser, new Date("[object Object]") daba "Invalid
    // Date" en la exportación del superadmin.
    formatSubmittedDate(r.submittedAt),
  ]);
  void token;
  return {
    name: "RSVP",
    headers: ["Nombre", "Asistencia", "Acompañantes", "Menú", "Alergias", "Fecha"],
    rows,
    colWidths: [24, 14, 14, 20, 26, 14],
  };
}

/**
 * Normaliza una fecha almacenada (string ISO, epoch ms/s o Timestamp de
 * Firestore) a una cadena legible, o cadena vacía si es inválida. Helper
 * unificado en safe-date (v2.186): el locale queda PINNEADO a es-ES / en-US
 * para eliminar la carrera del idioma asíncrono de i18n.
 */
function formatSubmittedDate(raw: unknown): string {
  return formatDateLocalized(raw, i18n.language);
}

// ── Superadmin: registro de auditoría ──

/** Hoja "Auditoría": acciones de soporte registradas. */
export function buildAuditSheet(auditRows: AuditRowLike[]): ExcelSheet {
  const rows: Array<Array<string>> = (auditRows || []).map((r) => [r.action, r.detail, r.ts]);
  return {
    name: "Auditoría",
    headers: ["Acción", "Detalle", "Fecha"],
    rows,
    colWidths: [22, 60, 20],
  };
}
