import { useState } from 'react';
import { INTERACTION_TYPES } from '../api/customers';

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AddInteractionForm({ onSubmit }) {
  const [type, setType] = useState('call');
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [occurredAt, setOccurredAt] = useState(nowForInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Görüşme notu boş olamaz');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        type,
        notes,
        actionItems: actionItems || undefined,
        occurredAt: new Date(occurredAt).toISOString(),
      });
      setNotes('');
      setActionItems('');
      setOccurredAt(nowForInput());
    } catch (err) {
      setError('Görüşme kaydedilemedi, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <div className="form-grid">
        <div className="form-field">
          <label>Görüşme Tipi</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {INTERACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Tarih / Saat</label>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>
        <div className="form-field full">
          <label>Görüşme Notu *</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="form-field full">
          <label>Aksiyon Maddeleri</label>
          <input value={actionItems} onChange={(e) => setActionItems(e.target.value)} />
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Ekleniyor…' : 'Görüşme Ekle'}
        </button>
      </div>
    </form>
  );
}
