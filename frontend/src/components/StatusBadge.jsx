import { CUSTOMER_TYPES } from '../api/customers';

export default function StatusBadge({ type }) {
  const label = CUSTOMER_TYPES.find((t) => t.value === type)?.label ?? type;
  return <span className={`status-badge status-badge--${type}`}>{label}</span>;
}
