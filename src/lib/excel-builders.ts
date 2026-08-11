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

// ── Tipos de entrada (estructuras que ya usan los componentes) ──

/** Fila de respuesta RSVP (subconjunto de RsvpEntry). */
interface RsvpRowLike {
  guestName?: string;
  attendance?: string;
  mealChoice?: string;
  attendees?: Array<{ name: string; menu?: string; allergies?: string[] }>;
  dietaryInfo?: string;
  phone?: string;
  email?: string;
  submittedAt?: string;
  transportChoice?: string;
  transportMode?: string;
  birthDate?: string;
}

/** Mensaje del buzón privado (ya formateado por el componente). */
interface MailboxRowLike {
  guestName: string;
  message: string;
  ts: string;
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
  phone?: unknown;
  email?: unknown;
  submittedAt?: unknown;
  attendees?: unknown;
}

/** Fila del registro de auditoría. */
interface AuditRowLike {
  action: string;
  detail: string;
  ts: string;
}

/** Traduce la clave de un plato; si no hay traducción devuelve el plato crudo. */
function menuLabel(menu: string, t: (key: string) => string): string {
  if (!menu) return "";
  const key = "rsvp.menu" + menu.charAt(0).toUpperCase() + menu.slice(1);
  const label = t(key);
  return label === key ? menu : label;
}

// ── Admin: asistencia y menús ──

/** Hoja "Asistencia": una fila por respuesta RSVP. */
export function buildRSVPSheet(entries: RsvpRowLike[], t: (key: string) => string): ExcelSheet {
  const rows: Array<Array<string | number>> = (entries || []).map((e) => [
    e.guestName || "",
    e.attendance === "yes" ? t("attendance.attendingValue") : e.attendance === "no" ? t("attendance.notAttendingValue") : "",
    menuLabel(e.mealChoice || "", t),
    e.dietaryInfo || "",
    [e.transportChoice || "", e.transportMode && e.transportMode !== "own" ? `(${e.transportMode})` : ""].filter(Boolean).join(" "),
    e.birthDate || "",
    [e.phone, e.email].filter(Boolean).join(" / "),
    e.submittedAt ? excelDate(e.submittedAt) : "",
  ]);
  return {
    name: t("attendance.sheetAttendance"),
    headers: [
      t("attendance.tableName"),
      t("attendance.tableAttendance"),
      t("attendance.tableMenu"),
      t("attendance.tableDiet"),
      t("attendance.tableTransport"),
      t("attendance.tableBirth"),
      t("attendance.tableContact"),
      t("attendance.tableDate"),
    ],
    rows,
    colWidths: [24, 14, 20, 26, 20, 14, 28, 18],
  };
}

/** Hoja "Menús": qué plato pidió cada confirmado (y sus acompañantes). */
export function buildMenuSheet(entries: RsvpRowLike[], t: (key: string) => string): ExcelSheet {
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

// ── Admin: lista de invitados esperados ──

/** Hoja "Invitados": cada esperado con su estado de confirmación. */
export function buildGuestsSheet(expected: string[], confirmed: Set<string>, t: (key: string) => string): ExcelSheet {
  const rows: Array<Array<string>> = (expected || []).map((name) => [
    name,
    confirmed.has(name.toLowerCase()) ? t("tools.confirmedValue") : t("tools.pendingValue"),
  ]);
  return {
    name: t("tools.sheetGuests"),
    headers: [t("tools.nameValue"), t("tools.statusValue")],
    rows,
    colWidths: [26, 18],
  };
}

// ── Admin: buzón privado ──

/** Hoja "Buzón": todos los mensajes privados de los invitados. */
export function buildMailboxSheet(mailbox: MailboxRowLike[], t: (key: string) => string): ExcelSheet {
  const rows: Array<Array<string>> = (mailbox || []).map((m) => [m.guestName, m.message, m.ts]);
  return {
    name: t("tools.sheetMailbox"),
    headers: [t("tools.nameValue"), t("tools.messageValue"), t("tools.dateValue")],
    rows,
    colWidths: [26, 60, 20],
  };
}

// ── Admin: mesas por sección ──

/**
 * Hoja "Mesas": una fila por invitado asignado (y una fila con el invitado
 * vacío para las mesas sin asignados, para que ninguna mesa quede invisible).
 */
export function buildTablesSheet(
  sections: SectionLike[],
  activeSectionId: string,
  tables: TableLike[],
  t: (key: string) => string,
): ExcelSheet {
  const active = sections.find((s) => s.id === activeSectionId);
  const rows: Array<Array<string | number>> = [];
  for (const tb of tables || []) {
    if (tb.guests.length === 0) {
      rows.push([active?.name || "", tb.name, tb.shape, tb.w, tb.h, tb.seats, ""]);
    } else {
      for (const g of tb.guests) {
        rows.push([active?.name || "", tb.name, tb.shape, tb.w, tb.h, tb.seats, g]);
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
    headers: ["Token", "Invitación", "Admin", "Fecha boda", "Visitas", "RSVP", "Confirmados", "Declinados", "Acompañantes", "Conversión(%)"],
    rows,
    colWidths: [12, 24, 16, 14, 10, 10, 12, 12, 14, 12],
  };
}

// ── Superadmin: todas las confirmaciones de todos los tokens ──

/**
 * Hoja "Invitados": cada confirmación de cada invitación (se aplica el mismo
 * filtro de invitación que usaba el CSV: solo respuestas del token en curso).
 */
export function buildGlobalGuestsSheet(
  perInvite: Array<{ invite: InviteRowLike; rsvps: RsvpDocLike[] }>,
): ExcelSheet {
  const rows: Array<Array<string | number>> = [];
  for (const { invite, rsvps } of perInvite || []) {
    for (const rd of rsvps || []) {
      if (rd.inviteToken !== invite.id) continue;
      rows.push([
        invite.id,
        `${invite.firstName} ${invite.secondName}`.trim(),
        String(rd.guestName || ""),
        String(rd.attendance || ""),
        Array.isArray(rd.attendees) ? (rd.attendees as Array<{ menu?: string }>).map((a) => a.menu || "").join("; ") : String(rd.mealChoice || ""),
        Array.isArray(rd.allergiesOther) ? (rd.allergiesOther as string[]).join("; ") : String(rd.dietaryInfo || ""),
        String(rd.phone || ""),
        String(rd.email || ""),
        String(rd.submittedAt || ""),
      ]);
    }
  }
  return {
    name: "Invitados",
    headers: ["Token", "Invitación", "Nombre", "Asistencia", "Menú", "Alergias", "Teléfono", "Email", "Fecha"],
    rows,
    colWidths: [12, 24, 22, 14, 22, 24, 16, 24, 20],
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
    r.submittedAt ? new Date(String(r.submittedAt)).toLocaleDateString() : "",
  ]);
  void token;
  return {
    name: "RSVP",
    headers: ["Nombre", "Asistencia", "Acompañantes", "Menú", "Alergias", "Fecha"],
    rows,
    colWidths: [24, 14, 14, 20, 26, 14],
  };
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
