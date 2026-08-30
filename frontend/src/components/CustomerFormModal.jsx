import { useState, useEffect } from 'react';
import { CUSTOMER_TYPES } from '../api/customers';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import MoneyInput from './MoneyInput.jsx';
import { LEAD_SOURCES } from '../constants/leadSources.js';

const emptyForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  type: 'buyer',
  budget: '',
  budgetCurrency: 'TRY',
  requirements: '',
  notes: '',
  agentId: '',
  propertyInterest: '',
  preferredDistrictsText: '',
  purchaseTimeline: '',
  leadSource: '',
};

const TIMELINE_OPTIONS = [
  { value: '', label: 'Belirtilmedi' },
  { value: 'immediate', label: 'Hemen' },
  { value: '1_3_months', label: '1–3 ay içinde' },
  { value: '3_6_months', label: '3–6 ay içinde' },
  { value: 'later', label: 'Daha sonra' },
];

export default function CustomerFormModal({ initialValues, onSubmit, onClose }) {
  const { isBroker } = useAuth();
  const [form, setForm] = useState({
    ...emptyForm,
    ...initialValues,
    agentId: initialValues?.agentId || '',
    preferredDistrictsText: (initialValues?.preferredDistricts || []).join(', '),
    purchaseTimeline: initialValues?.purchaseTimeline || '',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);

  const isEdit = Boolean(initialValues?.id);

  // Sadece Broker müşteriyi belirli bir danışmana atayabilir; bir
  // Danışman için bu alan gösterilmez (backend zaten kendisine atar).
  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isBroker]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // DIKKAT: initialValues (API'den gelen tam musteri objesi) id,
      // createdAt, updatedAt, interactions gibi alanlar icerir. Bunlari
      // ASLA backend'e geri gondermiyoruz -- sadece DTO'nun tanidigi
      // alanlari acikca seciyoruz (whitelist).
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        type: form.type,
        budget: form.budget === '' ? undefined : Number(form.budget),
        email: form.email || undefined,
        address: form.address || undefined,
        requirements: form.requirements || undefined,
        notes: form.notes || undefined,
        agentId: form.agentId || undefined,
        propertyInterest: form.propertyInterest || undefined,
        preferredDistricts: form.preferredDistrictsText
          ? form.preferredDistrictsText.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        purchaseTimeline: form.purchaseTimeline || undefined,
        leadSource: form.leadSource || undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      const message =
        err?.response?.data?.message ??
        'Kaydedilirken bir hata oluştu. Bilgileri kontrol edip tekrar deneyin.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? 'Müşteriyi Düzenle' : 'Yeni Müşteri Kaydı'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Ad *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Soyad *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Telefon *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+905XXXXXXXXX"
                required
              />
            </div>
            <div className="form-field">
              <label>E-posta</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Müşteri Tipi *</label>
              <select name="type" value={form.type} onChange={handleChange}>
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Bütçe (₺)</label>
              <MoneyInput value={form.budget} onChange={(v) => setForm((f) => ({ ...f, budget: v }))} />
            </div>
            {isBroker && (
              <div className="form-field">
                <label>Danışman</label>
                <select name="agentId" value={form.agentId} onChange={handleChange}>
                  <option value="">Atanmamış</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-field">
              <label>Ne Arıyor</label>
              <input name="propertyInterest" value={form.propertyInterest} onChange={handleChange} placeholder="Örn: Daire, Villa, Arsa" />
            </div>
            <div className="form-field">
              <label>Bölge Tercihi</label>
              <input name="preferredDistrictsText" value={form.preferredDistrictsText} onChange={handleChange} placeholder="Örn: Kadıköy, Ataşehir" />
            </div>
            <div className="form-field">
              <label>Zaman Çizelgesi</label>
              <select name="purchaseTimeline" value={form.purchaseTimeline} onChange={handleChange}>
                {TIMELINE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Nereden Geldi?</label>
              <select name="leadSource" value={form.leadSource} onChange={handleChange}>
                <option value="">Belirtilmedi</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field full">
              <label>Adres</label>
              <input name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="form-field full">
              <label>Aradığı Özellikler</label>
              <textarea
                name="requirements"
                value={form.requirements}
                onChange={handleChange}
                placeholder="Örn: 3+1, Kadıköy, deniz manzaralı, krediye uygun"
                spellCheck="true"
                lang="tr"
              />
            </div>
            <div className="form-field full">
              <label>Notlar</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} spellCheck="true" lang="tr" />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Kaydediliyor…' : isEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
