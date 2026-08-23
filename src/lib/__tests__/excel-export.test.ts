/**
 * excel-export.test.ts — Prueba de formato de TODOS los Excel descargables.
 *
 * Estrategia de ida y vuelta real: cada builder produce sus hojas, se genera
 * el libro con `buildWorkbook`, se serializa a XLSX con el escritor propio
 * (`writeWorkbookBuffer`), se reabre con `XLSX.read` (xlsx es devDependency,
 * solo para validar) y se verifican las celdas (cabeceras, filas, valores y
 * tipos numéricos). Así se comprueba que el fichero generado es válido y
 * legible en Excel/LibreOffice/Google Sheets.
 */
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildWorkbook, writeWorkbookBuffer } from "../excel-utils";
import {
  buildRSVPSheet,
  buildMenuSheet,
  buildMailboxSheet,
  buildTablesSheet,
  buildMetricsSheet,
  buildGlobalGuestsSheet,
  buildRsvpSheet,
  buildAuditSheet,
} from "../excel-builders";

/** t() de prueba: traduce las claves conocidas y deja el resto tal cual. */
const t = (key: string): string => {
  const map: Record<string, string> = {
    "attendance.sheetAttendance": "Asistencia",
    "attendance.sheetMenus": "Menús",
    "attendance.attendingValue": "Sí",
    "attendance.notAttendingValue": "No",
    "attendance.tableName": "Nombre",
    "attendance.tableAttendance": "Asistencia",
    "attendance.tableMenu": "Menú",
    "attendance.tableDiet": "Info alimentaria",
    "attendance.tableTransport": "Transporte",
    "attendance.tableChild": "Niño",
    "attendance.childYes": "Sí",
    "attendance.tableContact": "Contacto",
    "attendance.tableDate": "Fecha",
    "rsvp.menuCarne": "Carne",
    "rsvp.menuPescado": "Pescado",
    "rsvp.menuVegano": "Vegano",
    "tools.sheetGuests": "Invitados",
    "tools.sheetMailbox": "Buzón",
    "tools.nameValue": "Nombre",
    "tools.statusValue": "Estado",
    "tools.messageValue": "Mensaje",
    "tools.dateValue": "Fecha",
    "tools.confirmedValue": "Confirmado",
    "tools.pendingValue": "Pendiente",
    "distribucion.sheetTables": "Mesas",
    "distribucion.sectionValue": "Sección",
    "distribucion.tableValue": "Mesa",
    "distribucion.shapeValue": "Forma",
    "distribucion.sizeValue": "Tamaño (px)",
    "distribucion.capacityValue": "Plazas",
    "distribucion.guestValue": "Invitado",
  };
  return map[key] ?? key;
};

/** Serializa las hojas a un .xlsx real y lo reabre en formato 2D (string[][]) por hoja. */
function readBack(sheets: Parameters<typeof buildWorkbook>[0]) {
  const wb = buildWorkbook(sheets);
  const buf = writeWorkbookBuffer(wb);
  const reopened = XLSX.read(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), { type: "buffer" });
  return reopened.SheetNames.map((name) => ({
    name,
    data: XLSX.utils.sheet_to_json<Array<string | number>>(reopened.Sheets[name] as XLSX.WorkSheet, {
      header: 1,
      defval: "",
    }),
  }));
}

