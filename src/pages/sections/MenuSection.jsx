import { memo } from "react";

const FIELDS = [
  { key: "menuCarne", label: "Menú de carne" },
  { key: "menuPescado", label: "Menú de pescado" },
  { key: "menuVegano", label: "Menú vegano/vegetariano" },
  { key: "menuPostre", label: "Postre" },
];

const MenuSection = memo(function MenuSection({ style, className, menuCarne, menuPescado, menuVegano, menuPostre, menuEnabled }) {
  const items = FIELDS.map(f => ({ ...f, value: { menuCarne, menuPescado, menuVegano, menuPostre }[f.key]?.trim() })).filter(f => f.value);

  return (
    <section data-story-section="menu" className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`} style={style}>
      <div className="story-card story-panel story-card--info w-full text-center">
        <p className="story-eyebrow">Menú</p>
        <h2 className="story-title">Nuestro menú</h2>

        {items.length === 0 ? (
          <p className="story-copy mt-4" style={{ fontStyle: "italic" }}>El menú se compartirá próximamente.</p>
        ) : menuEnabled === "true" ? (
          items.map((item, i) => (
            <div key={item.key} style={{ marginTop: i === 0 ? "0.75rem" : "0.5rem", padding: "0.6rem 0.8rem", borderRadius: "0.7rem", background: "color-mix(in srgb, var(--setup-field-bg) 60%, transparent)" }}>
              <p className="story-eyebrow" style={{ fontSize: "0.75rem", marginBottom: "0.2rem" }}>{item.label}</p>
              <p className="story-note whitespace-pre-line" style={{ fontSize: "0.85rem" }}>{item.value}</p>
            </div>
          ))
        ) : (
          items.map((item, i) => (
            <p key={item.key} className="story-copy mt-4 whitespace-pre-line">{item.value}</p>
          ))
        )}
      </div>
    </section>
  );
});

export default MenuSection;
