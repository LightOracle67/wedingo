import { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs, query, where, getDoc } from "firebase/firestore";
import { db, RSVP_COLLECTION_REF, INVITATION_DOC_REF } from "../../lib/firebase";
import { formatDate } from "../../lib/superadmin";
import StatsCard from "../admin/StatsCard";

export default function DashboardTab() {
  const [stats, setStats] = useState({ rsvpTotal: 0, rsvpYes: 0, rsvpNo: 0, totalGuests: 0, tokensTotal: 0, tokensUsed: 0, invitationCount: 0 });
  const [lastUpdated, setLastUpdated] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const rsvpSnap = await getDocs(RSVP_COLLECTION_REF);
        const rsvps = rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const rsvpYes = rsvps.filter((r) => r.attendance === "yes").length;
        const rsvpNo = rsvps.filter((r) => r.attendance === "no").length;
        const totalGuests = rsvps.reduce((sum, r) => sum + (r.attendance === "yes" ? 1 + (r.companions || 0) : 0), 0);

        const invDoc = await getDoc(INVITATION_DOC_REF);
        const invExists = invDoc.exists();
        if (invExists) {
          const updated = invDoc.data()._updatedAt?.toDate?.();
          if (updated) setLastUpdated(updated.toISOString());
        }

        const tokCount = await getCountFromServer(query(collection(db, "setupTokens")));
        const usedTokCount = await getCountFromServer(query(collection(db, "setupTokens"), where("used", "==", true)));

        setStats({
          rsvpTotal: rsvps.length,
          rsvpYes,
          rsvpNo,
          totalGuests,
          tokensTotal: tokCount.data().count,
          tokensUsed: usedTokCount.data().count,
          invitationCount: invExists ? 1 : 0,
        });

        setProjectId(import.meta.env.VITE_FIREBASE_PROJECT_ID || "");
      } catch {
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
        <StatsCard value={stats.rsvpTotal} label="Respuestas totales" />
        <StatsCard value={stats.rsvpYes} label="Confirmaciones" />
        <StatsCard value={stats.rsvpNo} label="Declinaciones" />
        <StatsCard value={stats.totalGuests} label="Invitados totales" />
        <StatsCard value={stats.tokensTotal} label="Tokens generados" />
        <StatsCard value={stats.tokensUsed} label="Tokens usados" />
      </div>

      <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.95rem" }}>
          <strong>Invitación:</strong> {stats.invitationCount ? "Creada y configurada" : "Sin configurar"}
        </p>
        {lastUpdated && (
          <p style={{ margin: "0.25rem 0 0", color: "var(--setup-muted)", fontSize: "0.85rem" }}>
            Última actualización: {formatDate(lastUpdated)}
          </p>
        )}
      </div>

      {projectId && (
        <div className="setup-token-card">
          <p style={{ margin: 0, color: "var(--setup-muted)", fontSize: "0.8rem" }}>
            Firebase: {projectId}
          </p>
        </div>
      )}
    </div>
  );
}
