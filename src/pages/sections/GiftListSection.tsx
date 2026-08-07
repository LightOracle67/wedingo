import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDocs, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { withWriteRetry } from "../../lib/async-utils";

interface GiftItem { id: string; name: string; description: string; }
interface GiftReservation { reservedBy: string; }

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
  const [reserved, setReserved] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    try {
      const parsed = JSON.parse(gifts || "[]");
      setItems(Array.isArray(parsed) ? parsed.filter((g: unknown): g is GiftItem => !!g && typeof (g as GiftItem).name === "string") : []);
    } catch { setItems([]); }
  }, [gifts]);

  // Lee las reservas existentes.
  useEffect(() => {
    if (!inviteToken) return;
    void getDocs(collection(db, "invitations", inviteToken, "gifts")).then((snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as GiftReservation;
        map[d.id] = data.reservedBy || "";
      });
      setReserved(map);
    }).catch(() => {});
  }, [inviteToken]);

  const reserve = useCallback(async (itemId: string) => {
    if (!inviteToken || busy) return;
    const guestName = name.trim();
    if (!guestName) { return; }
    setBusy(itemId);
    try {
      await withWriteRetry(() => addDoc(collection(db, "invitations", inviteToken, "gifts"), {
        itemId,
        reservedBy: guestName.slice(0, 60),
        createdAt: serverTimestamp(),
      }));
      setReserved((p) => ({ ...p, [itemId]: guestName.slice(0, 60) }));
    } catch { /* las reglas o la red lo impidieron */ }
    setBusy("");
  }, [inviteToken, name, busy]);

  if (items.length === 0) return null;

  return (
    <div>
      <input className="setup-input" style={{ marginBottom: "0.6rem" }} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("giftList.namePlaceholder")} maxLength={60} aria-label={t("giftList.namePlaceholder")} />
      <div className="gift-list">
        {items.map((item) => {
          const taken = Boolean(reserved[item.id]);
          return (
            <div className="gift-list__item" key={item.id}>
              <div>
                <p className="gift-list__name">{item.name}</p>
                {item.description ? <p className="gift-list__desc">{item.description}</p> : null}
                {taken ? <p className="gift-list__reserved">{t("giftList.reservedBy", { name: reserved[item.id] })}</p> : null}
              </div>
              <button className="setup-button setup-button--compact" type="button" onClick={() => reserve(item.id)} disabled={taken || busy === item.id || !name.trim()}>
                {taken ? t("giftList.taken") : t("giftList.reserve")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
