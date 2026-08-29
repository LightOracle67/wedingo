import { forwardRef } from "react";
import type { TFunction } from "i18next";
import { chairPositions } from "../../lib/table-geometry";

/** Forma de mesa soportada por la cuadrícula (misma unión que DistribucionTab). */
type CanvasShape = "circle" | "rect" | "oval" | "square";

/** Tipo de mesa de la cuadrícula de la pestaña Distribución. */
export interface CanvasTable {
  id: string;
  name: string;
  shape: CanvasShape;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  seats: number;
  guests: string[];
}

/** Props del visualizador interactivo de mesas (canvas de la sección activa). */
interface TableCanvasProps {
  /** Mesas que se dibujan dentro de la sección activa. */
  tables: CanvasTable[];
  /** Id de la mesa seleccionada (para resaltar borde y borrador). */
  selectedId: string | null;
  /** Inicio del arrastre con puntero (mouse/táctil). */
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  /** Arrastre en curso sobre el lienzo. */
  onPointerMove: (e: React.PointerEvent) => void;
  /** Fin del arrastre (soltar puntero). */
  onPointerUp: (e: React.PointerEvent) => void;
  /** Borrar la mesa seleccionada. */
  onDeleteTable: (id: string) => void;
  /** Mover la selección con el teclado. */
  onMoveSelectedByKey: (e: React.KeyboardEvent, id: string) => void;
  /** Mensaje vacío cuando no hay mesas. */
  emptyMapLabel: string;
  /** Traductor de la interfaz (acepta opciones para interpolación). */
  t: TFunction;
}

/**
 * Visualizador interactivo de mesas de la pestaña Distribución.
 *
 * Subcomponente de presentación puro: dibuja cada mesa con sus sillas y su
 * nombre, permite seleccionarla/arrastrarla y muestra el borrador cuando está
 * seleccionada. No accede a Firestore ni al estado global, solo recibe las
 * mesas y los callbacks de interacción para reducir el monolítico
 * DistribucionTab y testear la UI de forma aislada. Exponer la ref del div
 * permite al padre calcular los límites del arrastre (getBoundingClientRect).
 */
export const TableCanvas = forwardRef<HTMLDivElement, TableCanvasProps>(function TableCanvas(
  {
    tables,
    selectedId,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDeleteTable,
    onMoveSelectedByKey,
    emptyMapLabel,
    t,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className="distribucion-map"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: "relative",
        flex: 1,
        width: "100%",
        minHeight: "24rem",
        borderRadius: "1rem",
        overflow: "hidden",
        background: "linear-gradient(160deg, #241c12, #3a2d1c)",
        border: "1px solid var(--setup-border)",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {tables.map((tb) => {
        // Maquetación: sillas alrededor de la mesa según su forma y nº de plazas.
        const chairs = chairPositions(tb.shape, tb.w, tb.h, tb.seats);
        return (
          <div
            key={tb.id}
            data-table-id={tb.id}
            role="button"
            tabIndex={0}
            aria-label={t("distribucion.tableAccessible", { name: tb.name })}
            onPointerDown={(e) => onPointerDown(e, tb.id)}
            onKeyDown={(e) => onMoveSelectedByKey(e, tb.id)}
            style={{
              position: "absolute",
              left: `${tb.x}%`,
              top: `${tb.y}%`,
              width: `${tb.w}px`,
              height: `${tb.h}px`,
              transform: `translate(-50%, -50%) rotate(${tb.rotation}deg)`,
              cursor: "grab",
            }}
          >
            {selectedId === tb.id ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTable(tb.id);
                }}
                title={t("distribucion.deleteTable")}
                aria-label={t("distribucion.deleteTable")}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  zIndex: 3,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#ef4444",
                  color: "#fff",
                  border: 0,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  lineHeight: 1,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                }}
              >
                ✕
              </button>
            ) : null}
            {/* Sillas alrededor */}
            {chairs.map((c, i) => (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  width: 11,
                  height: 11,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.35)",
                  border: "1px solid rgba(255,255,255,0.5)",
                  zIndex: 1,
                }}
              />
            ))}
            {/* Cuerpo de la mesa */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: tb.shape === "rect" || tb.shape === "square" ? "0.35rem" : "50%",
                border: `2px solid ${selectedId === tb.id ? "var(--setup-accent)" : "rgba(255,255,255,0.55)"}`,
                background: "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
                boxShadow: selectedId === tb.id ? "0 0 0 3px var(--setup-accent)" : "0 6px 16px rgba(0,0,0,0.45)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.1rem",
                zIndex: 2,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  color: "#fff",
                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                }}
              >
                {tb.name}
              </span>
              <span style={{ opacity: 0.9, fontSize: "0.62rem", color: "#fff" }}>
                {tb.guests.length}/{tb.seats}
              </span>
            </div>
          </div>
        );
      })}
      {tables.length === 0 ? (
        <p
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.85rem",
            margin: 0,
          }}
        >
          {emptyMapLabel}
        </p>
      ) : null}
    </div>
  );
});
