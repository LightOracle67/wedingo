import { memo } from "react";
import type { TFunction } from "i18next";

interface InvitationRowData {
  id: string;
  firstName: string;
  secondName: string;
  adminUsername: string;
  rsvpCount: number;
  weddingDate: string;
  hasSession: boolean;
  visits: number;
  lastActivity: string;
}

interface DataTabRowProps {
  inv: InvitationRowData;
  isSelected: boolean;
  isGhost: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
  onCopyToken: (id: string) => void;
  t: TFunction;
}

/** Fila de la tabla de invitaciones del panel de datos (presentación pura). */
export const DataTabRow = memo(function DataTabRow({
  inv,
  isSelected,
  isGhost,
  disabled,
  onToggle,
  onCopyToken,
  t,
}: DataTabRowProps) {
  return (
    <tr className="data-tab-tr" style={{ opacity: isGhost ? 0.7 : 1 }}>
      <td className="data-tab-td">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(inv.id)}
          disabled={disabled}
          aria-label={`${t("superadmin.data.select")} ${inv.id}`}
        />
      </td>
      <td className="data-tab-td">
        {/* Token copiable con teclado: role=button + Enter/Espacio
            (WCAG 2.1.1), además del clic. */}
        <code
          className="data-tab-code-copy"
          role="button"
          tabIndex={0}
          onClick={() => onCopyToken(inv.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onCopyToken(inv.id);
            }
          }}
          aria-label={`${t("superadmin.data.copyToken")}: ${inv.id}`}
        >
          {inv.id}
        </code>
      </td>
      <td className="data-tab-td">
        {inv.firstName ? (
          `${inv.firstName} & ${inv.secondName}`
        ) : (
          <span className="data-tab-empty-name">{t("superadmin.data.emptyInvitation")}</span>
        )}
        {inv.adminUsername ? <span className="data-tab-admin-user">@{inv.adminUsername}</span> : null}
      </td>
      <td className="data-tab-td" style={{ whiteSpace: "nowrap" }}>
        {inv.weddingDate || "—"}
      </td>
      <td className="data-tab-td" style={{ textAlign: "center" }}>
        {inv.rsvpCount}
      </td>
      <td className="data-tab-td" style={{ textAlign: "center" }}>
        {inv.visits}
      </td>
      <td className="data-tab-td" style={{ textAlign: "center" }}>
        {inv.hasSession ? "🟢" : "—"}
      </td>
      <td className="data-tab-td" style={{ fontSize: "0.7rem", color: "var(--setup-muted)" }}>
        {inv.lastActivity ? new Date(inv.lastActivity).toLocaleString() : "—"}
      </td>
    </tr>
  );
});
