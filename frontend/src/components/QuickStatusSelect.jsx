import { useState } from 'react';
import { PROPERTY_STATUSES } from '../api/properties';

// Liste satırı bir <Link> olduğu için, bu bileşene tıklanınca sayfa
// navigasyonunun tetiklenmemesi için stopPropagation/preventDefault kullanılır.
export default function QuickStatusSelect({ status, onChange }) {
  const [saving, setSaving] = useState(false);
  const label = PROPERTY_STATUSES.find((s) => s.value === status)?.label ?? status;

  async function handleChange(e) {
    const newStatus = e.target.value;
    if (newStatus === status) return;
    setSaving(true);
    try {
      await onChange(newStatus);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span
      className={`status-badge status-badge--${status} status-badge--select`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <select
        value={status}
        disabled={saving}
        onClick={(e) => e.stopPropagation()}
        onChange={handleChange}
        aria-label="Durumu değiştir"
      >
        {PROPERTY_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <span className="status-badge__label">{saving ? '…' : label}</span>
    </span>
  );
}
