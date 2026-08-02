const NAME_PART = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’-]+";

export function normalizeFullName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Nombre completo válido: exactamente 3 palabras (nombre + 2 apellidos).
 * Rechaza nombres con 1 o 2 palabras y más de 3.
 */
export function isValidFullName(name: string): boolean {
  const normalized = normalizeFullName(name);
  if (!normalized) return false;
  return new RegExp(`^${NAME_PART}(?: ${NAME_PART}){2}$`).test(normalized);
}
