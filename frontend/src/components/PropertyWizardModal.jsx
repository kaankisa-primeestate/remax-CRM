import { useState } from 'react';
import { CATEGORY_FIELDS } from '../data/categoryFields';
import { uploadFile } from '../api/client';
import MoneyInput from './MoneyInput.jsx';

const CATEGORIES = [
  { value: 'apartment', label: 'Konut', icon: '🏠' },
  { value: 'land', label: 'Arsa', icon: '🌳' },
  { value: 'field', label: 'Tarla', icon: '🌾' },
  { value: 'commercial', label: 'İşyeri', icon: '🏢' },
  { value: 'timeshare', label: 'Devre Mülk', icon: '🔑' },
];

const LISTING_LABELS = { sale: 'Satılık', rent: 'Kiralık' };
const CATEGORY_LABELS = { apartment: 'Konut', land: 'Arsa', field: 'Tarla', commercial: 'İşyeri', timeshare: 'Devre Mülk' };
const DEED_STATUS_OPTIONS = ['Kat Mülkiyeti', 'Kat İrtifakı', 'Hisseli Tapu', 'Müstakil Tapu', 'Arsa Tapusu'];

const emptyDraft = {
  listingType: null,
  propertyType: null,
  title: '',
  areaM2: '',
  province: 'İstanbul',
  district: '',
  neighborhood: '',
  price: '',
  priceCurrency: 'TRY',
  deedStatus: '',
  mortgageEligible: false,
  rooms: '',
  bathrooms: '',
  floor: '',
  heatingType: '',
  dues: '',
  buildingAge: '',
  hasPool: false,
  hasGym: false,
  hasSecurity: false,
  hasParking: false,
  nearMetro: false,
  view: '',
  facade: '',
  notes: '',
  photoUrls: [],
  extraAttributes: {},
};

