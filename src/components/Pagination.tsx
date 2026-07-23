import { memo } from "react";
import { useTranslation } from "react-i18next";

interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  pageSizes: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const Pagination = memo(function Pagination({
  page, totalPages, pageSize, total, pageSizes, onPageChange, onPageSizeChange
}: PaginationProps) {
  const { t } = useTranslation();
  const safePage = Math.min(page, totalPages - 1);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between", marginTop: "0.5rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <span className="setup-help" style={{ fontSize: "0.75rem" }}>{t("attendance.show")}</span>
        <select value={pageSize} onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(0); }}
          style={{ fontSize: "0.75rem", padding: "0.15rem 0.3rem", borderRadius: "4px", border: "1px solid var(--setup-border)", background: "var(--setup-bg)", color: "var(--setup-text)" }}>
          {pageSizes.map((s: number) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="setup-help" style={{ fontSize: "0.75rem" }}>
          &middot; {t("attendance.total", { count: total })}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button"
          disabled={safePage === 0} onClick={() => onPageChange(safePage - 1)}>←</button>
        <span className="setup-help" style={{ fontSize: "0.75rem" }}>{t("attendance.page", { current: safePage + 1, total: totalPages })}</span>
        <button className="setup-button setup-button--ghost setup-button--compact" type="button"
          disabled={safePage >= totalPages - 1} onClick={() => onPageChange(safePage + 1)}>→</button>
      </div>
    </div>
  );
});

export default Pagination;
