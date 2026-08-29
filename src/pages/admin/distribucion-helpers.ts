/**
 * Utilidades puras de la pestaña Distribución.
 *
 * Se separan de DistribucionTab las funciones matemáticas que no dependen del
 * estado del componente, para poder cubrirlas con tests unitarios aislados y
 * que el tab quede como orquestación de Firestore + UI.
 */

/** Acota un porcentaje de posición (x/y) de la mesa a [0, 100]. */
export function clampPercent(v: number): number {
  return Math.min(100, Math.max(0, v));
}
