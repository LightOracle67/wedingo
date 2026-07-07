import { memo, useMemo, useState } from "react";

const LABELS = { carne: "Menú de carne", pescado: "Menú de pescado", vegano: "Menú vegano/vegetariano", postre: "Postre" };

const MenuSection = memo(function MenuSection({ style, className, menuOptions, rsvpForm, updateRsvpField }) {
  const dishes = useMemo(() => {
    const lines = (menuOptions || "").split("\n").filter(Boolean);
    const result = [];
    for (const line of lines) {
      const m = line.match(/^\[(carne|pescado|vegano|postre)\](.*)/);
      if (m) result.push({ type: m[1], dish: m[2].trim() });
      else if (line.trim()) result.push({ type: "texto", dish: line.trim() });
    }
    return result;
  }, [menuOptions]);

  const isStructured = dishes.some(d => d.type !== "texto");
  const mains = dishes.filter(d => d.type !== "postre");
  const dessert = dishes.find(d => d.type === "postre");

  const [selected, setSelected] = useState("");

  const selDish = dishes.find(d => d.type === selected);

  return (
    <section data-story-section="menu" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Menú</p>
        <h2 className="story-title">Nuestro menú</h2>

        {dishes.length === 0 ? (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>El menú se compartirá próximamente.</p>
        ) : !isStructured ? (
          <p className="story-copy mt-4 whitespace-pre-line">{menuOptions}</p>
        ) : (
          <>
            <p className="story-copy mt-4">Selecciona tu menú principal:</p>

            <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", marginTop: "0.75rem" }}>
              {mains.map((d) => (
                <label key={d.type} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0", cursor: "pointer", fontSize: "0.95rem", color: "var(--setup-title)" }}>
                  <input type="checkbox" checked={selected === d.type} onChange={() => setSelected(selected === d.type ? "" : d.type)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                  {LABELS[d.type] || d.type}
                </label>
              ))}
              <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0", cursor: "pointer", fontSize: "0.95rem", color: "var(--setup-title)" }}>
                <input type="checkbox" checked={selected === "otro"} onChange={() => setSelected(selected === "otro" ? "" : "otro")} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                Otro
              </label>
            </div>

            {selected === "otro" && (
              <input className="setup-input" value={rsvpForm?.mealOther || ""} onChange={(e) => updateRsvpField?.("mealOther", e.target.value.slice(0, 120))} placeholder="Indica tu preferencia" autoComplete="off" style={{ marginTop: "0.3rem", maxWidth: "22rem" }} />
            )}

            {selected && selected !== "otro" && selDish ? (
              <div style={{ marginTop: "0.75rem", padding: "0.8rem", borderRadius: "0.8rem", background: "color-mix(in srgb, var(--setup-field-bg) 70%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 25%, transparent)" }}>
                <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.3rem" }}>{LABELS[selected]}</p>
                <p className="story-note whitespace-pre-line" style={{ fontSize: "0.9rem" }}>{selDish.dish}</p>
              </div>
            ) : !selected ? (
              <div style={{ marginTop: "0.75rem" }}>
                {mains.map((d, i) => (
                  <div key={i} style={{ marginBottom: "0.5rem", padding: "0.6rem 0.8rem", borderRadius: "0.7rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
                    <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.2rem" }}>{LABELS[d.type]}</p>
                    <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{d.dish}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {dessert ? (
              <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.8rem", borderRadius: "0.7rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
                <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.2rem" }}>Postre</p>
                <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{dessert.dish}</p>
              </div>
            ) : null}

            <div className="story-divider" style={{ marginTop: "0.75rem" }} />

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
              <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
                <input type="checkbox" checked={rsvpForm?.noGluten || false} onChange={(e) => updateRsvpField?.("noGluten", e.target.checked)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                Sin gluten
              </label>
              <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem", color: "var(--setup-title)" }}>
                <input type="checkbox" checked={rsvpForm?.noLactosa || false} onChange={(e) => updateRsvpField?.("noLactosa", e.target.checked)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                Sin lactosa
              </label>
            </div>
          </>
        )}
      </div>
    </section>
  );
});

export default MenuSection;
