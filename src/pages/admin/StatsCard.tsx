import { memo } from "react";

const StatsCard = memo(function StatsCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-stats-card">
      <span className="admin-stats-card__value">{value}</span>
      <span className="admin-stats-card__label">{label}</span>
    </div>
  );
});

export default StatsCard;
