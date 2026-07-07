import { memo, useMemo } from "react";

const LABELS = { carne: "Menú de carne", pescado: "Menú de pescado", vegano: "Menú vegano/vegetariano", postre: "Postre" };

const MenuSection = memo(function MenuSection({ style, className, menuOptions }) {
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
            {mains.map((d, i) => (
              <div key={i} style={{ marginTop: i === 0 ? "0.75rem" : "0.5rem", padding: "0.6rem 0.8rem", borderRadius: "0.7rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
                <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.2rem" }}>{LABELS[d.type]}</p>
                <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{d.dish}</p>
              </div>
            ))}
            {dessert ? (
              <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.8rem", borderRadius: "0.7rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
                <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.2rem" }}>Postre</p>
                <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{dessert.dish}</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
});

export default MenuSection;