export default function PropertyWizardModal({ onSubmit, onClose }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(emptyDraft);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function update(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }
  function updateExtra(patch) {
    setDraft((d) => ({ ...d, extraAttributes: { ...d.extraAttributes, ...patch } }));
  }

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    for (const file of files) {
      const tempId = `${Date.now()}-${Math.random()}`;
      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { id: tempId, previewUrl, url: null, uploading: true }]);
      try {
        const url = await uploadFile(file);
        setPhotos((prev) => {
          const next = prev.map((p) => (p.id === tempId ? { ...p, url, uploading: false } : p));
          update({ photoUrls: next.filter((p) => p.url).map((p) => p.url) });
          return next;
        });
      } catch (err) {
        setPhotos((prev) => prev.filter((p) => p.id !== tempId));
        alert('Fotoğraf yüklenemedi, tekrar deneyin.');
      }
    }
  }
  function removePhoto(id) {
    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== id);
      update({ photoUrls: next.filter((p) => p.url).map((p) => p.url) });
      return next;
    });
  }

  async function handlePublish() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: draft.title,
        propertyType: draft.propertyType,
        listingType: draft.listingType,
        province: draft.province,
        district: draft.district,
        neighborhood: draft.neighborhood,
        areaM2: Number(draft.areaM2),
        price: Number(draft.price),
        priceCurrency: draft.priceCurrency,
        deedStatus: draft.deedStatus,
        mortgageEligible: draft.mortgageEligible,
        rooms: draft.rooms || undefined,
        bathrooms: draft.bathrooms === '' ? undefined : Number(draft.bathrooms),
        floor: draft.floor || undefined,
        heatingType: draft.heatingType || undefined,
        dues: draft.dues === '' ? undefined : Number(draft.dues),
        buildingAge: draft.buildingAge === '' ? undefined : Number(draft.buildingAge),
        hasPool: draft.hasPool,
        hasGym: draft.hasGym,
        hasSecurity: draft.hasSecurity,
        hasParking: draft.hasParking,
        nearMetro: draft.nearMetro,
        view: draft.view || undefined,
        facade: draft.facade || undefined,
        notes: draft.notes || undefined,
        photoUrls: draft.photoUrls,
        extraAttributes: draft.extraAttributes,
      };
      await onSubmit(payload);
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Kaydedilirken bir hata oluştu.';
      setError(Array.isArray(message) ? message.join(', ') : message);
      setSaving(false);
    }
  }

  const fields = CATEGORY_FIELDS[draft.propertyType] || [];

  function fieldValue(field) {
    return field.extra ? draft.extraAttributes[field.key] : draft[field.key];
  }
  function setFieldValue(field, value) {
    if (field.extra) updateExtra({ [field.key]: value });
    else update({ [field.key]: value });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 'min(640px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
        {step === 0 && (
          <div>
            <h2>İlanınız ne için?</h2>
            <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
              <button type="button" className="btn" style={{ flex: 1, padding: '28px 0', background: '#e6f7ec', border: '1px solid #34a853', fontSize: 18 }} onClick={() => { update({ listingType: 'sale' }); setStep(1); }}>
                🟢 Satılık
              </button>
              <button type="button" className="btn" style={{ flex: 1, padding: '28px 0', background: '#e8f0fe', border: '1px solid #4285f4', fontSize: 18 }} onClick={() => { update({ listingType: 'rent' }); setStep(1); }}>
                🔵 Kiralık
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2>Ne satıyor/kiralıyorsunuz?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" className="btn btn-secondary" style={{ padding: '24px 0', fontSize: 16 }} onClick={() => { update({ propertyType: cat.value }); setStep(2); }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{cat.icon}</div>
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>Geri</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>Temel Bilgiler</h2>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="form-field full">
                <label>İlan Başlığı *</label>
                <input value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="Örn: Kadıköy 3+1 Deniz Manzaralı" />
              </div>
              <div className="form-field">
                <label>Metrekare *</label>
                <input type="number" value={draft.areaM2} onChange={(e) => update({ areaM2: e.target.value })} />
              </div>
              {fields.map((field) => (
                <div className="form-field" key={field.key}>
                  <label>{field.label}</label>
                  {field.type === 'boolean' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 14, textTransform: 'none' }}>
                      <input type="checkbox" checked={!!fieldValue(field)} onChange={(e) => setFieldValue(field, e.target.checked)} style={{ width: 'auto' }} />
                      Var
                    </label>
                  ) : field.type === 'select' ? (
                    <select value={fieldValue(field) ?? ''} onChange={(e) => setFieldValue(field, e.target.value)}>
                      <option value="">Seçiniz</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input type={field.type === 'number' ? 'number' : 'text'} value={fieldValue(field) ?? ''} onChange={(e) => setFieldValue(field, e.target.value)} placeholder={field.placeholder} />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Geri</button>
              <button type="button" className="btn btn-primary" disabled={!draft.title || !draft.areaM2} onClick={() => setStep(3)}>Devam Et</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2>Konum</h2>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="form-field">
                <label>İl *</label>
                <input value={draft.province} onChange={(e) => update({ province: e.target.value })} />
              </div>
              <div className="form-field">
                <label>İlçe *</label>
                <input value={draft.district} onChange={(e) => update({ district: e.target.value })} placeholder="Örn: Kadıköy" />
              </div>
              <div className="form-field full">
                <label>Mahalle *</label>
                <input value={draft.neighborhood} onChange={(e) => update({ neighborhood: e.target.value })} placeholder="Örn: Göztepe" />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>Geri</button>
              <button type="button" className="btn btn-primary" disabled={!draft.province || !draft.district || !draft.neighborhood} onClick={() => setStep(4)}>Devam Et</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2>Fiyat & Hukuki</h2>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="form-field">
                <label>Fiyat (₺) *</label>
                <MoneyInput value={draft.price} onChange={(v) => update({ price: v })} />
              </div>
              <div className="form-field">
                <label>Tapu Durumu *</label>
                {(() => {
                  const isKnown = DEED_STATUS_OPTIONS.includes(draft.deedStatus);
                  const selectValue = isKnown ? draft.deedStatus : (draft.deedStatus ? 'Diğer' : '');
                  return (
                    <>
                      <select
                        value={selectValue}
                        onChange={(e) => update({ deedStatus: e.target.value === 'Diğer' ? ' ' : e.target.value })}
                      >
                        <option value="">Seçiniz</option>
                        {DEED_STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="Diğer">Diğer (yazınız)</option>
                      </select>
                      {selectValue === 'Diğer' && (
                        <input
                          style={{ marginTop: 8 }}
                          value={draft.deedStatus.trim() === '' ? '' : draft.deedStatus}
                          onChange={(e) => update({ deedStatus: e.target.value })}
                          placeholder="Tapu durumunu yazınız"
                        />
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="form-field">
                <label>Aidat (₺)</label>
                <MoneyInput value={draft.dues} onChange={(v) => update({ dues: v })} />
              </div>
              <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={draft.mortgageEligible} onChange={(e) => update({ mortgageEligible: e.target.checked })} style={{ width: 'auto' }} />
                <label style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 14 }}>Krediye uygun</label>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>Geri</button>
              <button type="button" className="btn btn-primary" disabled={!draft.price || !draft.deedStatus} onClick={() => setStep(5)}>Devam Et</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2>Fotoğraflar</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16, marginBottom: 10 }}>
              {photos.map((p) => (
                <div key={p.id} style={{ position: 'relative', width: 84, height: 84 }}>
                  <img src={p.previewUrl} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--ink-navy-light, #cfc9b8)', opacity: p.uploading ? 0.5 : 1 }} />
                  {!p.uploading && (
                    <button type="button" onClick={() => removePhoto(p.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--danger, #a8412c)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: '20px' }}>×</button>
                  )}
                </div>
              ))}
            </div>
            <label className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
              + Fotoğraf Ekle
              <input type="file" accept="image/*,video/*" multiple onChange={handleFilesSelected} style={{ display: 'none' }} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(4)}>Geri</button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(6)}>Devam Et</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2>Önizleme</h2>
            <div className="dossier__field-grid" style={{ marginTop: 16 }}>
              <div className="dossier__field"><label>Başlık</label><div>{draft.title}</div></div>
              <div className="dossier__field"><label>Tip</label><div>{LISTING_LABELS[draft.listingType]} · {CATEGORY_LABELS[draft.propertyType]}</div></div>
              <div className="dossier__field"><label>Konum</label><div>{draft.neighborhood}, {draft.district} / {draft.province}</div></div>
              <div className="dossier__field"><label>Metrekare</label><div>{draft.areaM2} m²</div></div>
              <div className="dossier__field"><label>Fiyat</label><div>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(draft.price) || 0)}</div></div>
              {fields.map((field) => {
                const v = fieldValue(field);
                if (v == null || v === '') return null;
                return <div className="dossier__field" key={field.key}><label>{field.label}</label><div>{field.type === 'boolean' ? (v ? 'Var' : 'Yok') : v}</div></div>;
              })}
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(5)}>Geri</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handlePublish}>{saving ? 'Yayınlanıyor…' : 'Yayınla'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
