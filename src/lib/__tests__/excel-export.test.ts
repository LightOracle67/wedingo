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
  buildTablesSheet,
  buildMetricsSheet,
  buildGlobalGuestsSheet,
  buildRsvpSheet,
  buildAuditSheet,
  type Translate,
} from "../excel-builders";

/** t() de prueba: traduce las claves conocidas, deja el resto tal cual e interpola {{count}}. */
const t = ((key: string, options?: Record<string, unknown>): string => {
  const map: Record<string, string> = {
    "attendance.sheetAttendance": "Asistencia",
    "attendance.sheetMenus": "Menús",
    "attendance.attendingValue": "Sí",
    "attendance.notAttendingValue": "No",
    "attendance.tableName": "Nombre",
    "attendance.tableAttendance": "Asistencia",
    "attendance.tableMenu": "Menú",
    "attendance.tableDiet": "Intolerancias",
    "attendance.tableTransport": "Transporte",
    "attendance.tableChildrenDiet": "Intolerancias (Niños)",
    "attendance.childrenYes": "Sí, {{count}}",
    "attendance.transportOwnCar": "Coche propio",
    "rsvp.menuPredefined": "Predefinido",
    "transport.typeBus": "Autobús",
    "transport.typeTaxi": "Taxi",
    "attendance.tableChild": "Niño",
    "attendance.childYes": "Sí",
    "attendance.tableContact": "Contacto",
    "attendance.tableDate": "Fecha",
    "rsvp.menuCarne": "Carne",
    "rsvp.menuPescado": "Pescado",
    "rsvp.menuVegano": "Vegano",
    "tools.sheetGuests": "Invitados",
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
  const value = map[key] ?? key;
  // Interpola {{count}} para childrenYes (el t real de i18next lo hace igual).
  if (options && Object.keys(options).length > 0) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(options[k] ?? ""));
  }
  return value;
}) as unknown as Translate;

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
      "attendance.tableAccompanies",
      "Asistencia",
      "Menú",
      "Intolerancias",
      "attendance.tableChildren",
      "Intolerancias (Niños)",
      "Transporte",
      "attendance.tableConsents",
      "Fecha",
    ]);
  });

  it("devuelve todos los campos del confirmado traducidos y con fecha dd/mm/aaaa hh:mm", () => {
    const row = sheets[0]!.data[1]!;
    expect(row).toEqual([
      "Ana, la novia",
      "",
      "Sí",
      "Carne",
      "sin gluten | menú: infantil",
      "",
      "",
      "Autobús",
      "",
      "01/08/2026 10:00",
    ]);
  });

  it("declinado queda como No y conserva el plato que eligió", () => {
    const row = sheets[0]!.data[2]!;
    expect(row[2]).toBe("No");
    expect(row[3]).toBe("Pescado");
  });

  it("muestra acompañamiento, niños del principal y consentimientos", () => {
    const sheet = readBack([
      buildRSVPSheet(
        [
          {
            guestName: "Gonzalo",
            attendance: "yes",
            mainGuestName: "Elisa",
            mealChoice: "vegano",
            childrenCount: 2,
            childrenAllergies: ["sin gluten"],
            childrenAllergiesOther: "frutos secos",
            transportMode: "taxi",
            healthConsent: true,
            submittedAt: "2026-08-02T09:00:00",
          },
        ],
        t,
      ),
    ]);
    const row = sheet[0]!.data[1]!;
    // Acompaña a, niños, intolerancias y consentimientos ahora se exportan.
    expect(row[1]).toBe("Elisa");
    expect(row[5]).toBe("Sí, 2");
    expect(row[6]).toBe("sin gluten, frutos secos");
    expect(row[7]).toBe("Taxi");
    expect(row[8]).toBe("attendance.consentHealth");
  });

  it("fila sin respuesta queda vacía en asistencia/menú", () => {
    const row = sheets[0]!.data[3]!;
    expect(row[2]).toBe("");
    expect(row[3]).toBe("");
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
            submittedAt: "2026-08-01",
          },
          { inviteToken: "OTRO", guestName: "Intruso", attendance: "yes" },
        ],
      },
    ]),
  ])[0]!;

  it("filtra respuestas de otras invitaciones y une menús y alergias", () => {
    expect(sheet.data).toEqual([
      ["Token", "Invitación", "Nombre", "Asistencia", "Menú", "Alergias", "Fecha"],
      ["TOK1", "Ana García", "Ana", "yes", "carne; pescado", "sin gluten", "2026-08-01"],
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

/**
 * Ramas límite de los builders: cada combinación de ternarios/guardas que la
 * suite previa no ejercitaba. Son tests de caracterización: fijan el
 * comportamiento observable actual (incluidos los "camino feliz vacío") para
 * que el umbral global de ramas del proyecto tenga cobertura real detrás.
 */
describe("Ramas límite de los builders", () => {
  it("RSVP: asistencia indefinida, modo propio, niño, contactos parciales y menú sin traducción", () => {
    const sheet = buildRSVPSheet(
      [
        // attendance ni yes/no → celda vacía; transportMode undefined; sin niño.
        { guestName: "A", mealChoice: "", dietaryInfo: "", submittedAt: null as unknown as string },
        // attendance no + transportMode "own" → sin sufijo de transporte.
        {
          guestName: "B",
          attendance: "no",
          mealChoice: "",
          transportChoice: "Coche",
          transportMode: "own",
        },
        // attendance yes + bus → "Autobús"; menú desconocido → crudo; con fecha.
        {
          guestName: "C",
          attendance: "yes",
          mealChoice: "pollo",
          transportMode: "bus",
          submittedAt: "2026-08-24T10:00:00Z",
        },
      ],
      t,
    );
    // 10 columnas: nombre, acompaña, asistencia, menú, dieta, niños,
    // intolerancias, transporte, consentimientos, fecha.
    expect(sheet.rows[0]).toEqual(["A", "", "", "", "", "", "", "", "", ""]);
    expect(sheet.rows[1]?.[2]).toBe("No");
    expect(sheet.rows[1]?.[7]).toBe("Coche propio");
    expect(sheet.rows[2]?.[2]).toBe("Sí");
    expect(sheet.rows[2]?.[3]).toBe("pollo");
    expect(sheet.rows[2]?.[7]).toBe("Autobús");
    expect(String(sheet.rows[2]?.[9])).not.toBe("");
  });

  it("Menús: declinados fuera, asistentes expanden, mealChoice como respaldo y sin plato", () => {
    const sheet = buildMenuSheet(
      [
        { guestName: "Declina", attendance: "no" },
        { guestName: "ConAcomp", attendance: "yes", attendees: [{ name: "Hijo", menu: "vegano" }] },
        { guestName: "SoloPlato", attendance: "yes", mealChoice: "carne" },
        { guestName: "Nada", attendance: "yes" },
      ],
      t,
    );
    expect(sheet.rows).toEqual([
      ["Hijo", "Vegano"],
      ["SoloPlato", "Carne"],
    ]);
  });

  it("Mesas: sección inexistente, mesa vacía y varias asignaciones", () => {
    const sheet = buildTablesSheet(
      [{ id: "s1", name: "Salón" }],
      "sINEXISTENTE",
      [
        { name: "M1", shape: "square", w: 90, h: 90, seats: 8, guests: [] },
        { name: "M2", shape: "round", w: undefined as unknown as number, h: 80, seats: 4, guests: ["Ana", "Beto"] },
      ],
      t,
    );
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[0]?.[0]).toBe("");
    expect(sheet.rows[0]?.[3]).toBe("90×90");
    expect(sheet.rows[1]?.[3]).toBe("×80");
    expect(sheet.rows[2]?.[5]).toBe("Beto");
  });

  it("Invitados globales: filtro por token, menús de asistentes y alergias alternativas", () => {
    const invite = {
      id: "T1",
      firstName: "Ana",
      secondName: "Beta",
      adminUsername: "ad",
      weddingDateLabel: "01/01/2026",
      visits: 3,
      rsvpCount: 2,
      confirmed: 1,
      companions: 1,
      conversion: 50,
    };
    const sheet = buildGlobalGuestsSheet([
      {
        invite,
        rsvps: [
          { inviteToken: "OTRO", guestName: "Fuera" },
          {
            inviteToken: "T1",
            guestName: "Uno",
            attendance: "yes",
            attendees: [{ menu: "carne" }, {}],
            allergiesOther: ["Nueces"],
          },
          {
            inviteToken: "T1",
            guestName: "Dos",
            attendance: "no",
            mealChoice: "pescado",
            dietaryInfo: "sin sal",
            submittedAt: "hoy",
          },
        ],
      },
    ]);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[0]?.[2]).toBe("Uno");
    expect(sheet.rows[0]?.[4]).toBe("carne; ");
    expect(sheet.rows[0]?.[5]).toBe("Nueces");
    expect(sheet.rows[1]?.[4]).toBe("pescado");
    expect(sheet.rows[1]?.[5]).toBe("sin sal");
  });

  it("Fecha RSVP: nulos, Timestamp por segundos, toDate(), epoch e inválidos", () => {
    const toDate = () => new Date("2026-03-05T00:00:00Z");
    const sheet = buildRsvpSheet("X", [
      { guestName: "nulo" },
      { guestName: "secs", companionCount: "2", submittedAt: { seconds: 1770000000 } },
      { guestName: "toDate", submittedAt: { toDate } },
      { guestName: "epoch", submittedAt: new Date("2026-01-02T00:00:00Z").getTime() },
      { guestName: "malNum", submittedAt: Number.NaN },
      { guestName: "textoMal", submittedAt: "no-fecha" },
    ]);
    expect(sheet.rows[0]?.[5]).toBe("");
    expect(sheet.rows[0]?.[2]).toBe(0);
    expect(sheet.rows[1]?.[2]).toBe(2);
    expect(String(sheet.rows[1]?.[5])).not.toBe("");
    expect(String(sheet.rows[2]?.[5])).not.toBe("");
    expect(String(sheet.rows[3]?.[5])).not.toBe("");
    // Accesos indexados con ?. porque noUncheckedIndexedAccess tipa las celdas
    // como posiblemente undefined (fila/columna fuera de rango en runtime).
    expect(sheet.rows[4]?.[5]).toBe("");
    expect(sheet.rows[5]?.[5]).toBe("");
  });

  it("Auditoría: mapea acción/detalle/fecha tal cual", () => {
    const sheet = buildAuditSheet([{ action: "login", detail: "sesión creada", ts: "ayer" }]);
    expect(sheet.rows).toEqual([["login", "sesión creada", "ayer"]]);
  });
});
