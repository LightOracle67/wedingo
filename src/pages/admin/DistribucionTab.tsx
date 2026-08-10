/**
 * DistribucionTab — Distribución del recinto por SECCIONES (diferencial).
 *
 * El admin crea SECCIONES (p. ej. "Salón principal", "Jardín"); cada sección
 * tiene su PROPIO mapa con mesas con forma que se arrastran, redimensionan y
 * rotan. Las mesas y sus posiciones se GUARDAN en Firestore (subcolección
 * `sections/{sectionId}/tables`). Solo se pueden asignar a las mesas invitados
 * que hayan CONFIRMADO su asistencia (attendance === "yes").
 *
 * Las secciones se muestran como un menú superior sobre la previsualización, y
 * el mapa ocupa todo el espacio disponible.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDocs, collection, doc, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, rsvpByInviteRef } from "../../lib/firebase";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";

type Shape = "circle" | "rect" | "oval" | "square";

interface Section {
  id: string;
  name: string;
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
  seats: number;
  guests: string[];
}

const SHAPES: Array<{ key: Shape; label: string }> = [
  { key: "circle", label: "Círculo" },
  { key: "rect", label: "Rectángulo" },
  { key: "oval", label: "Óvalo" },
  { key: "square", label: "Cuadrado" },
];

const DistribucionTab = memo(function DistribucionTab({ inviteToken }: { inviteToken: string }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [tables, setTables] = useState<ShapeTable[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [newShape, setNewShape] = useState<Shape>("rect");
  // Invitados CONFIRMADOS (attendance yes) disponibles para asignar.
  const [confirmedGuests, setConfirmedGuests] = useState<Array<{ name: string; assigned: boolean }>>([]);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);

  const sectionsRef = useCallback(() => collection(db, "invitations", inviteToken, "sections"), [inviteToken]);
  const tablesRef = useCallback(
    (sectionId: string) => collection(db, "invitations", inviteToken, "sections", sectionId, "tables"),
    [inviteToken],
  );

  // ── Carga de secciones y confirmados ──
  const loadSections = useCallback(async () => {
    try {
      const snap = await getDocs(sectionsRef());
      const list = snap.docs.map((d) => ({ id: d.id, name: String(d.data().name || "") }));
      setSections(list);
      if (list.length > 0 && !list.some((s) => s.id === activeSectionId)) {
        setActiveSectionId(list[0]!.id);
      }
    } catch {
      /* datos no disponibles */
    }
  }, [sectionsRef, activeSectionId]);

  const loadConfirmed = useCallback(async () => {
    try {
      const snap = await getDocs(rsvpByInviteRef(inviteToken));
      const names = new Set<string>();
      for (const d of snap.docs) {
        const data = d.data();
        if (data.attendance === "yes") names.add(String(data.guestName || "").trim());
      }
      setConfirmedGuests([...names].filter(Boolean).map((name) => ({ name, assigned: false })));
    } catch {
      /* sin confirmados */
    }
  }, [inviteToken]);

  useEffect(() => {
    void loadSections();
    void loadConfirmed();
  }, [loadSections, loadConfirmed]);

  // ── Carga de mesas de la sección activa ──
  const loadTables = useCallback(async () => {
    if (!activeSectionId) return;
    try {
      const snap = await getDocs(tablesRef(activeSectionId));
      setTables(
        snap.docs.map((d) => ({
          id: d.id,
          name: String(d.data().name || ""),
          shape: String(d.data().shape || "rect") as Shape,
          x: Number(d.data().x) || 0,
          y: Number(d.data().y) || 0,
          w: Number(d.data().w) || 14,
          h: Number(d.data().h) || 8,
          rotation: Number(d.data().rotation) || 0,
          seats: Number(d.data().seats) || 0,
          guests: Array.isArray(d.data().guests) ? (d.data().guests as string[]) : [],
        })),
      );
      setSelectedId("");
    } catch {
      /* datos no disponibles */
    }
  }, [activeSectionId, tablesRef]);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  // Mantiene la marca "asignado" de los confirmados según las mesas actuales.
  const assignedNames = useMemo(() => new Set(tables.flatMap((tb) => tb.guests)), [tables]);

  // ── Secciones ──
  const addSection = useCallback(async () => {
    const name = newSectionName.trim();
    if (!name) return;
    try {
      const ref = await addDoc(sectionsRef(), { name: name.slice(0, 80), createdAt: new Date().toISOString() });
      setSections((prev) => [...prev, { id: ref.id, name: name.slice(0, 80) }]);
      setActiveSectionId(ref.id);
      setNewSectionName("");
      addToast("success", t("distribucion.sectionAdded"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [newSectionName, sectionsRef, addToast, t]);

  const deleteSection = useCallback(
    async (id: string) => {
      if (!window.confirm(t("distribucion.deleteSectionConfirm"))) return;
      try {
        const tbSnap = await getDocs(tablesRef(id));
        for (let i = 0; i < tbSnap.docs.length; i += 400) {
          const batch = await import("firebase/firestore").then((m) => m.writeBatch(db));
          tbSnap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
        await deleteDoc(doc(sectionsRef(), id));
        const next = sections.filter((s) => s.id !== id);
        setSections(next);
        if (activeSectionId === id) setActiveSectionId(next[0]?.id || "");
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [sectionsRef, tablesRef, sections, activeSectionId, addToast, t],
  );

  // ── Mesas de la sección activa ──
  const addTable = useCallback(async () => {
    if (!activeSectionId) return;
    // Tamaño por defecto en PÍXELES: en círculo/cuadrado ancho=alto siempre.
    const defaultSize = (shape: Shape): { w: number; h: number } => {
      switch (shape) {
        case "circle":
        case "square":
          return { w: 90, h: 90 };
        case "oval":
          return { w: 140, h: 90 };
        default:
          return { w: 130, h: 80 };
      }
    };
    const size = defaultSize(newShape);
    try {
      const ref = await addDoc(tablesRef(activeSectionId), {
        name: t("distribucion.defaultTable"),
        shape: newShape,
        x: 50,
        y: 50,
        w: size.w,
        h: size.h,
        rotation: 0,
        seats: 8,
        guests: [],
        createdAt: new Date().toISOString(),
      });
      setTables((prev) => [
        ...prev,
        { id: ref.id, name: t("distribucion.defaultTable"), shape: newShape, x: 50, y: 50, w: size.w, h: size.h, rotation: 0, seats: 8, guests: [] },
      ]);
      setSelectedId(ref.id);
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [activeSectionId, newShape, tablesRef, addToast, t]);

  const deleteTable = useCallback(
    async (id: string) => {
      if (!activeSectionId) return;
      try {
        await deleteDoc(doc(tablesRef(activeSectionId), id));
        setTables((prev) => prev.filter((tb) => tb.id !== id));
        if (selectedId === id) setSelectedId("");
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [activeSectionId, tablesRef, selectedId, addToast, t],
  );

  const patchTable = useCallback(
    (id: string, patch: Partial<ShapeTable>) => {
      setTables((prev) => prev.map((tb) => (tb.id === id ? { ...tb, ...patch } : tb)));
    },
    [],
  );

  const persistTable = useCallback(
    async (id: string, patch: Partial<ShapeTable>) => {
      if (!activeSectionId) return;
      try {
        await updateDoc(doc(tablesRef(activeSectionId), id), patch);
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [activeSectionId, tablesRef, addToast, t],
  );

  // Solo se asignan invitados CONFIRMADOS y que no estén ya en otra mesa.
  const assignGuest = useCallback(
    async (id: string, name: string) => {
      if (!activeSectionId || !name) return;
      if (assignedNames.has(name)) return;
      const tb = tables.find((x) => x.id === id);
      if (!tb || tb.guests.length >= tb.seats) {
        addToast("error", t("distribucion.tableFull"));
        return;
      }
      patchTable(id, { guests: [...tb.guests, name] });
      try {
        await updateDoc(doc(tablesRef(activeSectionId), id), { guests: arrayUnion(name) });
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [activeSectionId, tables, assignedNames, patchTable, tablesRef, addToast, t],
  );

  const removeGuest = useCallback(
    async (id: string, name: string) => {
      if (!activeSectionId) return;
      patchTable(id, { guests: (tables.find((x) => x.id === id)?.guests || []).filter((g) => g !== name) });
      try {
        await updateDoc(doc(tablesRef(activeSectionId), id), { guests: arrayRemove(name) });
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [activeSectionId, tables, patchTable, tablesRef, addToast, t],
  );

  // ── Arrastre de mesas ──
  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.preventDefault();
      const map = mapRef.current;
      if (!map) return;
      dragRef.current = { id, moved: false };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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
      drag.moved = true;
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

  const selected = tables.find((tb) => tb.id === selectedId);
  const availableGuests = confirmedGuests.filter((g) => !assignedNames.has(g.name));

  return (
    <div className="admin-flex--col" style={{ gap: "0.75rem", height: "100%", minHeight: 0 }}>
      {/* ── Menú superior de secciones ── */}
      <div className="admin-flex" style={{ gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        {sections.length === 0 ? (
          <span className="setup-help" style={{ margin: 0 }}>{t("distribucion.noSections")}</span>
        ) : (
          sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`admin-tab ${activeSectionId === s.id ? "admin-tab--active" : ""}`}
              onClick={() => setActiveSectionId(s.id)}
              style={{ padding: "0.35rem 0.8rem", fontSize: "0.82rem" }}
            >
              {s.name}
            </button>
          ))
        )}
        <span style={{ flex: 1 }} />
        <input
          className="setup-input"
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder={t("distribucion.sectionPlaceholder")}
          maxLength={80}
          style={{ maxWidth: "14rem" }}
          aria-label={t("distribucion.sectionPlaceholder")}
        />
        <button type="button" className="setup-button setup-button--compact" onClick={() => void addSection()}>
          {t("distribucion.addSection")}
        </button>
      </div>

      {/* ── Controles de mesas (sección activa) ── */}
      {activeSectionId ? (
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
          <button type="button" className="setup-button setup-button--danger setup-button--ghost setup-button--compact" onClick={() => void deleteSection(activeSectionId)}>
            {t("distribucion.deleteSection")}
          </button>
          <span style={{ flex: 1 }} />
          <span className="setup-help" style={{ margin: 0 }}>{t("distribucion.dragHint")}</span>
        </div>
      ) : null}

      {/* ── Mapa de la sección activa (ocupa todo el espacio) ── */}
      {activeSectionId ? (
        <div
          ref={mapRef}
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
          {tables.map((tb) => (
            <div
              key={tb.id}
              data-table-id={tb.id}
              onPointerDown={(e) => onPointerDown(e, tb.id)}
              style={{
                position: "absolute",
                left: `${tb.x}%`,
                top: `${tb.y}%`,
                width: `${tb.w}px`,
                height: `${tb.h}px`,
                transform: `translate(-50%, -50%) rotate(${tb.rotation}deg)`,
                borderRadius: tb.shape === "rect" || tb.shape === "square" ? "0.4rem" : "50%",
                border: `2px solid ${selectedId === tb.id ? "var(--setup-accent)" : "rgba(255,255,255,0.5)"}`,
                background: "rgba(255,255,255,0.12)",
                boxShadow: selectedId === tb.id ? "0 0 0 3px var(--setup-accent)" : "0 4px 12px rgba(0,0,0,0.4)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "grab",
                fontSize: "0.72rem",
                color: "#fff",
                textAlign: "center",
                lineHeight: 1.2,
                overflow: "hidden",
              }}
            >
              <span style={{ fontWeight: 600 }}>{tb.name}</span>
              <span style={{ opacity: 0.85, fontSize: "0.64rem" }}>
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
      ) : (
        <div className="setup-background-panel" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="setup-help">{t("distribucion.createSectionFirst")}</p>
        </div>
      )}

      {/* ── Panel de la mesa seleccionada ── */}
      {selected ? (
        <div className="setup-background-panel">
          <p className="setup-label">
            {t("distribucion.selectedTable")}: {selected.name}
          </p>
          <div className="admin-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
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
              {t("distribucion.seats")}
              <input className="setup-input" type="number" min={0} max={100} value={selected.seats} onChange={(e) => { const seats = Math.min(100, Math.max(0, Number(e.target.value) || 0)); patchTable(selected.id, { seats }); void persistTable(selected.id, { seats }); }} />
            </label>
            {selected.shape === "circle" || selected.shape === "square" ? (
              <label className="setup-label" style={{ margin: 0 }}>
                {t("distribucion.sizePx")}
                <input
                  className="setup-input"
                  type="number"
                  min={20}
                  max={500}
                  value={selected.w}
                  onChange={(e) => {
                    const v = Math.min(500, Math.max(20, Number(e.target.value) || 90));
                    // Círculo y cuadrado: ancho y alto SIEMPRE iguales.
                    patchTable(selected.id, { w: v, h: v });
                    void persistTable(selected.id, { w: v, h: v });
                  }}
                />
              </label>
            ) : (
              <>
                <label className="setup-label" style={{ margin: 0 }}>
                  {t("distribucion.widthPx")}
                  <input
                    className="setup-input"
                    type="number"
                    min={20}
                    max={500}
                    value={selected.w}
                    onChange={(e) => {
                      const w = Math.min(500, Math.max(20, Number(e.target.value) || 90));
                      patchTable(selected.id, { w });
                      void persistTable(selected.id, { w });
                    }}
                  />
                </label>
                <label className="setup-label" style={{ margin: 0 }}>
                  {t("distribucion.heightPx")}
                  <input
                    className="setup-input"
                    type="number"
                    min={20}
                    max={500}
                    value={selected.h}
                    onChange={(e) => {
                      const h = Math.min(500, Math.max(20, Number(e.target.value) || 60));
                      patchTable(selected.id, { h });
                      void persistTable(selected.id, { h });
                    }}
                  />
                </label>
              </>
            )}
            <label className="setup-label" style={{ margin: 0 }}>
              {t("distribucion.rotation")}
              <input className="setup-input" type="number" min={-180} max={180} value={selected.rotation} onChange={(e) => { const rotation = Math.min(180, Math.max(-180, Number(e.target.value) || 0)); patchTable(selected.id, { rotation }); void persistTable(selected.id, { rotation }); }} />
            </label>
          </div>

          {/* Invitados asignados (solo confirmados) */}
          <div style={{ marginTop: "0.6rem" }}>
            <p className="setup-label" style={{ fontSize: "0.85rem" }}>{t("distribucion.guests")}</p>
            {selected.guests.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {selected.guests.map((g, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", border: "1px solid var(--setup-border)", borderRadius: "999px", padding: "0.15rem 0.5rem", color: "var(--setup-subtitle)" }}>
                    {g}
                    <button type="button" aria-label={t("distribucion.removeGuest")} onClick={() => void removeGuest(selected.id, g)} style={{ background: "none", border: 0, cursor: "pointer", color: "#ef4444", fontSize: "0.85rem" }}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="setup-help" style={{ margin: "0.2rem 0 0" }}>{t("distribucion.noGuestsAssigned")}</p>
            )}
            <select
              className="setup-input"
              value=""
              onChange={(e) => {
                if (e.target.value) void assignGuest(selected.id, e.target.value);
              }}
              style={{ marginTop: "0.4rem", maxWidth: "16rem" }}
              aria-label={t("distribucion.assignPlaceholder")}
            >
              <option value="">{t("distribucion.assignPlaceholder")}</option>
              {availableGuests.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="setup-button setup-button--danger setup-button--compact" style={{ marginTop: "0.6rem" }} onClick={() => void deleteTable(selected.id)}>
            {t("distribucion.deleteTable")}
          </button>
        </div>
      ) : null}
    </div>
  );
});

export default DistribucionTab;
