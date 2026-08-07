import { useState, useEffect } from 'react';
import { PROPERTY_TYPES, LISTING_TYPES, PROPERTY_STATUSES } from '../api/properties';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  title: '',
  propertyType: 'apartment',
  listingType: 'sale',
  province: '',
  district: '',
  neighborhood: '',
  areaM2: '',
  price: '',
  priceCurrency: 'TRY',
  deedStatus: '',
  mortgageEligible: false,
  rooms: '',
  bathrooms: '',
  floor: '',
  heatingType: '',
  dues: '',
  hasPool: false,
  hasGym: false,
  hasSecurity: false,
  hasParking: false,
  view: '',
  facade: '',
  buildingAge: '',
  status: 'active',
  photoUrlsText: '',
  notes: '',
  agentId: '',
};

function toFormState(initialValues) {
  if (!initialValues) return emptyForm;
  return {
    ...emptyForm,
    ...initialValues,
    photoUrlsText: (initialValues.photoUrls || []).join('\n'),
    agentId: initialValues.agentId || '',
  };
}

export default function PropertyFormModal({ initialValues, onSubmit, onClose }) {
  const { isBroker } = useAuth();
  const [form, setForm] = useState(() => toFormState(initialValues));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);

  const isEdit = Boolean(initialValues?.id);
  const isResidential = form.propertyType === 'apartment' || form.propertyType === 'timeshare';

  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isBroker]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const photoUrls = form.photoUrlsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        ...form,
        areaM2: Number(form.areaM2),
        price: Number(form.price),
        dues: form.dues === '' ? undefined : Number(form.dues),
        bathrooms: form.bathrooms === '' ? undefined : Number(form.bathrooms),
        buildingAge: form.buildingAge === '' ? undefined : Number(form.buildingAge),
        rooms: form.rooms || undefined,
        floor: form.floor || undefined,
        heatingType: form.heatingType || undefined,
        view: form.view || undefined,
        facade: form.facade || undefined,
        notes: form.notes || undefined,
        agentId: form.agentId || undefined,
        photoUrls: photoUrls.length ? photoUrls : undefined,
      };
      delete payload.photoUrlsText;

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
      <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? 'Portföyü Düzenle' : 'Yeni Portföy Ekle'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field full">
              <label>Başlık *</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Örn: Kadıköy 3+1 Deniz Manzaralı"
                required
              />
            </div>
            <div className="form-field">
              <label>Gayrimenkul Tipi *</label>
              <select name="propertyType" value={form.propertyType} onChange={handleChange}>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Satılık / Kiralık *</label>
              <select name="listingType" value={form.listingType} onChange={handleChange}>
                {LISTING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>İl *</label>
              <input name="province" value={form.province} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>İlçe *</label>
              <input name="district" value={form.district} onChange={handleChange} required />
            </div>
            <div className="form-field full">
              <label>Mahalle *</label>
              <input name="neighborhood" value={form.neighborhood} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>Metrekare *</label>
              <input name="areaM2" type="number" min="1" value={form.areaM2} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Fiyat (₺) *</label>
              <input name="price" type="number" min="0" value={form.price} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Tapu Durumu *</label>
              <input
                name="deedStatus"
                value={form.deedStatus}
                onChange={handleChange}
                placeholder="Örn: Kat Mülkiyeti"
                required
              />
            </div>
            <div className="form-field">
              <label>Durum</label>
              <select name="status" value={form.status} onChange={handleChange}>
                {PROPERTY_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="mortgageEligible"
                name="mortgageEligible"
                checked={form.mortgageEligible}
                onChange={handleChange}
                style={{ width: 'auto' }}
              />
              <label htmlFor="mortgageEligible" style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                Krediye uygun
              </label>
            </div>

            {isResidential && (
              <>
                <div className="form-field">
                  <label>Oda Sayısı</label>
                  <input name="rooms" value={form.rooms} onChange={handleChange} placeholder="Örn: 3+1" />
                </div>
                <div className="form-field">
                  <label>Banyo Sayısı</label>
                  <input name="bathrooms" type="number" min="0" value={form.bathrooms} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Bulunduğu Kat</label>
                  <input name="floor" value={form.floor} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Isıtma Tipi</label>
                  <input name="heatingType" value={form.heatingType} onChange={handleChange} placeholder="Örn: Doğalgaz Kombi" />
                </div>
                <div className="form-field">
                  <label>Aidat (₺)</label>
                  <input name="dues" type="number" min="0" value={form.dues} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Yapı Yaşı</label>
                  <input name="buildingAge" type="number" min="0" value={form.buildingAge} onChange={handleChange} />
                </div>
              </>
            )}

            <div className="form-field">
              <label>Manzara</label>
              <input name="view" value={form.view} onChange={handleChange} placeholder="Örn: Deniz" />
            </div>
            <div className="form-field">
              <label>Cephe</label>
              <input name="facade" value={form.facade} onChange={handleChange} placeholder="Örn: Güney" />
            </div>

            <div className="form-field full" style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
              {[
                ['hasPool', 'Havuz'],
                ['hasGym', 'Spor Salonu'],
                ['hasSecurity', 'Güvenlik'],
                ['hasParking', 'Otopark'],
              ].map(([name, label]) => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 14, textTransform: 'none' }}>
                  <input type="checkbox" name={name} checked={form[name]} onChange={handleChange} style={{ width: 'auto' }} />
                  {label}
                </label>
              ))}
            </div>

            {isBroker && (
              <div className="form-field">
                <label>Danışman</label>
                <select name="agentId" value={form.agentId} onChange={handleChange}>
                  <option value="">Atanmamış</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-field full">
              <label>Fotoğraf Linkleri (her satıra bir link)</label>
              <textarea
                name="photoUrlsText"
                value={form.photoUrlsText}
                onChange={handleChange}
                placeholder="https://... (dosya yükleme henüz desteklenmiyor, harici bir görsel linki yapıştırın)"
              />
            </div>
            <div className="form-field full">
              <label>Notlar</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} />
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
