const NAME_PART = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’-]+";

export function normalizeFullName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Nombre completo válido: mínimo 2 palabras (nombre + apellido) y máximo 4.
 * Antes exigía exactamente 3, lo que rechazaba nombres compuestos
 * ("Ana María García") y un solo apellido ("José Pérez").
 */
export function isValidFullName(name: string): boolean {
  const normalized = normalizeFullName(name);
  if (!normalized) return false;
  return new RegExp(`^${NAME_PART}(?: ${NAME_PART}){1,3}$`).test(normalized);
}

/**
 * Clave de emparejamiento tolerante para buscar la respuesta previa del
 * invitado: colapsa espacios, pasa a minúsculas, normaliza a NFC y elimina
 * diacríticos (NFD + marcas), de modo que "jose garcia" coincide con
 * "José García". SOLO para comparación: los IDs guardados siguen usando
 * stableGuestId sobre normalizeFullName (hashes congelados en producción).
 */
export function nameKey(name: string): string {
  return normalizeFullName(name).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}
