/**
 * Tests de geometría de mesas (chairPositions): función PURA compartida por
 * el editor admin (DistribucionTab) y la sección pública de mesas. Se cubren:
 * el clamp de plazas (0/negativas → vacío, >24 → tope), el trazado circular
 * para circle/oval (radio ~46% centrado en 50,50) y el reparto por perímetro
 * de rectángulo/cuadrado con sus cuatro tramos (arriba, derecha, abajo,
 * izquierda) incluido el caso de una sola silla (t fijo 0.25).
 */
import { describe, expect, it } from "vitest";
import { chairPositions } from "../table-geometry";

describe("chairPositions", () => {
  it("devuelve vacío con 0 sillas y clampea negativas", () => {
    // Sin sillas no hay posiciones; las plazas negativas se clampean a 0.
    expect(chairPositions("rect", 80, 80, 0)).toEqual([]);
    expect(chairPositions("circle", 80, 80, -3)).toEqual([]);
  });

  it("clampea el tope superior a 24 sillas", () => {
    // Más de 24 comensales no genera más de 24 puntos (evita solapes extremos).
    expect(chairPositions("circle", 90, 90, 99)).toHaveLength(24);
  });

  it("reparte las sillas en círculo alrededor del centro (50,50)", () => {
    // Radio 46%: la primera silla cae a la derecha del centro (96,50).
    const pts = chairPositions("oval", 100, 100, 6);
    expect(pts).toHaveLength(6);
    const first = pts[0]!;
    expect(first.x).toBeCloseTo(96, 5);
    expect(first.y).toBeCloseTo(50, 5);
    // Todas las sillas quedan a distancia ~46 del centro.
    for (const p of pts) {
      const dist = Math.hypot(p.x - 50, p.y - 50);
      expect(dist).toBeCloseTo(46, 5);
    }
  });

  it("reparte las sillas por el perímetro del rectángulo (cuatro tramos)", () => {
    // Con W=H=100 y P=400, 16 sillas recorren arriba→derecha→abajo→izquierda.
    const pts = chairPositions("rect", 120, 60, 16);
    expect(pts).toHaveLength(16);
    // Tramo superior: primeras ~4 sillas con y=0.
    expect(pts[0]).toMatchObject({ x: 0, y: 0 });
    expect(pts[3]).toMatchObject({ x: 75, y: 0 });
    // Tramo derecho: y avanza con x=100.
    expect(pts[4]).toMatchObject({ x: 100, y: 0 });
    expect(pts[7]).toMatchObject({ x: 100, y: 75 });
    // Tramo inferior: x retrocede con y=100.
    expect(pts[8]).toMatchObject({ x: 100, y: 100 });
    // Tramo izquierdo: x=0 al final del recorrido.
    expect(pts[15]).toMatchObject({ x: 0, y: 25 });
  });

  it("con una sola silla usa el ángulo fijo t=0.25 (cuarto del perímetro)", () => {
    // Caso especial anti-división por cero: d=0.25·P=100 cae al inicio del
    // tramo derecho del perímetro (x=W=100, y=0).
    expect(chairPositions("square", 70, 70, 1)).toEqual([{ x: 100, y: 0 }]);
  });
});
