import { COMMISSION_STATUSES } from '../api/commissions';
export function CommissionStatusBadge({ status }) {
  const label = COMMISSION_STATUSES.find((s) => s.value === status)?.label ?? status;
  return <span className={`status-badge status-badge--${status}`}>{label}</span>;
}
