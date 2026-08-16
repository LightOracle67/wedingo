/**
 * EmptyState — Estado vacío compartido para tablas/listas de los paneles.
 *
 * Unifica el patrón que antes se repetía con markup distinto en cada tabla
 * (asistencia, invitaciones, tokens, datos, métricas): icono opcional + título
 * + descripción, centrado y con estilo coherente.
 */

import { memo, type ReactNode } from "react";

interface EmptyStateProps {
  /** Título breve (p. ej. "Sin resultados"). */
  title: string;
  /** Descripción que aclara por qué está vacío y qué hacer. */
  description?: string;
  /** Icono decorativo (por defecto un emoji de caja vacía). */
  icon?: ReactNode;
}

const EmptyState = memo(function EmptyState({ title, description, icon = "🗂" }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__description">{description}</p> : null}
    </div>
  );
});

export default EmptyState;
