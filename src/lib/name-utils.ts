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
