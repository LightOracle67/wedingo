/** Hash estable (FNV-1a) de un nombre normalizado, para derivar los ids de
 *  respuesta del RSVP: un reintento reutiliza el mismo doc (idempotencia).
 *
 *  TRADEOFF DOCUMENTADO: el hash es de 32 bits (base36, ~7 chars), así que
 *  dos invitados DISTINTOS con el mismo nombre normalizado comparten doc y el
 *  segundo sobrescribe al primero. Es un comportamiento aceptado: en una
 *  boda los homónimos exactos son raros y la idempotencia (reintentos no
 *  duplican) vale más que la unicidad absoluta. Si un día se necesitara
 *  unicidad estricta, habría que pasar a un id con sal verificada por el
 *  servidor (p. ej. hash(serverSecret + nombre)) en vez del FNV-1a puro.
 *
 *  EXTRAÍDO de src/hooks/useRsvp.ts: los valores que produce son IDs de docs
 *  ya persistidos, así que la función es intocable (ver guest-id.test.ts con
 *  los hashes congelados de producción). */
export function stableGuestId(name: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
