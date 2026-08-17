/**
 * dj-ranking.ts — Export del ranking de canciones para el DJ (encuesta de
 * música de la invitación). Formatea un resumen legible + CSV, blindado
 * contra CSV injection (una canción que empiece por =,+,-,@ no debe ejecutar
 * fórmulas al abrirse en Excel/Sheets).
 */

export interface SongRank {
  guestName: string;
  song: string;
  votes: number;
}

/** TRUE si el texto empieza por un carácter que Excel/Sheets interpreta como
 *  fórmula (=, +, -, @). Se neutraliza con un apóstrofo delante. */
const isCsvInjectionRisk = (value: string) => /^[=+\-@\t\r]/.test(value.trim());

const sanitizeCsvCell = (value: string) => {
  const cleaned = value.replace(/"/g, '""');
  const trimmed = cleaned.trim();
  return isCsvInjectionRisk(trimmed) ? `'${trimmed}` : trimmed;
};

const buildHeader = (sorted: boolean) =>
  `${sorted ? "Top canciones solicitadas (por votos)\n\n" : ""}#,Canción,Invitado,Votos\n`;

/**
 * Construye el CSV del ranking. Las canciones se ordenan por votos (desc) y
 * los campos se sanitizan (comillas dobles y riesgo de fórmula). Las entradas
 * vacías/corruptas se descartan para no exportar filas basura.
 */
export function buildDjRankingCsv(songs: SongRank[]): string {
  const valid = songs
    .filter((s) => typeof s?.song === "string" && s.song.trim().length > 0)
    .map((s, i) => ({
      guestName: typeof s.guestName === "string" ? s.guestName : "",
      song: s.song.trim(),
      votes: Number.isFinite(s.votes) ? s.votes : 0,
      index: i,
    }))
    .sort((a, b) => b.votes - a.votes || a.index - b.index);
  const rows = valid
    .map((s, i) => `${i + 1},"${sanitizeCsvCell(s.song)}","${sanitizeCsvCell(s.guestName)}",${s.votes}`)
    .join("\n");
  return `${buildHeader(true)}${rows}`;
}

/**
 * Resumen de texto plano legible (WhatsApp/notas): mismo orden y seguridad de
 * contenido. Se devuelve una sola string multilínea lista para compartir.
 */
export function buildDjRankingText(songs: SongRank[]): string {
  const valid = songs
    .filter((s) => typeof s?.song === "string" && s.song.trim().length > 0)
    .map((s, i) => ({
      guestName: typeof s.guestName === "string" ? s.guestName : "",
      song: s.song.trim(),
      votes: Number.isFinite(s.votes) ? s.votes : 0,
      index: i,
    }))
    .sort((a, b) => b.votes - a.votes || a.index - b.index);
  if (valid.length === 0) return "";
  const lines = valid.map((s, i) => `${i + 1}. ${s.song} — ${s.guestName} (${s.votes}👍)`);
  return lines.join("\n");
}
