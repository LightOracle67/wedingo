/**
 * table-geometry.ts — Geometría y tipos de las mesas de la distribución de
 * asientos, COMPARTIDOS entre el editor del admin (DistribucionTab) y la
 * sección pública de mesas (TableSeatingSection) para que ambas vistas
 * dibujen el plano exactamente igual.
 */

export type TableShape = "circle" | "rect" | "oval" | "square";

export interface ShapeTable {
  id: string;
  name: string;
  shape: TableShape;
  /** Posición del centro en % del mapa (0..100). */
  x: number;
  y: number;
  /** Tamaño en px según lo guardó el admin. */
  w: number;
  h: number;
  rotation: number;
  seats: number;
  /** Invitados confirmados asignados a la mesa. */
  guests: string[];
}

export interface TableSection {
  id: string;
  name: string;
  tables: ShapeTable[];
}

/**
 * Posiciones (%) de las sillas alrededor de la mesa según su forma y plazas.
 * Círculo: sillas en círculo (radio ~46% de la caja). Rectángulo/cuadrado:
 * repartidas por el perímetro. Igual que el editor para que el plano coincida.
 */
export function chairPositions(
  shape: TableShape,
  _w: number,
  _h: number,
  seats: number,
): Array<{ x: number; y: number }> {
  const n = Math.min(Math.max(seats || 0, 0), 24);
  if (n === 0) return [];
  if (shape === "circle" || shape === "oval") {
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      out.push({ x: 50 + Math.cos(ang) * 46, y: 50 + Math.sin(ang) * 46 });
    }
    return out;
  }
  const W = 100;
  const H = 100;
  const P = 2 * (W + H);
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.25 : i / n;
    const d = t * P;
    let x: number;
    let y: number;
    if (d < W) {
      x = d;
      y = 0;
    } else if (d < W + H) {
      x = W;
      y = d - W;
    } else if (d < 2 * W + H) {
      x = 2 * W - d + H;
      y = H;
    } else {
      x = 0;
      y = 2 * (W + H) - d;
    }
    out.push({ x, y });
  }
  return out;
}
