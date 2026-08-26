/**
 * excel-utils — Exportación a XLSX (Excel/LibreOffice/Google Sheets/Numbers).
 *
 * El formato XLSX es el estándar de Excel y lo abren todos los visores de
 * hojas de cálculo de escritorio y móviles. Se generan hojas con cabecera,
 * anchos de columna legibles y valores tipados (texto, número, booleano).
 *
 * Seguridad: NO se depende de la librería `xlsx` (SheetJS), que arrastra dos
 * avisos de alta severidad sin fix (prototype pollution GHSA-4r6h-8v6p-xvw6 y
 * ReDoS GHSA-5pgg-2g8v-p4x9 en el parseo). Esta app solo GENERA xlsx a partir
 * de datos propios (nunca parsea archivos no confiables), así que el escritor
 * es un ZIP (método store) con las partes XML del formato OOXML SpreadsheetML
 * escrito a mano: ~2KB gzip en el chunk lazy frente a ~90KB de xlsx y cero
 * superficie de ataque. `xlsx` se mantiene SOLO como devDependency para que
 * los tests reabran el fichero generado y verifiquen que es válido.
 */
export interface ExcelSheet {
  /** Nombre de la hoja (Excel limita a 31 caracteres). */
  name: string;
  /** Cabeceras de columna. */
  headers: string[];
  /** Filas de datos (valores tipados). */
  rows: Array<Array<string | number | boolean | Date | null | undefined>>;
  /** Anchos de columna en caracteres (opcional). */
  colWidths?: number[];
}

/** Libro de trabajo: hojas ya filtradas (sin vacías) y con nombre ≤31 chars. */
interface ExcelWorkbook {
  sheets: ExcelSheet[];
}

