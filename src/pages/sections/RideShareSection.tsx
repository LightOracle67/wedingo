import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInviteSubcollection } from "../../hooks/useInviteSubcollection";

interface Ride {
  id: string;
  guestName: string;
  origin: string;
  seats: number;
}

/**
 * RideShareSection — Tablón de compartir coche: los invitados publican su
 * origen y las plazas que ofrecen. No hay botón de "unirse" en la página
 * pública (los interesados se coordinan por su cuenta); el panel de admin
 * ve todas las ofertas para ponerse en contacto.
 */
export default function RideShareSection({ inviteToken }: { inviteToken?: string }) {
  const { t } = useTranslation();
  const { items: rides, add: addRide } = useInviteSubcollection<Ride>(inviteToken, "rides", {
    map: ({ id, data }) => ({
      id,
      guestName: data.guestName || "",
      origin: data.origin || "",
      seats: Number(data.seats) || 0,
    }),
  });
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [seats, setSeats] = useState("2");

  const publish = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!origin.trim()) return;
      const id = await addRide({
        guestName: name.trim().slice(0, 60) || "—",
        origin: origin.trim().slice(0, 200),
        seats: Math.max(1, Math.min(8, Number(seats) || 1)),
      });
      if (id !== null) setOrigin("");
    },
    [origin, name, seats, addRide],
  );

  return (
    <div>
      <form className="notes-form" onSubmit={publish}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            className="setup-input"
            style={{ flex: 1, minWidth: "10rem" }}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder={t("rideShare.originPlaceholder")}
            maxLength={200}
            aria-label={t("rideShare.originPlaceholder")}
          />
          <input
            className="setup-input"
            style={{ width: "4.5rem" }}
            type="number"
            min={1}
            max={8}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            aria-label={t("rideShare.seatsLabel")}
          />
        </div>
        <input
          className="setup-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("rideShare.namePlaceholder")}
          maxLength={60}
          aria-label={t("rideShare.namePlaceholder")}
        />
        <button className="setup-button" type="submit" disabled={!origin.trim()}>
          {t("rideShare.publish")}
        </button>
      </form>
      <div className="rides-share" aria-live="polite">
        {rides.length === 0 ? <p className="setup-help">{t("rideShare.empty")}</p> : null}
        {rides.map((r) => (
          <div className="rides-share__item" key={r.id}>
            <div>
              <p className="rides-share__origin">{r.origin}</p>
              <p className="rides-share__meta">
                {r.guestName} · 🚗 {r.seats} {t("rideShare.seatsWord")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
