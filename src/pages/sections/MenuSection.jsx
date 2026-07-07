import { memo } from "react";

const MAINS = [
  { key: "menuCarne", label: "Carne" },
  { key: "menuPescado", label: "Pescado" },
  { key: "menuVegano", label: "Vegano/Vegetariano" },
];

const MenuSection = memo(function MenuSection({ style, className, menuCarne, menuPescado, menuVegano, menuPostre, menuEnabled }) {
  const mains = MAINS.map(m => ({ ...m, value: ({ menuCarne, menuPescado, menuVegano })[m.key]?.trim() })).filter(m => m.value);
  const postre = menuPostre?.trim();

  return (
    <section data-story-section="menu" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Menú</p>
        <h2 className="story-title">Nuestro menú</h2>

        {mains.length === 0 && !postre ? (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>El menú se compartirá próximamente.</p>
        ) : menuEnabled === "true" ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem", marginTop: "0.75rem" }}>
              {mains.map(m => (
                <div key={m.key} style={{ padding: "0.6rem 0.6rem", borderRadius: "0.7rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 20%, transparent)" }}>
                  <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.2rem" }}>{m.label}</p>
                  <p className="story-note whitespace-pre-line" style={{ fontSize: "0.82rem" }}>{m.value}</p>
                </div>
              ))}
            </div>
            {postre ? (
              <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.8rem", borderRadius: "0.7rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)", border: "1px solid color-mix(in srgb, var(--setup-accent) 20%, transparent)" }}>
                <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.2rem" }}>Postre</p>
                <p className="story-note whitespace-pre-line" style={{ fontSize: "0.82rem" }}>{postre}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div style={{ marginTop: "0.75rem" }}>
            {mains.map(m => <p key={m.key} className="story-copy mt-2 whitespace-pre-line">{m.value}</p>)}
            {postre ? <p className="story-copy mt-2 whitespace-pre-line">{postre}</p> : null}
          </div>
        )}
      </div>
    </section>
  );
});

export default MenuSection;
