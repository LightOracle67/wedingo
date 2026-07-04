export function DonutChart({ yes, no, pending, size = 120, strokeWidth = 20 }) {
  const total = yes + no + pending;
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Sin datos">
        <circle cx="20" cy="20" r="15.9" fill="none" stroke="var(--setup-border)" strokeWidth="3" />
        <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize="4" fill="var(--setup-muted)">
          —
        </text>
      </svg>
    );
  }

  const r = 15.9;
  const circ = 2 * Math.PI * r;
  const yesPct = yes / total;
  const noPct = no / total;
  const pendPct = pending / total;

  const yesOff = 0;
  const noOff = yesPct * circ;
  const pendOff = (yesPct + noPct) * circ;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label={`${yes} confirmados, ${no} no asisten, ${pending} sin responder`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--setup-border)" strokeWidth={strokeWidth * (40 / size)} opacity="0.3" />
      {yes > 0 && (
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--accent, #22c55e)" strokeWidth={strokeWidth * (40 / size)}
          strokeDasharray={`${yesPct * circ} ${circ}`} strokeDashoffset={-yesOff} transform="rotate(-90 20 20)"
          style={{ transition: "stroke-dasharray 0.3s" }} />
      )}
      {no > 0 && (
        <circle cx="20" cy="20" r={r} fill="none" stroke="#ef4444" strokeWidth={strokeWidth * (40 / size)}
          strokeDasharray={`${noPct * circ} ${circ}`} strokeDashoffset={-noOff} transform="rotate(-90 20 20)"
          style={{ transition: "stroke-dasharray 0.3s" }} />
      )}
      {pending > 0 && (
        <circle cx="20" cy="20" r={r} fill="none" stroke="#f59e0b" strokeWidth={strokeWidth * (40 / size)}
          strokeDasharray={`${pendPct * circ} ${circ}`} strokeDashoffset={-pendOff} transform="rotate(-90 20 20)"
          style={{ transition: "stroke-dasharray 0.3s" }} />
      )}
      <text x="20" y="18" textAnchor="middle" dominantBaseline="central" fontSize="5" fontWeight="700" fill="var(--setup-title)">
        {total}
      </text>
      <text x="20" y="24" textAnchor="middle" dominantBaseline="central" fontSize="2.8" fill="var(--setup-muted)">
        total
      </text>
    </svg>
  );
}

export function MiniBar({ items, height = 80, color = "var(--accent)" }) {
  if (!items?.length) return null;
  const max = Math.max(...items.map((i) => i.value || 0), 1);
  const barW = Math.max(4, Math.min(20, 200 / items.length));
  return (
    <svg width="100%" height={height} style={{ display: "block" }} preserveAspectRatio="xMinYMin meet" aria-label="Gráfico de barras">
      {items.map((item, i) => {
        const h = ((item.value || 0) / max) * (height - 8);
        return (
          <g key={i}>
            <rect x={i * (barW + 4) + 2} y={height - 4 - h} width={barW} height={h} fill={color} rx="2" />
            {item.label && (
              <text x={i * (barW + 4) + 2 + barW / 2} y={height - 2} textAnchor="end" fontSize="6" fill="var(--setup-muted)"
                transform={`rotate(-45 ${i * (barW + 4) + 2 + barW / 2} ${height - 2})`}>
                {item.label.length > 5 ? item.label.slice(0, 5) + "…" : item.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--setup-muted)" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
          {item.label}: <strong style={{ color: "var(--setup-title)" }}>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
