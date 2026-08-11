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
import { THEME_PREVIEW_COLORS } from "../../lib/constants";
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
  // Solo círculo y cuadrado: las mesas rectangulares/ovaladas dieron fallos
  // y se retiraron. El tipo Shape conserva rect/oval para leer mesas antiguas.
  { key: "circle", label: "Círculo" },
  { key: "square", label: "Cuadrado" },
];

/** Posiciones (%) de las sillas alrededor de la mesa según forma y plazas. */
function chairPositions(shape: Shape, _w: number, _h: number, seats: number): Array<{ x: number; y: number }> {
  const n = Math.min(Math.max(seats || 0, 0), 24);
  if (n === 0) return [];
  if (shape === "circle" || shape === "oval") {
    // Sillas en círculo alrededor del centro (radio ~46% de la caja).
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      out.push({ x: 50 + Math.cos(ang) * 46, y: 50 + Math.sin(ang) * 46 });
    }
    return out;
  }
  // Rectángulo/cuadrado: sillas repartidas por el perímetro de la caja.
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
      x = W - (d - W - H);
      y = H;
    } else {
      x = 0;
      y = H - (d - 2 * W - H);
    }
    out.push({ x, y });
  }
  return out;
}

const DistribucionTab = memo(function DistribucionTab({
  inviteToken,
  background,
  cornerDecoration,
  theme,
}: {
  inviteToken: string;
  /** Imagen de fondo personalizada (data-URL ya hidratada) para las etiquetas. */
  background?: string | undefined;
  /** Decoración de esquinas personalizada (data-URL) para las etiquetas. */
  cornerDecoration?: string | undefined;
  /** Tema de la invitación (p. ej. "golden") para sus colores en las etiquetas. */
  theme?: string | undefined;
}) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [tables, setTables] = useState<ShapeTable[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [newShape, setNewShape] = useState<Shape>("circle");
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
          shape: String(d.data().shape || "circle") as Shape,
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

  // ── Servicio de impresión de etiquetas por mesa (A4 vertical, una por página) ──
  const printLabels = useCallback(() => {
    const withGuests = tables.filter((tb) => tb.guests.length > 0);
    if (withGuests.length === 0) {
      addToast("info", t("distribucion.printNoGuests"));
      return;
    }
    const esc = (v: string) =>
      v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    // Colores del TEMA establecido (fallback del fondo y acento de la etiqueta).
    const themeColors = THEME_PREVIEW_COLORS[theme || ""] || THEME_PREVIEW_COLORS["golden"] || { accent: "#d8b24a", bg: "#2a2418" };
    const cornerImg = cornerDecoration
      ? `<img src="${esc(cornerDecoration)}" alt="" class="lbl-corner lbl-corner--tl"/>
         <img src="${esc(cornerDecoration)}" alt="" class="lbl-corner lbl-corner--tr"/>
         <img src="${esc(cornerDecoration)}" alt="" class="lbl-corner lbl-corner--bl"/>
         <img src="${esc(cornerDecoration)}" alt="" class="lbl-corner lbl-corner--br"/>`
      : `<span class="lbl-corner lbl-corner--tl"></span>
         <span class="lbl-corner lbl-corner--tr"></span>
         <span class="lbl-corner lbl-corner--bl"></span>
         <span class="lbl-corner lbl-corner--br"></span>`;
    // Fondo: se usa un <img> (las imágenes SÍ se imprimen en todos los
    // navegadores; un background-image CSS requiere activar "imprimir fondos").
    const bgImg = background ? `<img src="${esc(background)}" alt="" class="lbl-bg"/>` : "";
    const cardStyle = `background-color:${themeColors.bg}${background ? `;background-image:url("${esc(background)}")` : ""}`;
    const thanks = esc(t("distribucion.labelThanks"));
    const enjoy = esc(t("distribucion.labelEnjoy"));
    const pages = withGuests.flatMap((tb) =>
      tb.guests.map(
        (g) => `<div class="lbl-page">
          <div class="lbl-card" style="${cardStyle}">
            ${bgImg}
            ${cornerImg}
            <div class="lbl-text">
              <p class="lbl-guest">${esc(g)}</p>
              <p class="lbl-table" style="color:${themeColors.accent}">${esc(tb.name)}</p>
              <p class="lbl-thanks">${thanks}</p>
              <p class="lbl-enjoy">${enjoy}</p>
            </div>
          </div>
        </div>`,
      ),
    );
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(t("distribucion.printTitle"))}</title><style>
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
    const win = window.open("", "_blank");
    if (!win) {
      addToast("error", t("errors.generic"));
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Espera a que las imágenes (fondo y esquinas) estén DECODIFICADAS antes
    // de imprimir: img.complete se cumple antes de decodificar y un fondo aún
    // sin decodificar salía negro en el papel.
    const waitForImages = async () => {
      try {
        await Promise.all(Array.from(win.document.images).map((img) => img.decode().catch(() => {})));
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
      win.print();
    };
    void waitForImages();
  }, [tables, background, cornerDecoration, addToast, t]);

  // ── Exportación XLSX (Excel/LibreOffice) de las mesas e invitados asignados ──
  const exportTablesXlsx = useCallback(async () => {
    const { exportToXlsx } = await import("../../lib/excel-utils");
    const { buildTablesSheet } = await import("../../lib/excel-builders");
    const sheet = buildTablesSheet(sections, activeSectionId, tables, t);
    exportToXlsx(`mesas_${(sections.find((s) => s.id === activeSectionId)?.name || "seccion").replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 40)}`, [sheet]);
    addToast("success", t("tools.exportOk", { count: sheet.rows.length }));
  }, [sections, activeSectionId, tables, t, addToast]);

  const selected = tables.find((tb) => tb.id === selectedId);
  const availableGuests = confirmedGuests.filter((g) => !assignedNames.has(g.name));

  return (
    <div className="admin-flex--col" style={{ gap: "0.75rem", height: "100%", minHeight: 0 }}>
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
          <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={printLabels}>
            {t("distribucion.printLabels")}
          </button>
          <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => void exportTablesXlsx()}>
            {t("distribucion.exportTables")}
          </button>
          <button type="button" className="setup-button setup-button--danger setup-button--ghost setup-button--compact" onClick={() => void deleteSection(activeSectionId)}>
            {t("distribucion.deleteSection")}
          </button>
          <span style={{ flex: 1 }} />
          <span className="setup-help" style={{ margin: 0 }}>{t("distribucion.dragHint")}</span>
        </div>
      ) : null}

      {/* ── Selector de secciones (debajo de los controles de mesas) ── */}
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
      <p className="setup-help" style={{ margin: "0 0 0.1rem" }}>
        {t("distribucion.sectionsHint")}
      </p>

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
          {tables.map((tb) => {
            // Maquetación: sillas alrededor de la mesa según su forma y nº de plazas.
            const chairs = chairPositions(tb.shape, tb.w, tb.h, tb.seats);
            return (
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
                  cursor: "grab",
                }}
              >
                {selectedId === tb.id ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteTable(tb.id);
                    }}
                    title={t("distribucion.deleteTable")}
                    aria-label={t("distribucion.deleteTable")}
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      zIndex: 3,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#ef4444",
                      color: "#fff",
                      border: 0,
                      cursor: "pointer",
                      fontSize: "0.75rem",
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
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
                    boxShadow: selectedId === tb.id ? "0 0 0 3px var(--setup-accent)" : "0 6px 16px rgba(0,0,0,0.45)",
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
          })}
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
            <p className="setup-help" style={{ margin: "0.3rem 0 0" }}>
              {t("distribucion.assignHint")}
            </p>
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
