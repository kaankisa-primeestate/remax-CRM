import { PROPERTY_STATUSES, LISTING_TYPES } from '../api/properties';

export function PropertyStatusBadge({ status }) {
  const label = PROPERTY_STATUSES.find((s) => s.value === status)?.label ?? status;
  return <span className={`status-badge status-badge--${status}`}>{label}</span>;
}

export function ListingTypeBadge({ listingType }) {
  const label = LISTING_TYPES.find((t) => t.value === listingType)?.label ?? listingType;
  return <span className={`status-badge status-badge--${listingType}`}>{label}</span>;
}
