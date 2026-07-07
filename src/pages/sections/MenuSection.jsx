import { memo, useMemo, useState } from "react";

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

  const isStructured = useMemo(() => dishes.some(d => d.type !== "texto"), [dishes]);
  const [selected, setSelected] = useState("");

  return (
    <section
      data-story-section="menu"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Menú</p>
        <h2 className="story-title">Nuestro menú</h2>

        {dishes.length > 0 ? (
          <>
                {isStructured ? (
                  <>
                    <p className="story-copy mt-4">Selecciona tu menú:</p>
                    <div className="setup-date-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", marginTop: "0.75rem" }}>
                      {dishes.filter(d => d.type !== "postre").map((d) => {
                        const lbl = d.type === "vegano" ? "Vegano/Vegetariano" : d.type === "carne" ? "Carne" : d.type === "pescado" ? "Pescado" : d.type.charAt(0).toUpperCase() + d.type.slice(1);
                        return (
                          <label key={d.type} className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0", cursor: "pointer", fontSize: "0.95rem", color: "var(--setup-title)" }}>
                            <input type="checkbox" checked={selected === d.type} onChange={() => setSelected(selected === d.type ? "" : d.type)} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                            {lbl}
                          </label>
                        );
                      })}
                      <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0", cursor: "pointer", fontSize: "0.95rem", color: "var(--setup-title)" }}>
                        <input type="checkbox" checked={selected === "otro"} onChange={() => setSelected(selected === "otro" ? "" : "otro")} style={{ accentColor: "var(--setup-accent)", width: "1rem", height: "1rem", flexShrink: 0 }} />
                        Otro
                      </label>
                    </div>
                    {selected === "otro" && (
                      <input className="setup-input" value={rsvpForm?.mealOther || ""} onChange={(e) => updateRsvpField?.("mealOther", e.target.value.slice(0, 120))} placeholder="Especifica tu preferencia" autoComplete="off" style={{ marginTop: "0.3rem", maxWidth: "20rem" }} />
                    )}
                    <div className="story-divider" style={{ marginTop: "0.75rem" }} />
                    {selected && selected !== "otro" ? (
                      <div style={{ marginTop: "0.5rem", padding: "0.8rem", borderRadius: "0.8rem", background: "color-mix(in srgb, var(--setup-field-bg) 70%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 25%, transparent)" }}>
                        <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.3rem" }}>
                          {selected === "vegano" ? "Menú vegano/vegetariano" : selected === "postre" ? "Postre" : `Menú de ${selected}`}
                        </p>
                        <p className="story-note whitespace-pre-line" style={{ fontSize: "0.9rem" }}>{dishes.find(d => d.type === selected)?.dish}</p>
                      </div>
                    ) : null}
                    {!selected ? (
                      <div style={{ marginTop: "0.5rem" }}>
                        {dishes.map((d, i) => {
                          const lbl = d.type === "vegano" ? "Vegano/Vegetariano" : d.type === "postre" ? "Postre" : d.type.charAt(0).toUpperCase() + d.type.slice(1);
                          const prefix = d.type === "postre" ? "Postre" : `Menú ${lbl}`;
                          return (
                            <div key={i} style={{ marginBottom: "0.5rem", padding: "0.6rem 0.8rem", borderRadius: "0.7rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
                              <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.2rem" }}>{prefix}</p>
                              <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{d.dish}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="story-copy mt-4 whitespace-pre-line">{menuOptions}</p>
                )}

            {isStructured ? (
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
            ) : null}
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
