/**
 * VenueMapSection — Mapa del recinto con puntos de interés (diferencial).
 *
 * Desde v2.109 es una sección PROPIA y reordenable de la invitación (antes
 * vivía dentro de "extras"). El admin dibuja puntos (coordenadas en %) sobre
 * un fondo; los invitados ven el mapa con las etiquetas. El fondo se recibe
 * como prop (opcional).
 */
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import CornerDecorations from "../../components/CornerDecorations";

interface VenuePoint {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
}

const VenueMapSection = memo(function VenueMapSection({
  style,
  className,
  inviteToken,
  background,
  cornerDecoration,
}: {
  style?: React.CSSProperties;
  className?: string;
  inviteToken: string;
  background?: string | undefined;
  cornerDecoration?: string;
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
    <section
      data-story-section="venuemap"
      className={`${className} flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12`}
      style={style}
    >
      <div className="story-card-wrap">
        <CornerDecorations src={cornerDecoration} />
        <div className="story-card story-panel story-card--venuemap w-full text-center">
          <p className="story-eyebrow">{t("venuemap.sectionLabel")}</p>
          <h2 className="story-title">{t("venueMap.title")}</h2>
          <div className="mt-4">
            <div
              className="venue-map"
              role="img"
              aria-label={t("venueMap.aria")}
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
          </div>
        </div>
      </div>
    </section>
  );
});

export default VenueMapSection;
