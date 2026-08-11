/**
 * excel-utils — Exportación a XLSX (Excel/LibreOffice/Google Sheets/Numbers).
 *
 * El formato XLSX es el estándar de Excel y lo abren todos los visores de
 * hojas de cálculo de escritorio y móviles, por lo que el fichero exportado se
 * ve correctamente en cualquier dispositivo. Se generan hojas con cabecera,
 * anchos de columna legibles y valores tipados (texto, número, booleano).
 */
import * as XLSX from "xlsx";

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

/** Convierte un Date a una cadena "dd/mm/yyyy hh:mm" legible en cualquier visor. */
export function excelDate(value: Date | string | number | undefined): string {
  if (!value) return "";
  const d = typeof value === "object" ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Genera y descarga un fichero .xlsx con una o varias hojas.
 * @param filename Nombre del fichero (sin extensión).
 * @param sheets    Hojas a incluir (ordenadas).
 */
export function exportToXlsx(filename: string, sheets: ExcelSheet[]): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    if (sheet.rows.length === 0 && sheet.headers.length === 0) continue;
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    // Anchos de columna para que el contenido sea legible sin reajustar.
    if (sheet.colWidths && sheet.colWidths.length > 0) {
      ws["!cols"] = sheet.colWidths.map((wch) => ({ wch: Math.max(wch, 8) }));
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  if (wb.SheetNames.length === 0) return;
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
