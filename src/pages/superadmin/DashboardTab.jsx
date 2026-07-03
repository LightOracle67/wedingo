import { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs, query } from "firebase/firestore";
import { db, RSVP_COLLECTION_REF } from "../../lib/firebase";
import { formatDate } from "../../lib/superadmin";
import StatsCard from "../admin/StatsCard";

export default function DashboardTab() {
  const [stats, setStats] = useState({ rsvpTotal: 0, rsvpYes: 0, rsvpNo: 0, totalGuests: 0, tokensTotal: 0, tokensUsed: 0 });
  const [recentRsvps, setRecentRsvps] = useState([]);
  const [invitationExists, setInvitationExists] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const rsvpSnap = await getDocs(RSVP_COLLECTION_REF);
        const rsvps = rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const rsvpYes = rsvps.filter((r) => r.attendance === "yes").length;
        const rsvpNo = rsvps.filter((r) => r.attendance === "no").length;
        const totalGuests = rsvps.reduce((sum, r) => sum + (r.attendance === "yes" ? 1 + (r.companions || 0) : 0), 0);

        setStats({ rsvpTotal: rsvps.length, rsvpYes, rsvpNo, totalGuests, tokensTotal: 0, tokensUsed: 0 });

        const sorted = rsvps.sort((a, b) => {
          const aTime = a.submittedAt?.toDate?.()?.getTime() || 0;
          const bTime = b.submittedAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });
        setRecentRsvps(sorted.slice(0, 5));

        const invSnap = await getDocs(query(collection(db, "setupTokens"), limit(100)));
        const tokens = invSnap.docs.map((d) => d.data());
        setStats((prev) => ({
          ...prev,
          tokensTotal: tokens.length,
          tokensUsed: tokens.filter((t) => t.used === true).length,
        }));

        const invDoc = await getDocs(collection(db, "publicConfig"));
        const invDocData = invDoc.docs.find((d) => d.id === "invitation");
        if (invDocData && invDocData.exists()) {
          setInvitationExists(true);
          const updated = invDocData.data()._updatedAt?.toDate?.();
          if (updated) setLastUpdated(updated.toISOString());
        }

        const tokCount = await getCountFromServer(query(collection(db, "setupTokens")));
        setStats((prev) => ({ ...prev, tokensTotal: tokCount.data().count }));
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p className="setup-subtitle" style={{ textAlign: "center" }}>Cargando estadísticas...</p>;
  }

  const cardStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "0.75rem",
    marginBottom: "1.25rem",
  };

  return (
    <div>
      <div style={cardStyle}>
        <StatsCard value={stats.rsvpTotal} label="Respuestas RSVP" />
        <StatsCard value={stats.rsvpYes} label="Confirmados" />
        <StatsCard value={stats.rsvpNo} label="Declinados" />
        <StatsCard value={stats.totalGuests} label="Invitados totales" />
        <StatsCard value={stats.tokensTotal} label="Tokens generados" />
        <StatsCard value={stats.tokensUsed} label="Tokens usados" />
      </div>

      {invitationExists && (
        <div className="setup-token-card" style={{ marginBottom: "1.25rem" }}>
          <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.95rem" }}>
            <strong>Invitación:</strong> Creada y configurada
          </p>
          {lastUpdated && (
            <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.85rem" }}>
              Última actualización: {formatDate(lastUpdated)}
            </p>
          )}
        </div>
      )}

      {recentRsvps.length > 0 && (
        <div>
          <h3 className="setup-label" style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            Últimas confirmaciones
          </h3>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {recentRsvps.map((r) => (
              <div
                key={r.id}
                className="setup-token-card"
                style={{ padding: "0.6rem 0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <span style={{ color: "var(--setup-title)", fontWeight: 700 }}>
                    {r.guestName}
                  </span>
                  <span style={{ color: "var(--setup-muted)", fontSize: "0.85rem", marginLeft: "0.5rem" }}>
                    {r.attendance === "yes" ? `✓ Acompañantes: ${r.companions || 0}` : "✗ No asiste"}
                  </span>
                </div>
                <span style={{ color: "var(--setup-muted)", fontSize: "0.8rem" }}>
                  {r.submittedAt?.toDate?.() ? formatDate(r.submittedAt.toDate().toISOString()) : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
