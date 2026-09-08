/**
 * DataTableSection.tsx — Sección de tabla del superadmin (extraída de DataTab).
 * ─────────────────────────────────────────────────────────────────────────
 * Agrupa el JSX de gestión de datos de invitaciones del superadmin: barra de
 * acciones en lote, confirmación destructiva, filtro por actividad, búsqueda
 * global de PII (derechos GDPR), tema en bloque y la tabla ordenable de
 * invitaciones con DataTabRow. DataTab sigue siendo el ORQUESTADOR de estado
 * y handlers (este componente es presentacional: recibe listas y callbacks).
 *
 * Refactor planificado en la auditoría (ronda 23/08/2026): DataTab (~1006
 * líneas) se divide en orquestador + sección de datos extraíble con tests.
 */
import { memo } from "react";
import type { TFunction } from "i18next";
import { SortableTh } from "../../components/SortableTh";
import { DataTabRow } from "./data-tab-row";
import { THEME_OPTIONS } from "../../lib/constants";
import type { SortOrder } from "../../lib/useColumnSort";
import type { InvitationData } from "./data-tab-helpers";

/** Resultado de la búsqueda global de PII (GDPR): invitación + nombre. */
export interface PiiResult {
  token: string;
  name: string;
  attendance: string;
}

interface DataTableSectionProps {
  invitations: InvitationData[];
  filtered: InvitationData[];
  sortedInvitations: InvitationData[];
  selected: Set<string>;
  selectedCount: number;
  totalCount: number;
  emptyIds: Set<string>;
  isEmptyCount: number;
  singleSelected: string;
  busy: boolean;
  activityFilter: string;
  onActivityFilterChange: (value: string) => void;
  confirmText: string;
  onConfirmTextChange: (value: string) => void;
  piiQuery: string;
  onPiiQueryChange: (value: string) => void;
  piiResults: PiiResult[];
  onSearchPii: () => void;
  bulkTheme: string;
  onBulkThemeChange: (value: string) => void;
  onApplyBulkTheme: () => void;
  /** Indica si la aplicación del tema en bloque está en curso (deshabilita el botón). */
  bulkThemeBusy: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectEmpty: () => void;
  onExportAll: () => void;
  onExportRange: () => void;
  onOpenDetail: (token: string) => void;
  onExportSelected: () => void;
  onPrintSelected: () => void;
  onExcelSelected: () => void;
  onMenusSelected: () => void;
  onBulkExpiry: () => void;
  onBulkSeal: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  onPurgeOld: () => void;
  onToggleSelect: (id: string) => void;
  onCopyToken: (id: string) => void;
  onToggleSort: (columnKey: string) => void;
  getIndicator: (columnKey: string) => SortOrder;
  t: TFunction;
}

/**
 * Sección de tabla de datos del superadmin. Presentacional: no maneja estado
 * propio (todo llega por props) para que DataTab conserve la lógica de
 * negocio y esta pieza sea testeable aisladamente con fixtures estáticos.
 */
