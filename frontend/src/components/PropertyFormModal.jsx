import { useState, useEffect } from 'react';
import { PROPERTY_TYPES, LISTING_TYPES, PROPERTY_STATUSES } from '../api/properties';
import { usersApi } from '../api/auth';
import { uploadFile } from '../api/client';
import MoneyInput from './MoneyInput.jsx';
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
  contractEndDate: '',
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
  notes: '',
  agentId: '',
  ownerName: '',
  ownerPhone: '',
};

function toFormState(initialValues) {
  if (!initialValues) return emptyForm;
  // Sadece emptyForm'da tanimli alanlari kopyala -- initialValues'daki
  // id, createdAt, updatedAt gibi ekstra alanlar forma sizip backend'e
  // gitmesin (backend bu alanlari kabul etmiyor, hata veriyordu).
  const next = { ...emptyForm };
  for (const key of Object.keys(emptyForm)) {
    if (initialValues[key] !== undefined && initialValues[key] !== null) {
      next[key] = initialValues[key];
    }
  }
  next.agentId = initialValues.agentId || '';
  return next;
}

function toInitialPhotos(initialValues) {
  if (!initialValues?.photoUrls) return [];
  return initialValues.photoUrls.map((url, idx) => ({
    id: `existing-${idx}-${url}`,
    previewUrl: url,
    url,
    uploading: false,
  }));
}

export default function PropertyFormModal({ initialValues, onSubmit, onClose }) {
  const { isBroker } = useAuth();
  const [form, setForm] = useState(() => toFormState(initialValues));
  const [photos, setPhotos] = useState(() => toInitialPhotos(initialValues));
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

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // ayni dosyayi tekrar secebilmek icin input'u sifirla

    for (const file of files) {
      const tempId = `${Date.now()}-${Math.random()}`;
      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { id: tempId, previewUrl, url: null, uploading: true }]);

      try {
        const url = await uploadFile(file);
        setPhotos((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, url, uploading: false } : p)),
        );
      } catch (err) {
        setPhotos((prev) => prev.filter((p) => p.id !== tempId));
        alert('Fotoğraf yüklenemedi, tekrar deneyin.');
      }
    }
  }

  function removePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (photos.some((p) => p.uploading)) {
      setError('Fotoğraflar yükleniyor, lütfen bitmesini bekleyin.');
      return;
    }

    setSaving(true);
    try {
      // DIKKAT: photoUrls'i BOS DIZI olsa bile her zaman gonderiyoruz
      // (undefined'a cevirmiyoruz). Aksi halde "tum fotograflari sil"
      // islemi backend'e hic ulasmiyor, eski fotograflar silinmiyordu.
      const photoUrls = photos.filter((p) => p.url).map((p) => p.url);

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
        contractEndDate: form.contractEndDate || undefined,
        view: form.view || undefined,
        facade: form.facade || undefined,
        notes: form.notes || undefined,
        ownerName: form.ownerName || undefined,
        ownerPhone: form.ownerPhone || undefined,
        agentId: form.agentId || undefined,
        photoUrls,
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
      <div className="modal" style={{ maxWidth: 'min(680px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
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
              <MoneyInput value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} required />
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
            {form.listingType === 'rent' && (
              <div className="form-field">
                <label>Sözleşme Bitiş Tarihi</label>
                <input type="date" name="contractEndDate" value={form.contractEndDate || ''} onChange={handleChange} />
              </div>
            )}

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
                  <MoneyInput value={form.dues} onChange={(v) => setForm((f) => ({ ...f, dues: v }))} />
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
              <label>Fotoğraflar</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                {photos.map((p) => (
                  <div key={p.id} style={{ position: 'relative', width: 84, height: 84 }}>
                    <img
                      src={p.previewUrl}
                      alt=""
                      style={{
                        width: 84,
                        height: 84,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid var(--ink-navy-light, #cfc9b8)',
                        opacity: p.uploading ? 0.5 : 1,
                      }}
                    />
                    {p.uploading && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          color: 'var(--ink-navy)',
                        }}
                      >
                        Yükleniyor…
                      </div>
                    )}
                    {!p.uploading && (
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'var(--danger, #a8412c)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          lineHeight: '20px',
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <label className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
                + Fotoğraf Ekle
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFilesSelected}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div className="form-field">
              <label>Satıcı / Mülk Sahibi Adı (opsiyonel)</label>
              <input name="ownerName" value={form.ownerName} onChange={handleChange} placeholder="Örn: Serdar Bey" />
            </div>
            <div className="form-field">
              <label>Satıcı Telefonu (opsiyonel)</label>
              <input name="ownerPhone" value={form.ownerPhone} onChange={handleChange} placeholder="0555 123 45 67" />
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
