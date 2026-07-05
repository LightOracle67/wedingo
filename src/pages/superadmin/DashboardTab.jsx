import { useEffect, useState } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db, RSVP_COLLECTION_REF, INVITATIONS_COLLECTION_REF } from "../../lib/firebase";
import { calcGlobalStats, tokenUsageOverTime, rsvpOverTime } from "../../lib/superadmin-utils";
import { DonutChart, MiniBar, Legend } from "../../lib/chart-utils";
import StatsCard from "../admin/StatsCard";

export default function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [tokenTimeline, setTokenTimeline] = useState([]);
  const [rsvpTimeline, setRsvpTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [rsvpSnap, invSnap, tokSnap] = await Promise.all([
          getDocs(RSVP_COLLECTION_REF),
          getDocs(INVITATIONS_COLLECTION_REF),
          getDocs(collection(db, "setupTokens")),
        ]);
        const rsvps = rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const invitations = invSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const tokens = tokSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStats(calcGlobalStats(invitations, rsvps, tokens));
        setTokenTimeline(tokenUsageOverTime(tokens));
        setRsvpTimeline(rsvpOverTime(rsvps));
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <p className="setup-subtitle" style={{ textAlign: "center" }}>Cargando estadísticas...</p>;
  if (!stats) return <p className="setup-error">Error al cargar estadísticas.</p>;

  return (
    <div>
      <div className="admin-stats-grid">
        <StatsCard value={stats.rsvpTotal} label="Respuestas totales" />
        <StatsCard value={stats.rsvpYes} label="Confirmaciones" />
        <StatsCard value={stats.rsvpNo} label="Declinaciones" />
        <StatsCard value={stats.totalGuests} label="Invitados totales" />
        <StatsCard value={stats.tokensTotal} label="Tokens generados" />
        <StatsCard value={stats.tokensUsed} label="Tokens usados" />
        <StatsCard value={stats.tokensAvailable} label="Tokens disponibles" />
        <StatsCard value={stats.invitationCount} label="Invitaciones" />
      </div>

      {stats.rsvpTotal > 0 && (
        <div className="setup-token-card" style={{ marginTop: "1rem", padding: "1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.5rem" }}>Distribución de respuestas</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <DonutChart yes={stats.rsvpYes} no={stats.rsvpNo} pending={0} size={140} />
          </div>
          <Legend items={[
            { label: "Confirman", value: stats.rsvpYes, color: "var(--accent, #22c55e)" },
            { label: "Declinan", value: stats.rsvpNo, color: "#ef4444" },
          ]} />
        </div>
      )}

      {rsvpTimeline.length > 1 && (
        <div className="setup-token-card" style={{ marginTop: "1rem", padding: "1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.5rem" }}>Respuestas por día</p>
          <MiniBar items={rsvpTimeline.map((d) => ({ label: d.date.slice(5), value: d.total }))} height={100} color="var(--accent, #22c55e)" />
        </div>
      )}

      {tokenTimeline.length > 1 && (
        <div className="setup-token-card" style={{ marginTop: "1rem", padding: "1rem" }}>
          <p className="setup-label" style={{ marginBottom: "0.5rem" }}>Tokens generados por día</p>
          <MiniBar items={tokenTimeline.map((d) => ({ label: d.date.slice(5), value: d.count }))} height={100} color="#8b5cf6" />
        </div>
      )}

      <div className="setup-token-card" style={{ marginTop: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.8rem" }}>
          Firebase: {import.meta.env.VITE_FIREBASE_PROJECT_ID || "—"}
        </p>
      </div>
    </div>
  );
}
