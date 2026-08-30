/**
 * TableSeatingSection — Distribución de mesas para los INVITADOS (diferencial).
 *
 * Muestra el plano de cada zona (sección) con sus mesas, tal y como las dibujó
 * el admin en Distribución. El invitado puede: cambiar de zona, y abrir el
 * plano a PANTALLA COMPLETA (lupa) para ver con detalle las mesas, sus nombres
 * y los invitados asignados a cada una (destacando al propio invitado si no
 * es anónimo).
 *
 * Los datos viven en Firestore: secciones en invitations/{tok}/sections y sus
 * mesas en .../sections/{id}/tables (lectura ya pública por reglas).
 */
import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CornerDecorations from "../../components/CornerDecorations";
import { loadSectionsWithTables } from "../../lib/invitation-subcollections";
import { chairPositions, type ShapeTable, type TableSection } from "../../lib/table-geometry";

/** Mesa individual dibujada en el plano (sillas + cuerpo + nombre). */
function SeatingPlanTable({ tb, highlightName }: { tb: ShapeTable; highlightName?: string | undefined }) {
  const chairs = chairPositions(tb.shape, tb.w, tb.h, tb.seats);
  const isHighlighted = !!highlightName && tb.guests.some((g) => g.trim() === highlightName);
  return (
    <div
      style={{
        position: "absolute",
        left: `${tb.x}%`,
        top: `${tb.y}%`,
        width: `${tb.w}px`,
        height: `${tb.h}px`,
        transform: `translate(-50%, -50%) rotate(${tb.rotation}deg)`,
      }}
    >
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: tb.shape === "rect" || tb.shape === "square" ? "0.35rem" : "50%",
          border: `2px solid ${isHighlighted ? "#ffd166" : "rgba(255,255,255,0.55)"}`,
          boxShadow: isHighlighted ? "0 0 0 3px rgba(255,209,102,0.7)" : "0 6px 16px rgba(0,0,0,0.45)",
          background: "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.1rem",
          zIndex: 2,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "0.72rem", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
          {tb.name}
        </span>
        <span style={{ opacity: 0.9, fontSize: "0.62rem", color: "#fff" }}>
          {tb.guests.length}/{tb.seats}
        </span>
      </div>
    </div>
  );
}

/** Plano de mesas reutilizable (vista embebida y pantalla completa). */
function SeatingPlan({ tables, highlightName }: { tables: ShapeTable[]; highlightName?: string | undefined }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "3/2",
        borderRadius: "1rem",
        overflow: "hidden",
        background: "linear-gradient(160deg, #241c12, #3a2d1c)",
        border: "1px solid var(--invite-shell-border)",
      }}
    >
      {tables.map((tb) => (
        <SeatingPlanTable key={tb.id} tb={tb} highlightName={highlightName} />
      ))}
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
          {null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Distribución de mesas para los invitados: zona + lupa a pantalla completa.
 */
const TableSeatingSection = memo(function TableSeatingSection({
  style,
  className,
  inviteToken,
  guestName,
  cornerDecoration,
}: {
  style?: React.CSSProperties;
  className?: string;
  inviteToken?: string;
  /** Nombre del invitado (para destacar su mesa); opcional/anónimo. */
  guestName?: string;
  cornerDecoration?: string;
}) {
  const { t } = useTranslation();
  const [sections, setSections] = useState<TableSection[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      // Loader compartido y cacheado (v2.185): zonas+mesas en paralelo y una
      // sola lectura por visita (RsvpSection consulta los mismos datos).
      const loaded = await loadSectionsWithTables(inviteToken);
      if (cancelled) return;
      // Se conserva el tipo local (ShapeTable) que ya usaba el componente.
      const list: TableSection[] = loaded.map((s) => ({
        ...s,
        tables: s.tables as ShapeTable[],
      }));
      setSections(list);
      if (list.length > 0) setActiveId((prev) => prev || list[0]!.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const active = useMemo(() => sections.find((s) => s.id === activeId) || null, [sections, activeId]);
  const normalizedGuest = guestName?.trim();

  // Sin zonas con mesas: no se renderiza (equivalente a sin contenido).
  if (sections.length === 0) return null;

  return (
    <section
      data-story-section="tables"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card-wrap">
        <CornerDecorations src={cornerDecoration} />
        <div className="story-card story-panel story-card--tables w-full text-center">
          <p className="story-eyebrow">{t("tables.sectionLabel")}</p>
          <h2 className="story-title">{t("tables.title")}</h2>

          {/* Selector de zona (si hay más de una). */}
          {sections.length > 1 ? (
            <div
              className="admin-flex"
              style={{ gap: "0.4rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "0.6rem" }}
            >
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`setup-button setup-button--ghost setup-button--compact ${s.id === activeId ? "setup-button--primary" : ""}`}
                  onClick={() => setActiveId(s.id)}
                  aria-pressed={s.id === activeId}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ) : null}

          {active ? (
            <>
              <p className="story-note" style={{ margin: "0.2rem 0 0.5rem" }}>
                {active.name}
              </p>
              <SeatingPlan tables={active.tables} {...(normalizedGuest ? { highlightName: normalizedGuest } : {})} />
              {/* Botón "lupa": abre el plano a pantalla completa. */}
              <button
                type="button"
                className="setup-button setup-button--ghost setup-button--compact"
                style={{ marginTop: "0.6rem" }}
                onClick={() => setFullscreen(true)}
              >
                🔍 {t("tables.fullscreen")}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Lupa a pantalla completa ── */}
      {fullscreen && active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("tables.fullscreenTitle", { zone: active.name })}
          onClick={() => setFullscreen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            gap: "0.5rem",
            cursor: "zoom-out",
          }}
        >
          <p style={{ color: "#fff", fontSize: "1rem", fontWeight: 600, margin: 0 }}>{active.name}</p>
          {/* Plano grande: el contenido se escala al ancho disponible. */}
          <div style={{ width: "min(96vw, 900px)" }} onClick={(e) => e.stopPropagation()}>
            <SeatingPlan tables={active.tables} {...(normalizedGuest ? { highlightName: normalizedGuest } : {})} />
          </div>
          <button
            type="button"
            className="setup-button"
            onClick={() => setFullscreen(false)}
            style={{ marginTop: "0.5rem" }}
          >
            {t("common.close")}
          </button>
        </div>
      ) : null}
    </section>
  );
});

export default TableSeatingSection;
