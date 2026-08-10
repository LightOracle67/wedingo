/**
 * VenueMapSection — Mapa del recinto con puntos de interés (diferencial).
 *
 * El admin dibuja puntos (coordenadas en %) sobre un fondo; los invitados ven
 * el mapa con las etiquetas. El fondo se recibe como prop (opcional).
 */
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface VenuePoint {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
}

const VenueMapSection = memo(function VenueMapSection({
  inviteToken,
  background,
}: {
  inviteToken: string;
  background?: string | undefined;
}) {
  const { t } = useTranslation();
  const [points, setPoints] = useState<VenuePoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getDocs(collection(db, "invitations", inviteToken, "venuepoints"))
      .then((snap) => {
        if (cancelled) return;
        setPoints(
          snap.docs.map((d) => ({
            id: d.id,
            label: String(d.data().label || ""),
            x: Number(d.data().x) || 0,
            y: Number(d.data().y) || 0,
            color: String(d.data().color || "#d8b24a"),
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  if (points.length === 0) return null;

  return (
    <div
      className="venue-map"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        borderRadius: "1rem",
        overflow: "hidden",
        background: background
          ? `url(${background}) center/cover no-repeat, linear-gradient(160deg, #241c12, #3a2d1c)`
          : "linear-gradient(160deg, #241c12, #3a2d1c)",
        border: "1px solid var(--invite-shell-border)",
      }}
      role="img"
      aria-label={t("venueMap.aria")}
    >
      {points.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            style={{
              display: "block",
              width: "0.9rem",
              height: "0.9rem",
              margin: "0 auto 0.2rem",
              borderRadius: "50%",
              background: p.color || "#d8b24a",
              border: "2px solid rgba(255,255,255,0.7)",
              boxShadow: "0 0 8px rgba(0,0,0,0.4)",
            }}
          />
          <span
            style={{
              fontSize: "0.72rem",
              color: "#fff",
              background: "rgba(0,0,0,0.55)",
              padding: "0.1rem 0.45rem",
              borderRadius: "999px",
              whiteSpace: "nowrap",
              display: "block",
              textAlign: "center",
            }}
          >
            {p.label}
          </span>
        </div>
      ))}
    </div>
  );
});

export default VenueMapSection;