/** Convierte un Date a una cadena "dd/mm/yyyy hh:mm" legible en cualquier visor. */
export function excelDate(value: Date | string | number | undefined): string {
  if (!value) return "";
  const d = typeof value === "object" ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Construye el libro de trabajo a partir de las hojas (sin serializar).
 * Función pura: se usa desde exportToXlsx y desde los tests.
 * Se OMITEN las hojas sin filas de datos (aunque tengan cabecera) para que
 * una exportación sin datos nunca genere un fichero vacío o con solo cabecera.
 */
export function buildWorkbook(sheets: ExcelSheet[]): ExcelWorkbook {
  return {
    sheets: sheets.filter((s) => s.rows.length > 0).map((s) => ({ ...s, name: s.name.slice(0, 31) })),
  };
}

// ── Escritor OOXML/SpreadsheetML mínimo ─────────────────────────────

/** Codifica UTF-8 de forma nativa (TextEncoder en navegador y Node ≥11). */
function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Escapa texto para un elemento XML y elimina caracteres de control ilegales
 *  en XML 1.0 (\x00-\x08, \x0B, \x0C, \x0E-\x1F), que romperían el fichero. */
function escXml(v: string): string {
  return (
    v
      // eslint-disable-next-line no-control-regex -- sanitización intencional: elimina los caracteres de control ilegales en XML 1.0.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  );
}

/** Convierte un índice de columna (0-based) a la letra de la hoja (A, B, …, Z, AA…). */
function colLetter(n: number): string {
  let s = "";
  let i = n + 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

/** Serializa UNA celda con su tipo (número, booleano, texto inline o vacía). */
function cellXml(ref: string, value: string | number | boolean | Date | null | undefined): string {
  if (value === null || value === undefined) return `<c r="${ref}"/>`;
  if (typeof value === "number") {
    // NaN/Infinity no son números válidos en un XLSX: se emiten vacías en vez
    // de escribir <v>NaN</v> (rompería el XML y abriría con error en Excel).
    if (!Number.isFinite(value)) return `<c r="${ref}"/>`;
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  // Los Date se formatean como texto legible (los builders ya pasan excelDate).
  const text = typeof value === "object" ? excelDate(value) : String(value);
  return `<c r="${ref}" t="inlineStr"><is><t>${escXml(text)}</t></is></c>`;
}

/** Límite de columnas de Excel (XFD): las filas más anchas se truncan. */
const MAX_COLS = 16384;

/** XML de una hoja: columnas (anchos), cabecera y filas de datos. */
function sheetXml(sheet: ExcelSheet): string {
  const cols = (sheet.colWidths || [])
    .slice(0, MAX_COLS)
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(w, 8)}" customWidth="1"/>`)
    .join("");
  const colsXml = cols ? `<cols>${cols}</cols>` : "";
  const headerRow = sheet.headers
    .slice(0, MAX_COLS)
    .map((h, i) => cellXml(`${colLetter(i)}1`, h))
    .join("");
  const dataRows = sheet.rows
    .map((row, r) => {
      const cells = row
        .slice(0, MAX_COLS)
        .map((v, i) => cellXml(`${colLetter(i)}${r + 2}`, v))
        .join("");
      return `<row r="${r + 2}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${colsXml}<sheetData><row r="1">${headerRow}</row>${dataRows}</sheetData></worksheet>`;
}

/** CRC-32 (IEEE 802.3) sobre un buffer: requisito del ZIP. */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] ?? 0;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Empaqueta entradas en un ZIP sin compresión (método STORE, válido en OOXML). */
function zipStore(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const body: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = utf8(e.name);
    const crc = crc32(e.data);
    // Cabecera local (30 bytes).
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // versión necesaria
    local.setUint16(6, 0x0800, true); // flag UTF-8
    local.setUint16(8, 0, true); // método: store
    local.setUint16(10, 0, true); // hora
    local.setUint16(12, 0x21, true); // fecha DOS (1980-01-01)
    local.setUint32(14, crc, true);
    local.setUint32(18, e.data.length, true);
    local.setUint32(22, e.data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true); // extra length
    body.push(new Uint8Array(local.buffer), name, e.data);
    // Entrada del directorio central (46 bytes).
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true); // versión made by
    cd.setUint16(6, 20, true); // versión necesaria
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, 0, true);
    cd.setUint16(14, 0x21, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, e.data.length, true);
    cd.setUint32(24, e.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint16(30, 0, true); // extra
    cd.setUint16(32, 0, true); // comment
    cd.setUint16(34, 0, true); // disk
    cd.setUint16(36, 0, true); // attrs internos
    cd.setUint32(38, 0, true); // attrs externos
    cd.setUint32(42, offset, true); // offset de la cabecera local
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + e.data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const cdOffset = body.reduce((a, b) => a + b.length, 0);
  // Fin del directorio central (22 bytes).
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, cdOffset, true);
  eocd.setUint16(20, 0, true);
  const all = [...body, ...central, new Uint8Array(eocd.buffer)];
  const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let pos = 0;
  for (const part of all) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

/**
 * Serializa el libro de trabajo a los bytes de un fichero .xlsx válido.
 * Estructura OOXML: [Content_Types].xml, _rels/.rels, xl/workbook.xml,
 * xl/_rels/workbook.xml.rels y xl/worksheets/sheetN.xml.
 */
export function writeWorkbookBuffer(wb: ExcelWorkbook): Uint8Array {
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    wb.sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("") +
    `</Types>`;
  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;
  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    wb.sheets.map((s, i) => `<sheet name="${escXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
    `</sheets></workbook>`;
  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    wb.sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("") +
    `</Relationships>`;
  const entries = [
    { name: "[Content_Types].xml", data: utf8(contentTypes) },
    { name: "_rels/.rels", data: utf8(rootRels) },
    { name: "xl/workbook.xml", data: utf8(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels", data: utf8(workbookRels) },
    ...wb.sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: utf8(sheetXml(s)) })),
  ];
  return zipStore(entries);
}

/**
 * Genera y descarga un fichero .xlsx con una o varias hojas.
 * @param filename Nombre del fichero (sin extensión).
 * @param sheets    Hojas a incluir (ordenadas).
 */
export function exportToXlsx(filename: string, sheets: ExcelSheet[]): void {
  const wb = buildWorkbook(sheets);
  if (wb.sheets.length === 0) return;
  const bytes = writeWorkbookBuffer(wb);
  // Copia el buffer como ArrayBuffer plano (BlobPart exige ArrayBufferView<ArrayBuffer>).
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([copy], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
