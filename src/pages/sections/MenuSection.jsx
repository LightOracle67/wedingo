import { memo, useMemo, useState } from "react";

const MenuSection = memo(function MenuSection({ style, className, menuOptions, rsvpForm, updateRsvpField }) {
  const mealOptions = useMemo(() => (menuOptions || "").split(",").map(s => s.trim()).filter(Boolean), [menuOptions]);
  const [selected, setSelected] = useState("");

  return (
    <section
      data-story-section="menu"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Menú</p>
        <h2 className="story-title">Elige tu plato</h2>

        {mealOptions.length > 0 ? (
          <>
            <p className="story-copy mt-4">Selecciona el tipo de menú que prefieras.</p>
            <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", marginTop: "0.75rem" }}>
              {["carne", "pescado", "vegano"].map((opt) => (
                <label key={opt} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0", cursor: "pointer", fontSize: "0.95rem", color: "var(--setup-title)" }}>
                  <input type="checkbox" checked={selected === opt} onChange={() => setSelected(selected === opt ? "" : opt)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
              <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0", cursor: "pointer", fontSize: "0.95rem", color: "var(--setup-title)" }}>
                <input type="checkbox" checked={selected === "otro"} onChange={() => setSelected(selected === "otro" ? "" : "otro")} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                Otro
              </label>
            </div>
            {selected === "otro" && (
              <input className="setup-input" value={rsvpForm?.mealOther || ""} onChange={(e) => updateRsvpField?.("mealOther", e.target.value.slice(0, 120))} placeholder="Especifica tu preferencia" autoComplete="off" style={{ marginTop: "0.3rem", maxWidth: "20rem" }} />
            )}

            <div className="story-divider" style={{ marginTop: "0.75rem" }} />

            <p className="story-note mt-2" style={{ fontSize: "0.9rem" }}>
              Los platos disponibles son:
            </p>
            <div style={{ textAlign: "left", marginTop: "0.5rem", padding: "0 0.5rem" }}>
              {mealOptions.map((opt, i) => (
                <p key={i} className="story-note" style={{ fontSize: "0.9rem", padding: "0.2rem 0" }}>
                  • {opt}
                </p>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.75rem" }}>
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
        ) : (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>
            El menú se compartirá próximamente.
          </p>
        )}
      </div>
    </section>
  );
});

export default MenuSection;
