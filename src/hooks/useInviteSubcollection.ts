import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDocs,
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { withWriteRetry } from "../lib/async-utils";

interface UseInviteSubcollectionOptions<T> {
  /** Opcional: transforma/ordena/limita los docs antes de setState. */
  map?: (doc: { id: string; data: DocumentData }) => T | null;
  /** Opcional: ordena la lista final antes de devolverla. */
  sort?: (a: T, b: T) => number;
  /** Opcional: número máximo de elementos a conservar. */
  limit?: number;
}

/**
 * useInviteSubcollection — Lee y escribe en una subcolección de la invitación
 * (`invitations/{token}/{subcollection}`) con el patrón que antes se
 * duplicaba en las 5 secciones sociales (GiftList, MusicPoll, Notes,
 * Reactions, RideShare): carga inicial al montar, estado local, y escritura
 * con `addDoc` + `withWriteRetry` (reintentos ante fallos transitorios).
 *
 * @param inviteToken  Token de la invitación (subcolección padre).
 * @param subcollection  Nombre de la subcolección (gifts, songs, notes,
 *                       reactions, rides).
 * @param options  map/sort/limit opcionales para procesar la lectura.
 * @returns { items, load, add, busy } — items procesados, load() para
 *          re-consultar, add(payload) que devuelve el id creado o null si
 *          falló, y busy (estado de "escribiendo").
 */
export function useInviteSubcollection<T>(
  inviteToken: string | undefined,
  subcollection: string,
  options: UseInviteSubcollectionOptions<T> = {},
) {
  // Las opciones suelen pasarse inline (nuevo objeto cada render); un ref
  // evita que load/useEffect cambien de identidad en cada render y re-consulten
  // Firestore en bucle.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [items, setItems] = useState<T[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!inviteToken) return;
    const { map, sort, limit } = optionsRef.current;
    void getDocs(collection(db, "invitations", inviteToken, subcollection))
      .then((snap) => {
        let list: T[] = [];
        for (const d of snap.docs) {
          const mapped = map ? map({ id: d.id, data: d.data() }) : ({ id: d.id, ...d.data() } as T);
          if (mapped !== null) list.push(mapped);
        }
        if (sort) list = [...list].sort(sort);
        if (limit !== undefined) list = list.slice(0, limit);
        setItems(list);
      })
      .catch(() => {});
  }, [inviteToken, subcollection]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Añade un documento con createdAt:serverTimestamp y reintentos, y
   * incrementa de forma atómica el contador anti-spam de la subcolección
   * (invitations/{token}/_counters/{name}, patrón de rsvpResponses: las
   * reglas exigen que el contador esté por debajo del tope antes de crear).
   * El setDoc con merge crea el contador (count: 1) si no existe.
   */
  const add = useCallback(
    async (payload: Record<string, unknown>): Promise<string | null> => {
      if (!inviteToken || busy) return null;
      setBusy(true);
      try {
        const newRef = doc(collection(db, "invitations", inviteToken, subcollection));
        const counterRef = doc(db, "invitations", inviteToken, "_counters", subcollection);
        const batch = writeBatch(db);
        batch.set(newRef, { ...payload, createdAt: serverTimestamp() });
        batch.set(counterRef, { count: increment(1) }, { merge: true });
        await withWriteRetry(() => batch.commit());
        load();
        return newRef.id;
      } catch {
        return null;
      } finally {
        setBusy(false);
      }
    },
    [inviteToken, subcollection, busy, load],
  );

  return { items, setItems, load, add, busy };
}
