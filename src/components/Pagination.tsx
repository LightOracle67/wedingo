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
  page,
  totalPages,
  pageSize,
  total,
  pageSizes,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { t } = useTranslation();
  // Con 0 resultados totalPages es 0: el índice no debe ser negativo ni
  // mostrar "Página 1 de 0".
  const safeTotal = Math.max(0, totalPages);
  const safePage = Math.max(0, Math.min(page, Math.max(0, safeTotal - 1)));

  return (
    <div className="pagination-bar">
      <div className="pagination-controls">
        <span className="setup-help pagination-meta">{t("pagination.show")}</span>
        <select
          aria-label={t("pagination.pageSizeLabel")}
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(0);
          }}
          className="pagination-page-size"
        >
          {pageSizes.map((s: number) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="setup-help pagination-meta">&middot; {t("pagination.total", { count: total })}</span>
      </div>
      <div className="pagination-controls">
        <button
          className="setup-button setup-button--ghost setup-button--compact"
          type="button"
          aria-label={t("pagination.prevPage")}
          title={t("pagination.prevPage")}
          disabled={safePage === 0}
          onClick={() => onPageChange(safePage - 1)}
        >
          ←
        </button>
        <span className="setup-help pagination-meta">
          {t("pagination.page", { current: safePage + 1, total: safeTotal })}
        </span>
        <button
          className="setup-button setup-button--ghost setup-button--compact"
          type="button"
          aria-label={t("pagination.nextPage")}
          title={t("pagination.nextPage")}
          disabled={safePage >= totalPages - 1}
          onClick={() => onPageChange(safePage + 1)}
        >
          →
        </button>
      </div>
    </div>
  );
});

export default Pagination;