export const DataTableSection = memo(function DataTableSection({
  invitations,
  filtered,
  sortedInvitations,
  selected,
  selectedCount,
  totalCount,
  emptyIds,
  isEmptyCount,
  singleSelected,
  busy,
  activityFilter,
  onActivityFilterChange,
  confirmText,
  onConfirmTextChange,
  piiQuery,
  onPiiQueryChange,
  piiResults,
  onSearchPii,
  bulkTheme,
  onBulkThemeChange,
  onApplyBulkTheme,
  bulkThemeBusy,
  onSelectAll,
  onDeselectAll,
  onSelectEmpty,
  onExportAll,
  onExportRange,
  onOpenDetail,
  onExportSelected,
  onPrintSelected,
  onExcelSelected,
  onMenusSelected,
  onBulkExpiry,
  onBulkSeal,
  onDeleteSelected,
  onDeleteAll,
  onPurgeOld,
  onToggleSelect,
  onCopyToken,
  onToggleSort,
  getIndicator,
  t,
}: DataTableSectionProps) {
  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0 }}>
      {/* ── Acciones en lote ── */}
      <div className="data-tab-actions">
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={onSelectAll}
          disabled={busy}
        >
          {t("superadmin.data.selectAll")}
        </button>
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={onDeselectAll}
          disabled={busy}
        >
          {t("superadmin.data.deselectAll")}
        </button>

        <span style={{ flex: 1, minWidth: "0.5rem" }} />

        <button type="button" className="setup-button setup-button--compact" onClick={onExportAll} disabled={busy}>
          {t("superadmin.data.exportAllBtn")} ({totalCount})
        </button>
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={onExportRange}
          disabled={busy}
        >
          {t("superadmin.data.rangeBtn")}
        </button>

        {selectedCount > 0 && (
          <>
            {singleSelected ? (
              <button
                type="button"
                className="setup-button setup-button--ghost setup-button--compact"
                onClick={() => onOpenDetail(singleSelected)}
                disabled={busy}
              >
                {t("superadmin.data.detailBtn")}
              </button>
            ) : null}
            {singleSelected ? (
              <a
                className="setup-button setup-button--ghost setup-button--compact"
                href={`/${singleSelected}/admin`}
                target="_blank"
                rel="noreferrer"
              >
                {t("superadmin.data.adminLink")}
              </a>
            ) : null}
            <button
              type="button"
              className="setup-button setup-button--compact"
              onClick={onExportSelected}
              disabled={busy}
            >
              {t("superadmin.data.exportSelectedBtn", { count: selectedCount })}
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={onPrintSelected}
              disabled={busy}
            >
              {t("superadmin.data.printBtn")} ({selectedCount})
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={onExcelSelected}
              disabled={busy}
            >
              {t("superadmin.data.excelBtn")} ({selectedCount})
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={onMenusSelected}
              disabled={busy}
            >
              {t("superadmin.data.menusBtn")} ({selectedCount})
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={onBulkExpiry}
              disabled={busy}
            >
              {t("superadmin.data.bulkExpiryBtn")} ({selectedCount})
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost setup-button--compact"
              onClick={onBulkSeal}
              disabled={busy}
            >
              {t("superadmin.data.bulkSealBtn")} ({selectedCount})
            </button>
            <button
              type="button"
              className="setup-button setup-button--danger setup-button--compact"
              onClick={onDeleteSelected}
              disabled={busy || confirmText !== "ELIMINAR"}
            >
              {t("superadmin.data.deleteSelectedBtn", { count: selectedCount })}
            </button>
          </>
        )}

        {isEmptyCount > 0 && (
          <button
            type="button"
            className="setup-button setup-button--danger setup-button--compact"
            onClick={onSelectEmpty}
            disabled={busy}
          >
            {t("superadmin.data.selectEmpty", { count: isEmptyCount })}
          </button>
        )}
      </div>

      {/* ── Confirmación destructiva ── */}
      <div className="data-tab-confirm">
        <input
          type="text"
          className="setup-input"
          value={confirmText}
          onChange={(e) => onConfirmTextChange(e.target.value)}
          placeholder={t("superadmin.data.confirmPlaceholder", { word: "ELIMINAR" })}
          aria-label={t("superadmin.data.confirmInputLabel")}
          disabled={busy}
        />
        <button
          type="button"
          className="setup-button setup-button--danger"
          onClick={onDeleteAll}
          disabled={busy || confirmText !== "ELIMINAR"}
          aria-busy={busy}
        >
          {busy ? t("common.loading") : t("superadmin.data.deleteAllBtn")}
        </button>
        <button
          type="button"
          className="setup-button setup-button--danger setup-button--ghost"
          onClick={onPurgeOld}
          disabled={busy}
        >
          {t("superadmin.data.purgeBtn")}
        </button>
      </div>

      {/* ── Filtro de actividad ── */}
      <div className="admin-filters" style={{ marginBottom: "0.75rem" }}>
        <select
          className="setup-input"
          value={activityFilter}
          onChange={(e) => onActivityFilterChange(e.target.value)}
          aria-label={t("superadmin.data.activityFilter")}
          style={{ maxWidth: "16rem" }}
        >
          <option value="todas">{t("superadmin.data.activityAll")}</option>
          <option value="hoy">{t("superadmin.data.activityToday")}</option>
          <option value="semana">{t("superadmin.data.activityWeek")}</option>
          <option value="sesion">{t("superadmin.data.activitySession")}</option>
        </select>
        <span className="setup-help" style={{ margin: 0 }}>
          {t("superadmin.data.filteredCount", { count: filtered.length, total: totalCount })}
        </span>
      </div>

      {/* ── Búsqueda global de PII (derechos GDPR) ── */}
      <div
        className="admin-filters"
        style={{ marginBottom: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
      >
        <input
          className="setup-input"
          style={{ flex: 1, minWidth: "12rem" }}
          value={piiQuery}
          onChange={(e) => onPiiQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSearchPii();
          }}
          placeholder={t("superadmin.data.piiPlaceholder")}
          aria-label={t("superadmin.data.piiPlaceholder")}
        />
        <button className="setup-button setup-button--compact" type="button" onClick={() => void onSearchPii()}>
          {t("superadmin.data.piiSearch")}
        </button>
        {piiResults.length > 0 ? (
          <span className="setup-help" style={{ margin: 0 }}>
            {t("superadmin.data.piiCount", { count: piiResults.length })}
          </span>
        ) : null}
      </div>
      {piiResults.length > 0 ? (
        <div
          style={{
            marginBottom: "0.75rem",
            maxHeight: "8rem",
            overflowY: "auto",
            border: "1px solid var(--setup-border)",
            borderRadius: "0.5rem",
          }}
        >
          {piiResults.map((r) => (
            <div
              // Key estable (token+nombre): evita remounts si la lista cambia
              // de orden o se refiltra.
              key={`${r.token}-${r.name}`}
              style={{
                padding: "0.3rem 0.6rem",
                fontSize: "0.78rem",
                borderBottom: "1px solid color-mix(in srgb, var(--setup-border) 50%, transparent)",
              }}
            >
              {r.name} — {r.attendance} · <code>{r.token}</code>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Tema en bloque para la selección ── */}
      <div className="admin-flex" style={{ marginBottom: "0.75rem", gap: "0.5rem", flexWrap: "wrap" }}>
        <select
          className="setup-input"
          value={bulkTheme}
          onChange={(e) => onBulkThemeChange(e.target.value)}
          aria-label={t("superadmin.data.bulkTheme")}
          style={{ maxWidth: "12rem" }}
        >
          {/* Catálogo real de temas (THEME_OPTIONS incluye claros/oscuros/
              premium/LGTBIQ+): evita duplicar la lista en este componente. */}
          {THEME_OPTIONS.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.value}
            </option>
          ))}
        </select>
        <button
          className="setup-button setup-button--ghost setup-button--compact"
          type="button"
          onClick={() => void onApplyBulkTheme()}
          disabled={!selected.size || bulkThemeBusy || busy}
        >
          {t("superadmin.data.bulkTheme", { count: selected.size })}
        </button>
      </div>

      {/* ── Tabla de invitaciones ── */}
      <div className="data-tab-table-wrap">
        <table className="data-tab-table">
          {/* caption visible solo para lectores de pantalla (WCAG 1.3.1). */}
          <caption className="sr-only">{t("superadmin.data.tableCaption")}</caption>
          <thead>
            <tr className="data-tab-sticky-header">
              <th scope="col" className="data-tab-th">
                <input
                  type="checkbox"
                  checked={selectedCount === totalCount && totalCount > 0}
                  onChange={() => (selectedCount === totalCount ? onDeselectAll() : onSelectAll())}
                  disabled={busy}
                  aria-label={t("superadmin.data.selectAll")}
                />
              </th>
              <SortableTh columnKey="token" order={getIndicator("token")} onSort={onToggleSort} className="data-tab-th">
                {t("superadmin.data.colToken")}
              </SortableTh>
              <SortableTh columnKey="names" order={getIndicator("names")} onSort={onToggleSort} className="data-tab-th">
                {t("superadmin.data.colNames")}
              </SortableTh>
              <SortableTh columnKey="date" order={getIndicator("date")} onSort={onToggleSort} className="data-tab-th">
                {t("superadmin.data.colDate")}
              </SortableTh>
              <SortableTh columnKey="rsvps" order={getIndicator("rsvps")} onSort={onToggleSort} className="data-tab-th">
                {t("superadmin.data.colRsvps")}
              </SortableTh>
              <SortableTh columnKey="visits" order={getIndicator("visits")} onSort={onToggleSort} className="data-tab-th">
                {t("superadmin.data.colVisits")}
              </SortableTh>
              <SortableTh
                columnKey="session"
                order={getIndicator("session")}
                onSort={onToggleSort}
                className="data-tab-th"
              >
                {t("superadmin.data.colSession")}
              </SortableTh>
              <SortableTh
                columnKey="activity"
                order={getIndicator("activity")}
                onSort={onToggleSort}
                className="data-tab-th"
              >
                {t("superadmin.data.colActivity")}
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {sortedInvitations.map((inv) => (
              <DataTabRow
                key={inv.id}
                inv={inv}
                isSelected={selected.has(inv.id)}
                isGhost={emptyIds.has(inv.id)}
                disabled={busy}
                onToggle={onToggleSelect}
                onCopyToken={onCopyToken}
                t={t}
              />
            ))}
          </tbody>
        </table>
        {!invitations.length && <p className="data-tab-empty-msg">{t("superadmin.data.noInvitations")}</p>}
      </div>
    </div>
  );
});