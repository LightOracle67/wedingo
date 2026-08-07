import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInviteSubcollection } from "../../hooks/useInviteSubcollection";

interface GiftItem {
  id: string;
  name: string;
  description: string;
}

/**
 * GiftListSection — Lista de regalos con reserva: cada invitado marca el
 * regalo que aporta (la reserva se guarda en Firestore y la ve el admin).
 *
 * DECISIÓN DE SEGURIDAD: no hay cancelación pública de reservas. Un delete
 * de Firestore solo puede validarse contra el documento existente (no hay
 * identidad verificada en la regla), por lo que permitir el borrado público
 * dejaría que cualquiera cancelara la reserva de otro. La cancelación la
 * gestiona el admin (reglas: delete solo admin/superadmin); si un invitado
 * necesita cambiar su aportación, contacta con los novios.
 */
export default function GiftListSection({ inviteToken, gifts }: { inviteToken?: string; gifts?: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<GiftItem[]>([]);
  const [name, setName] = useState("");
  const [activeItem, setActiveItem] = useState("");

  // Reservas existentes: cada doc { itemId, reservedBy } → Record<itemId, name>.
  // Fallback al id del doc cuando itemId no está presente (datos antiguos/tests).
  const {
    items: reservations,
    add: addReservation,
    busy,
  } = useInviteSubcollection<{ itemId: string; reservedBy: string }>(inviteToken, "gifts", {
    map: ({ id, data }) => ({ itemId: data.itemId || id, reservedBy: data.reservedBy || "" }),
  });
  const reserved = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of reservations) if (r.itemId) map[r.itemId] = r.reservedBy;
    return map;
  }, [reservations]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(gifts || "[]");
      setItems(
        Array.isArray(parsed)
          ? parsed.filter((g: unknown): g is GiftItem => !!g && typeof (g as GiftItem).name === "string")
          : [],
      );
    } catch {
      setItems([]);
    }
  }, [gifts]);

  const reserve = useCallback(
    async (itemId: string) => {
      const guestName = name.trim();
      if (!guestName || busy) return;
      setActiveItem(itemId);
      const id = await addReservation({ itemId, reservedBy: guestName.slice(0, 60) });
      if (id !== null) setName("");
      setActiveItem("");
    },
    [name, busy, addReservation],
  );

  if (items.length === 0) return null;

  return (
    <div>
      <input
        className="setup-input"
        style={{ marginBottom: "0.6rem" }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("giftList.namePlaceholder")}
        maxLength={60}
        aria-label={t("giftList.namePlaceholder")}
      />
      <div className="gift-list">
        {items.map((item) => {
          const taken = Boolean(reserved[item.id]);
          return (
            <div className="gift-list__item" key={item.id}>
              <div>
                <p className="gift-list__name">{item.name}</p>
                {item.description ? <p className="gift-list__desc">{item.description}</p> : null}
                {taken ? (
                  <p className="gift-list__reserved">{t("giftList.reservedBy", { name: reserved[item.id] })}</p>
                ) : null}
              </div>
              <button
                className="setup-button setup-button--compact"
                type="button"
                onClick={() => reserve(item.id)}
                disabled={taken || busy || !name.trim()}
              >
                {taken ? t("giftList.taken") : activeItem === item.id ? t("common.loading") : t("giftList.reserve")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