describe("Export Excel: Asistencia + Menús (AttendanceTab)", () => {
  const sheets = readBack([
    buildRSVPSheet(
      [
        {
          guestName: "Ana, la novia",
          attendance: "yes",
          mealChoice: "carne",
          dietaryInfo: "sin gluten | menú: infantil",
          transportMode: "bus",
          isChild: true,
          phone: "600123456",
          email: "ana@correo.com",
          submittedAt: "2026-08-01T10:00:00",
        },
        { guestName: "Pedro", attendance: "no", mealChoice: "pescado" },
        { guestName: "Sin datos", attendance: "" },
      ],
      t,
    ),
    buildMenuSheet(
      [
        {
          guestName: "Ana",
          attendance: "yes",
          attendees: [
            { name: "Ana", menu: "carne" },
            { name: "Luis", menu: "pescado" },
          ],
        },
        { guestName: "Solo", attendance: "yes", mealChoice: "vegano" },
        { guestName: "Ausente", attendance: "no", mealChoice: "carne" },
      ],
      t,
    ),
  ]);

  it("genera dos hojas con nombre traducido", () => {
    expect(sheets.map((s) => s.name)).toEqual(["Asistencia", "Menús"]);
  });

  it("cabecera completa de asistencia", () => {
    expect(sheets[0]!.data[0]!).toEqual([
      "Nombre",
      "Asistencia",
      "Menú",
      "Info alimentaria",
      "Transporte",
      "Niño",
      "Contacto",
      "Fecha",
    ]);
  });

  it("devuelve todos los campos del confirmado traducidos y con fecha dd/mm/aaaa hh:mm", () => {
    const row = sheets[0]!.data[1]!;
    expect(row).toEqual([
      "Ana, la novia",
      "Sí",
      "Carne",
      "sin gluten | menú: infantil",
      "(bus)",
      "Sí",
      "600123456 / ana@correo.com",
      "01/08/2026 10:00",
    ]);
  });

  it("declinado queda como No y conserva el plato que eligió", () => {
    const row = sheets[0]!.data[2]!;
    expect(row[1]).toBe("No");
    expect(row[2]).toBe("Pescado");
  });

  it("fila sin respuesta queda vacía en asistencia/menú", () => {
    const row = sheets[0]!.data[3]!;
    expect(row[1]).toBe("");
    expect(row[2]).toBe("");
  });

  it("la hoja Menús expande acompañantes y excluye a los que declinan", () => {
    expect(sheets[1]!.data).toEqual([
      ["Nombre", "Menú"],
      ["Ana", "Carne"],
      ["Luis", "Pescado"],
      ["Solo", "Vegano"],
    ]);
  });
});

describe("Export Excel: buzón (ToolsTab)", () => {
  const sheet = readBack([
    buildMailboxSheet(
      [
        { guestName: "Ana", message: "Felicidades, Ana, Luis", ts: "01/08/2026 09:30" },
        { guestName: "Anónimo", message: "Mensaje con, comas", ts: "" },
      ],
      t,
    ),
  ])[0]!;

  it("preserva el mensaje literal (comas incluidas) y la fecha", () => {
    expect(sheet.data).toEqual([
      ["Nombre", "Mensaje", "Fecha"],
      ["Ana", "Felicidades, Ana, Luis", "01/08/2026 09:30"],
      ["Anónimo", "Mensaje con, comas", ""],
    ]);
  });
});

describe("Export Excel: mesas (DistribucionTab)", () => {
  const sheet = readBack([
    buildTablesSheet(
      [
        { id: "s1", name: "Salón principal" },
        { id: "s2", name: "Jardín" },
      ],
      "s1",
      [
        { name: "Mesa 1", shape: "rect", w: 400, h: 200, seats: 8, guests: ["Ana", "Luis"] },
        { name: "Mesa vacía", shape: "circle", w: 250, h: 250, seats: 6, guests: [] },
      ],
      t,
    ),
  ])[0]!;

  it("una fila por invitado asignado + una fila con invitado vacío para la mesa sin asignados", () => {
    // El encabezado queda con el ancho máximo (7 columnas) por la fila de invitado.
    expect(sheet.data[0]!.slice(0, 6)).toEqual(["Sección", "Mesa", "Forma", "Tamaño (px)", "Plazas", "Invitado"]);
    expect(sheet.data.slice(1)).toEqual([
      ["Salón principal", "Mesa 1", "rect", "400×200", 8, "Ana"],
      ["Salón principal", "Mesa 1", "rect", "400×200", 8, "Luis"],
      ["Salón principal", "Mesa vacía", "circle", "250×250", 6, ""],
    ]);
  });

  it("mantiene el tamaño como cadena 'ancho×alto' y las plazas como números", () => {
    expect(typeof sheet.data[1]![3]).toBe("string");
    expect(sheet.data[1]![3]).toBe("400×200");
    expect(typeof sheet.data[1]![4]).toBe("number");
    expect(sheet.data[1]![4]).toBe(8);
  });
});

