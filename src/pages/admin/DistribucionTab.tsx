/**
 * DistribucionTab — Mapa interactivo de mesas y zonas (diferencial).
 *
 * El admin dibuja el plano del recinto: crea ZONAS (áreas con color) y MESAS
 * con forma (círculo, rectángulo, óvalo, cuadrado) que arrastra por el mapa,
 * ajusta tamaño/rotación y asigna invitados. Los datos viven en las
 * subcolecciones `zones` y `shapedtables` (lectura pública, escritura admin).
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { getDocs, collection, doc, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";

type Shape = "circle" | "rect" | "oval" | "square";

interface Zone {
  id: string;
  name: string;
  color: string;
}

interface ShapeTable {
  id: string;
  name: string;
  shape: Shape;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  zoneId: string;
  seats: number;
  guests: string[];
}

const ZONE_COLORS = ["#d8b24a", "#7fb3d5", "#9fdc9a", "#f5a8a8", "#d6a2e0", "#f7c873"];
const SHAPES: Array<{ key: Shape; label: string }> = [
  { key: "circle", label: "Círculo" },
  { key: "rect", label: "Rectángulo" },
  { key: "oval", label: "Óvalo" },
  { key: "square", label: "Cuadrado" },
];

const DistribucionTab = memo(function DistribucionTab({ inviteToken }: { inviteToken: string }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<ShapeTable[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [newShape, setNewShape] = useState<Shape>("rect");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);

  const zonesRef = useCallback(() => collection(db, "invitations", inviteToken, "zones"), [inviteToken]);
  const tablesRef = useCallback(() => collection(db, "invitations", inviteToken, "shapedtables"), [inviteToken]);

  const load = useCallback(async () => {
    try {
      const [zSnap, tSnap] = await Promise.all([getDocs(zonesRef()), getDocs(tablesRef())]);
      setZones(zSnap.docs.map((d) => ({ id: d.id, name: String(d.data().name || ""), color: String(d.data().color || "#d8b24a") })));
      setTables(
        tSnap.docs.map((d) => ({
          id: d.id,
          name: String(d.data().name || ""),
          shape: (String(d.data().shape || "rect") as Shape),
          x: Number(d.data().x) || 0,
          y: Number(d.data().y) || 0,
          w: Number(d.data().w) || 10,
          h: Number(d.data().h) || 8,
          rotation: Number(d.data().rotation) || 0,
          zoneId: String(d.data().zoneId || ""),
          seats: Number(d.data().seats) || 0,
          guests: Array.isArray(d.data().guests) ? (d.data().guests as string[]) : [],
        })),
      );
    } catch {
      /* datos no disponibles */
    }
  }, [zonesRef, tablesRef]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Zonas ──
  const addZone = useCallback(async () => {
    const name = newZoneName.trim();
    if (!name) return;
    try {
      const color = ZONE_COLORS[zones.length % ZONE_COLORS.length]!;
      const ref = await addDoc(zonesRef(), { name: name.slice(0, 80), color, createdAt: new Date().toISOString() });
      setZones((prev) => [...prev, { id: ref.id, name: name.slice(0, 80), color }]);
      setNewZoneName("");
      addToast("success", t("distribucion.zoneAdded"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [newZoneName, zones.length, zonesRef, addToast, t]);

  const deleteZone = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(zonesRef(), id));
        setZones((prev) => prev.filter((z) => z.id !== id));
        setTables((prev) => prev.map((tb) => (tb.zoneId === id ? { ...tb, zoneId: "" } : tb)));
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [zonesRef, addToast, t],
  );

  // ── Mesas ──
  const addTable = useCallback(async () => {
    try {
      const ref = await addDoc(tablesRef(), {
        name: t("distribucion.defaultTable"),
        shape: newShape,
        x: 50,
        y: 50,
        w: newShape === "circle" || newShape === "square" ? 12 : 14,
        h: newShape === "circle" || newShape === "square" ? 12 : 8,
        rotation: 0,
        zoneId: "",
        seats: 8,
        guests: [],
        createdAt: new Date().toISOString(),
      });
      setTables((prev) => [
        ...prev,
        {
          id: ref.id,
          name: t("distribucion.defaultTable"),
          shape: newShape,
          x: 50,
          y: 50,
          w: newShape === "circle" || newShape === "square" ? 12 : 14,
          h: newShape === "circle" || newShape === "square" ? 12 : 8,
          rotation: 0,
          zoneId: "",
          seats: 8,
          guests: [],
        },
      ]);
      setSelectedId(ref.id);
      addToast("success", t("distribucion.tableAdded"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [newShape, tablesRef, addToast, t]);

  const deleteTable = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(tablesRef(), id));
        setTables((prev) => prev.filter((tb) => tb.id !== id));
        if (selectedId === id) setSelectedId("");
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [tablesRef, selectedId, addToast, t],
  );

  const patchTable = useCallback(
    (id: string, patch: Partial<ShapeTable>) => {
      setTables((prev) => prev.map((tb) => (tb.id === id ? { ...tb, ...patch } : tb)));
    },
    [],
  );

  const persistTable = useCallback(
    async (id: string, patch: Partial<ShapeTable>) => {
      try {
        await updateDoc(doc(tablesRef(), id), patch);
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [tablesRef, addToast, t],
  );

  const assignGuest = useCallback(
    async (id: string, name: string) => {
      const clean = name.trim().slice(0, 120);
      if (!clean) return;
      patchTable(id, { guests: [...(tables.find((tb) => tb.id === id)?.guests || []), clean] });
      try {
        await updateDoc(doc(tablesRef(), id), { guests: arrayUnion(clean) });
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [tables, patchTable, tablesRef, addToast, t],
  );

  const removeGuest = useCallback(
    async (id: string, name: string) => {
      patchTable(id, { guests: (tables.find((tb) => tb.id === id)?.guests || []).filter((g) => g !== name) });
      try {
        await updateDoc(doc(tablesRef(), id), { guests: arrayRemove(name) });
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [tables, patchTable, tablesRef, addToast, t],
  );

  // ── Arrastre de mesas sobre el mapa ──
  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.preventDefault();
      const map = mapRef.current;
      if (!map) return;
      const rect = map.getBoundingClientRect();
      dragRef.current = { id, dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setSelectedId(id);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      const map = mapRef.current;
      if (!drag || !map) return;
      const rect = map.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
      if (Math.abs(x - drag.dx) > 0.1 || Math.abs(y - drag.dy) > 0.1) drag.moved = true;
      patchTable(drag.id, { x, y });
    },
    [patchTable],
  );

  const onPointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag && drag.moved) {
      const tb = tables.find((x) => x.id === drag.id);
      if (tb) void persistTable(drag.id, { x: tb.x, y: tb.y });
    }
    dragRef.current = null;
  }, [tables, persistTable]);

  const zoneColor = (zoneId: string) => zones.find((z) => z.id === zoneId)?.color || "#d8b24a";
  const selected = tables.find((tb) => tb.id === selectedId);

  return (
    <div className="admin-flex--col" style={{ gap: "0.75rem" }}>
      {/* ── Controles superiores ── */}
      <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <label className="setup-label" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          {t("distribucion.shape")}
          <select className="setup-input" value={newShape} onChange={(e) => setNewShape(e.target.value as Shape)} style={{ marginLeft: "0.3rem" }}>
            {SHAPES.map((s) => (
              <option key={s.key} value={s.key}>
                {t(`distribucion.shape_${s.key}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="setup-button setup-button--compact" onClick={() => void addTable()}>
          {t("distribucion.addTable")}
        </button>
        <div style={{ flex: 1 }} />
        <span className="setup-help" style={{ margin: 0 }}>{t("distribucion.dragHint")}</span>
      </div>

      {/* ── Zonas ── */}
      <div className="setup-background-panel">
        <p className="setup-label">{t("distribucion.zones")}</p>
        <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <input className="setup-input" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder={t("distribucion.zonePlaceholder")} maxLength={80} style={{ flex: 1, minWidth: "10rem" }} aria-label={t("distribucion.zonePlaceholder")} />
          <button type="button" className="setup-button setup-button--compact" onClick={() => void addZone()}>{t("distribucion.addZone")}</button>
        </div>
        {zones.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
            {zones.map((z) => (
              <span key={z.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", border: "1px solid var(--setup-border)", borderRadius: "999px", padding: "0.15rem 0.6rem", color: "var(--setup-subtitle)" }}>
                <span style={{ width: "0.6rem", height: "0.6rem", borderRadius: "50%", background: z.color, display: "inline-block" }} />
                {z.name}
                <button type="button" aria-label={t("distribucion.deleteZone")} onClick={() => void deleteZone(z.id)} style={{ background: "none", border: 0, cursor: "pointer", color: "#ef4444" }}>
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Mapa interactivo ── */}
      <div
        ref={mapRef}
        className="distribucion-map"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: "1rem",
          overflow: "hidden",
          background: "linear-gradient(160deg, #241c12, #3a2d1c)",
          border: "1px solid var(--setup-border)",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* Leyenda de zonas de fondo */}
        {zones.map((z) => (
          <div
            key={z.id}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              background: `radial-gradient(circle at 50% 50%, ${z.color}14, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
        ))}
        {tables.map((tb) => (
          <div
            key={tb.id}
            data-table-id={tb.id}
            onPointerDown={(e) => onPointerDown(e, tb.id)}
            style={{
              position: "absolute",
              left: `${tb.x}%`,
              top: `${tb.y}%`,
              width: `${tb.w}%`,
              height: `${tb.shape === "circle" ? tb.w : tb.shape === "oval" ? tb.h : tb.h}%`,
              transform: `translate(-50%, -50%) rotate(${tb.rotation}deg)`,
              borderRadius: tb.shape === "rect" || tb.shape === "square" ? "0.4rem" : "50%",
              border: `2px solid ${tb.zoneId ? zoneColor(tb.zoneId) : "rgba(255,255,255,0.5)"}`,
              background: "rgba(255,255,255,0.12)",
              boxShadow: selectedId === tb.id ? "0 0 0 3px var(--setup-accent)" : "0 4px 12px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "grab",
              fontSize: "0.7rem",
              color: "#fff",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            <span style={{ fontWeight: 600 }}>{tb.name}</span>
            <span style={{ opacity: 0.85, fontSize: "0.62rem" }}>
              {tb.guests.length}/{tb.seats}
            </span>
          </div>
        ))}
        {tables.length === 0 ? (
          <p style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", margin: 0 }}>
            {t("distribucion.emptyMap")}
          </p>
        ) : null}
      </div>

      {/* ── Panel de la mesa seleccionada ── */}
      {selected ? (
        <div className="setup-background-panel">
          <p className="setup-label">{t("distribucion.selectedTable")}: {selected.name}</p>
          <div className="admin-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem" }}>
            <label className="setup-label" style={{ margin: 0 }}>
              {t("distribucion.name")}
              <input className="setup-input" value={selected.name} maxLength={80} onChange={(e) => { patchTable(selected.id, { name: e.target.value }); void persistTable(selected.id, { name: e.target.value }); }} />
            </label>
            <label className="setup-label" style={{ margin: 0 }}>
              {t("distribucion.shape")}
              <select className="setup-input" value={selected.shape} onChange={(e) => { const shape = e.target.value as Shape; patchTable(selected.id, { shape }); void persistTable(selected.id, { shape }); }}>
                {SHAPES.map((s) => (
                  <option key={s.key} value={s.key}>{t(`distribucion.shape_${s.key}`)}</option>
                ))}
              </select>
            </label>
            <label className="setup-label" style={{ margin: 0 }}>
              {t("distribucion.zone")}
              <select className="setup-input" value={selected.zoneId} onChange={(e) => { patchTable(selected.id, { zoneId: e.target.value }); void persistTable(selected.id, { zoneId: e.target.value }); }}>
                <option value="">—</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </label>
            <label className="setup-label" style={{ margin: 0 }}>
              {t("distribucion.seats")}
              <input className="setup-input" type="number" min={0} max={100} value={selected.seats} onChange={(e) => { const seats = Math.min(100, Math.max(0, Number(e.target.value) || 0)); patchTable(selected.id, { seats }); void persistTable(selected.id, { seats }); }} />
            </label>
            <label className="setup-label" style={{ margin: 0 }}>
              {t("distribucion.size")}
              <input className="setup-input" type="number" min={2} max={80} value={selected.w} onChange={(e) => { const w = Math.min(80, Math.max(2, Number(e.target.value) || 10)); patchTable(selected.id, { w }); void persistTable(selected.id, { w }); }} />
            </label>
            <label className="setup-label" style={{ margin: 0 }}>
              {t("distribucion.height")}
              <input className="setup-input" type="number" min={2} max={80} value={selected.h} onChange={(e) => { const h = Math.min(80, Math.max(2, Number(e.target.value) || 8)); patchTable(selected.id, { h }); void persistTable(selected.id, { h }); }} />
            </label>
            <label className="setup-label" style={{ margin: 0 }}>
              {t("distribucion.rotation")}
              <input className="setup-input" type="number" min={-180} max={180} value={selected.rotation} onChange={(e) => { const rotation = Math.min(180, Math.max(-180, Number(e.target.value) || 0)); patchTable(selected.id, { rotation }); void persistTable(selected.id, { rotation }); }} />
            </label>
          </div>

          {/* Asignación de invitados */}
          <div className="admin-flex" style={{ gap: "0.4rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
            <GuestAssign
              guests={selected.guests}
              onAssign={(n) => void assignGuest(selected.id, n)}
              onRemove={(n) => void removeGuest(selected.id, n)}
            />
          </div>

          <button type="button" className="setup-button setup-button--danger setup-button--compact" style={{ marginTop: "0.6rem" }} onClick={() => void deleteTable(selected.id)}>
            {t("distribucion.deleteTable")}
          </button>
        </div>
      ) : null}
    </div>
  );
});

/** Asignación de invitados a una mesa (chips + input). */
function GuestAssign({
  guests,
  onAssign,
  onRemove,
}: {
  guests: string[];
  onAssign: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const submit = () => {
    if (value.trim()) {
      onAssign(value);
      setValue("");
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%" }}>
      <div className="admin-flex" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
        <input className="setup-input" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder={t("distribucion.assignPlaceholder")} maxLength={120} style={{ flex: 1, minWidth: "9rem" }} aria-label={t("distribucion.assignPlaceholder")} />
        <button type="button" className="setup-button setup-button--compact" onClick={submit}>{t("distribucion.assign")}</button>
      </div>
      {guests.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
          {guests.map((g, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", border: "1px solid var(--setup-border)", borderRadius: "999px", padding: "0.15rem 0.5rem", color: "var(--setup-subtitle)" }}>
              {g}
              <button type="button" aria-label={t("distribucion.removeGuest")} onClick={() => onRemove(g)} style={{ background: "none", border: 0, cursor: "pointer", color: "#ef4444", fontSize: "0.85rem" }}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default DistribucionTab;
