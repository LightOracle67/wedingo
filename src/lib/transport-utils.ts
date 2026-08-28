/** Salida de transporte (bus/taxi) configurada por el admin. */
interface TransportDeparture {
  type?: "bus" | "taxi";
  time: string;
  url: string;
}

/**
 * Parsea el JSON de salidas de transporte (transportDepartures) de forma
 * robusta: tolera JSON inválido y filtra entradas malformadas, acotando el
 * número de resultados. Centraliza la lógica que se repetía en la sección de
 * transporte, el RSVP y el editor, para que la validación sea idéntica en
 * todos los puntos de uso.
 */
export function parseTransportDepartures(raw: string | undefined, max = 10): TransportDeparture[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, max)
      .map((d: unknown): TransportDeparture | null => {
        if (!d || typeof d !== "object") return null;
        const rec = d as Record<string, unknown>;
        return {
          type: rec.type === "taxi" ? "taxi" : "bus",
          time: typeof rec.time === "string" ? rec.time : "",
          url: typeof rec.url === "string" ? rec.url : "",
        };
      })
      .filter((d): d is TransportDeparture => d !== null);
  } catch {
    return [];
  }
}