describe("Export Excel: métricas globales (MetricsTab)", () => {
  const sheet = readBack([
    buildMetricsSheet([
      {
        id: "TOK1",
        firstName: "Ana",
        secondName: "García",
        adminUsername: "wedingotesting",
        weddingDateLabel: "15/08/2026",
        visits: 42,
        rsvpCount: 10,
        confirmed: 7,
        companions: 4,
        conversion: 70,
      },
      {
        id: "TOK2",
        firstName: "Luis",
        secondName: "Pérez",
        adminUsername: "admin2",
        weddingDateLabel: "",
        visits: 3,
        rsvpCount: 0,
        confirmed: 0,
        companions: 0,
        conversion: 0,
      },
    ]),
  ])[0]!;

  it("cabecera y embudo: declinados = RSVP − confirmados", () => {
    expect(sheet.data).toEqual([
      [
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
      ["TOK1", "Ana García", "wedingotesting", "15/08/2026", 42, 10, 7, 3, 4, 70],
      ["TOK2", "Luis Pérez", "admin2", "", 3, 0, 0, 0, 0, 0],
    ]);
  });

  it("los contadores se exportan como números", () => {
    expect(typeof sheet.data[1]![4]).toBe("number");
    expect(typeof sheet.data[1]![9]).toBe("number");
  });
});

describe("Export Excel: todas las confirmaciones (MetricsTab)", () => {
  const sheet = readBack([
    buildGlobalGuestsSheet([
      {
        invite: { id: "TOK1", firstName: "Ana", secondName: "García" },
        rsvps: [
          {
            inviteToken: "TOK1",
            guestName: "Ana",
            attendance: "yes",
            attendees: [{ menu: "carne" }, { menu: "pescado" }],
            allergiesOther: ["sin gluten"],
            phone: "6001",
            email: "a@x.com",
            submittedAt: "2026-08-01",
          },
          { inviteToken: "OTRO", guestName: "Intruso", attendance: "yes" },
        ],
      },
    ]),
  ])[0]!;

  it("filtra respuestas de otras invitaciones y une menús y alergias", () => {
    expect(sheet.data).toEqual([
      ["Token", "Invitación", "Nombre", "Asistencia", "Menú", "Alergias", "Teléfono", "Email", "Fecha"],
      ["TOK1", "Ana García", "Ana", "yes", "carne; pescado", "sin gluten", "6001", "a@x.com", "2026-08-01"],
    ]);
  });
});

describe("Export Excel: RSVP por invitación (DataTab)", () => {
  const sheet = readBack([
    buildRsvpSheet("TOK1", [
      {
        guestName: "Ana",
        attendance: "yes",
        companionCount: 2,
        mealChoice: "carne",
        allergiesOther: "frutos secos",
        submittedAt: "2026-08-01T10:00:00",
      },
      { guestName: "Luis", attendance: "no", companionCount: 0 },
    ]),
  ])[0]!;

  it("cabecera y valores con acompañantes numérico y fecha localizada", () => {
    expect(sheet.data).toEqual([
      ["Nombre", "Asistencia", "Acompañantes", "Menú", "Alergias", "Fecha"],
      ["Ana", "yes", 2, "carne", "frutos secos", "1/8/2026"],
      ["Luis", "no", 0, "", "", ""],
    ]);
  });
});

describe("Export Excel: auditoría (SupportTab)", () => {
  const sheet = readBack([
    buildAuditSheet([
      { action: "reset_token", detail: "Token TOK1 reiniciado", ts: "11/08/2026 12:00:00" },
      { action: "purge", detail: "Borrado GDPR de TOK2", ts: "11/08/2026 12:30:00" },
    ]),
  ])[0]!;

  it("cabecera y filas de auditoría", () => {
    expect(sheet.data).toEqual([
      ["Acción", "Detalle", "Fecha"],
      ["reset_token", "Token TOK1 reiniciado", "11/08/2026 12:00:00"],
      ["purge", "Borrado GDPR de TOK2", "11/08/2026 12:30:00"],
    ]);
  });
});

describe("buildWorkbook (excel-utils)", () => {
  it("omite las hojas sin filas de datos (incluso con cabecera)", () => {
    // Hoja totalmente vacía.
    const empty = buildWorkbook([{ name: "Vacía", headers: [], rows: [] }]);
    expect(empty.sheets).toEqual([]);
    // Hoja con cabecera pero sin datos: también se omite (no exportar vacío).
    const headerOnly = buildWorkbook([{ name: "SoloCabecera", headers: ["A", "B"], rows: [] }]);
    expect(headerOnly.sheets).toEqual([]);
    // Un libro con varias hojas donde solo una tiene datos conserva esa hoja.
    const mixed = buildWorkbook([
      { name: "SinDatos", headers: ["A"], rows: [] },
      { name: "ConDatos", headers: ["A"], rows: [["x"]] },
    ]);
    expect(mixed.sheets.map((s) => s.name)).toEqual(["ConDatos"]);
  });

  it("respeta el límite de 31 caracteres del nombre de hoja", () => {
    const wb = buildWorkbook([{ name: "a".repeat(40), headers: ["H"], rows: [["x"]] }]);
    expect(wb.sheets[0]!.name.length).toBe(31);
  });

  it("aplica los anchos de columna para que el contenido sea legible", () => {
    const wb = buildWorkbook([{ name: "S", headers: ["A"], rows: [["x"]], colWidths: [40] }]);
    expect(wb.sheets[0]!.colWidths?.[0]).toBe(40);
    // El ancho se serializa dentro del worksheet generado.
    const buf = new TextDecoder().decode(writeWorkbookBuffer(wb));
    expect(buf).toContain('width="40"');
  });
});

describe("Escritor XLSX: casos borde", () => {
  const edge = readBack([
    {
      name: "Bordes",
      headers: ["Texto", "Número", "Booleano", "Vacío"],
      rows: [
        // Caracteres que requieren escape XML y control-characters ilegales.
        ['a & b < "c" > d \u0007\n\te\u0301', 3.14159, true, null],
        // NaN e Infinity no deben producir XML inválido (se emiten vacías).
        ["nan", Number.NaN, false, undefined],
        ["inf", Number.POSITIVE_INFINITY, false, ""],
        // Texto largo y acentos/emoji.
        ["José & María ❤️ — muy larga ".repeat(40), 0, true, 42],
      ],
    },
  ])[0]!;

  it("escapa XML, sanea caracteres de control y conserva saltos/acentos/emoji", () => {
    expect(edge.data[1]).toEqual(['a & b < "c" > d \n\té', 3.14159, true, ""]);
    // El texto largo sobrevive completo y sin caracteres de control.
    const long = edge.data[4]![0] as string;
    expect(long).toContain("❤️");
    expect(long).toContain("José & María");
    expect(long.length).toBeGreaterThan(100);
    expect(long).not.toContain("\u0007");
  });

  it("NaN e Infinity se emiten como celdas vacías (no rompen el XML)", () => {
    expect(edge.data[2]).toEqual(["nan", "", false, ""]);
    expect(edge.data[3]).toEqual(["inf", "", false, ""]);
  });

  it("mantiene números decimales y el valor 0", () => {
    expect(edge.data[1]![1]).toBe(3.14159);
    expect(edge.data[4]![3]).toBe(42);
  });

  it("trunca las filas al máximo de columnas de Excel (XFD, 16384)", () => {
    const wide = [0, 1, 2];
    const huge = Array.from({ length: 17000 }, (_, i) => `c${i}`);
    const wb = buildWorkbook([{ name: "Ancha", headers: ["A"], rows: [huge] }]);
    const xml = new TextDecoder().decode(writeWorkbookBuffer(wb));
    // Máximo ref de columna válido: XFD (16384).
    expect(xml).toContain('r="XFD2"');
    expect(xml).not.toContain('r="XFE2"');
    void wide;
  });
});
