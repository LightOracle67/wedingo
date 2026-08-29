/**
 * Utilidades puras de la pestaña Distribución.
 *
 * Se separan de DistribucionTab las funciones matemáticas y de generación de
 * contenido que no dependen del estado del componente (ni de Firestore), para
 * poder cubrirlas con tests unitarios aislados y que el tab quede como
 * orquestación de Firestore + UI.
 */

/** Mesa a imprimir en una etiqueta (solo necesitamos nombre e invitados). */
export interface LabelTable {
  name: string;
  guests: string[];
}

/** Conjunto de opciones visuales para generar las etiquetas de impresión. */
export interface LabelOptions {
  /** Clave del tema (o vacío) para resolver los colores de fondo y acento. */
  theme: string | undefined;
  /** URL de un fondo opcional para las tarjetas. */
  background?: string;
  /** URL de una esquina decorativa opcional (se repite en las 4 esquinas). */
  cornerDecoration?: string;
}

type Translate = (key: string) => string;

import { THEME_PREVIEW_COLORS } from "../../lib/constants";

/** Acota un valor de posición de mesa al rango [0,100] (porcentaje del lienzo). */
export function clampPercent(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Mesa con hueco disponible para la asignación automática de invitados. */
export interface AssignableTable {
  id: string;
  /** Plazas libres (asientos menos invitados ya asignados). */
  slots: number;
}

/**
 * Asigna invitados a mesas con hueco de forma equitativa (round-robin).
 * @param guests Nombres de invitados sin mesa asignada.
 * @param tables Mesas con plazas libres (ya filtradas y ordenadas de más a menos).
 * @returns Mapa mesa→nombres asignados, en el orden de reparto.
 */
export function assignGuestsToTables(
  guests: string[],
  tables: AssignableTable[],
): Record<string, string[]> {
  const byTable = new Map<string, string[]>();
  let cursor = 0;
  for (const g of guests) {
    // Busca la siguiente mesa con hueco a partir del cursor (round-robin);
    // si no queda ninguna, se detiene.
    const withSlot =
      tables.find((f, idx) => idx >= cursor && (byTable.get(f.id)?.length ?? 0) < f.slots) ??
      tables.find((f) => (byTable.get(f.id)?.length ?? 0) < f.slots);
    if (!withSlot) break;
    const list = byTable.get(withSlot.id) || [];
    list.push(g);
    byTable.set(withSlot.id, list);
    cursor = (tables.indexOf(withSlot) + 1) % tables.length;
  }
  return Object.fromEntries(byTable);
}

/** Colores por defecto (clave "golden") cuando el tema no está en el mapa. */
const FALLBACK_COLORS = { accent: "#d8b24a", bg: "#2a2418" };

/**
 * Escapa la interpolación HTML: las comillas y el `<` se sustituyen por sus
 * entidades para no romper el atributo `style`/`src` ni inyectar marcado.
 */
const esc = (v: string): string =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Construye el HTML de la etiqueta de impresión de un juego de mesas.
 * @param tables Mesas con invitados asignados (solo se imprimen las que tienen
 *   al menos un invitado).
 * @param options Tema, fondo y esquina decorativa opcionales.
 * @param t Traductor (devuelve la clave íntegra si no hay traducción).
 * @returns Documento HTML completo con una tarjeta por invitado.
 */
export function buildLabelsHtml(
  tables: LabelTable[],
  options: LabelOptions,
  t: Translate,
): string {
  const withGuests = tables.filter((tb) => tb.guests.length > 0);
  const themeColors =
    THEME_PREVIEW_COLORS[options.theme || ""] ||
    THEME_PREVIEW_COLORS["golden"] ||
    FALLBACK_COLORS;
  const { accent, bg } = themeColors;
  const corner = options.cornerDecoration
    ? `<img src="${esc(options.cornerDecoration)}" alt="" class="lbl-corner lbl-corner--tl"/>
       <img src="${esc(options.cornerDecoration)}" alt="" class="lbl-corner lbl-corner--tr"/>
       <img src="${esc(options.cornerDecoration)}" alt="" class="lbl-corner lbl-corner--bl"/>
       <img src="${esc(options.cornerDecoration)}" alt="" class="lbl-corner lbl-corner--br"/>`
    : `<span class="lbl-corner lbl-corner--tl"></span>
       <span class="lbl-corner lbl-corner--tr"></span>
       <span class="lbl-corner lbl-corner--bl"></span>
       <span class="lbl-corner lbl-corner--br"></span>`;
  const bgImg = options.background
    ? `<img src="${esc(options.background)}" alt="" class="lbl-bg"/>`
    : "";
  const cardStyle = `background-color:${bg}${options.background ? `;background-image:url("${esc(options.background)}")` : ""}`;
  const thanks = esc(t("distribucion.labelThanks"));
  const enjoy = esc(t("distribucion.labelEnjoy"));
  const pages = withGuests.flatMap((tb) =>
    tb.guests.map(
      (g) => `<div class="lbl-page">
        <div class="lbl-card" style="${cardStyle}">
          ${bgImg}
          ${corner}
          <div class="lbl-text">
            <p class="lbl-guest">${esc(g)}</p>
            <p class="lbl-table" style="color:${accent}">${esc(tb.name)}</p>
            <p class="lbl-thanks">${thanks}</p>
            <p class="lbl-enjoy">${enjoy}</p>
          </div>
        </div>
      </div>`,
    ),
  );
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(t("distribucion.printTitle"))}</title><style>
    @page{size:A4 portrait;margin:0}
    *{box-sizing:border-box}
    body{margin:0;font-family:Georgia,'Times New Roman',serif}
    .lbl-page{width:210mm;height:297mm;display:grid;place-items:center;page-break-after:always;background:#fff;padding:14mm}
    .lbl-page:last-child{page-break-after:auto}
    .lbl-card{position:relative;width:min(78%,38rem);aspect-ratio:2/3;background-size:cover;background-position:center;border-radius:1.2rem;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.35)}
    .lbl-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;image-rendering:auto;filter:blur(.4px)}
    .lbl-scrim{position:absolute;inset:0;background:transparent;z-index:1;pointer-events:none}
    .lbl-corner{position:absolute;width:60px;height:60px;z-index:2;opacity:.9}
    .lbl-corner--tl{top:10px;left:10px}
    .lbl-corner--tr{top:10px;right:10px;transform:scaleX(-1)}
    .lbl-corner--bl{bottom:10px;left:10px;transform:scaleY(-1)}
    .lbl-corner--br{bottom:10px;right:10px;transform:scale(-1)}
    .lbl-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.45rem;text-align:center;padding:1.6rem;z-index:3;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.9),0 0 26px rgba(0,0,0,.55)}
    .lbl-guest{margin:0;font-family:'Great Vibes',Georgia,cursive;font-size:clamp(2rem,9vw,3.2rem);line-height:1.1}
    .lbl-table{margin:0;font-size:clamp(1rem,4.4vw,1.35rem);letter-spacing:.06em;text-transform:uppercase;opacity:.95}
    .lbl-thanks{margin:1rem 0 0;font-size:clamp(.85rem,3.4vw,1rem);font-style:italic;opacity:.95}
    .lbl-enjoy{margin:0;font-size:clamp(.85rem,3.4vw,1rem);font-style:italic;opacity:.9}
    @media print{.lbl-scrim{background:transparent !important}}
  </style></head><body>${pages.join("")}</body></html>`;
}
