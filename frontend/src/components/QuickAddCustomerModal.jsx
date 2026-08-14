import { useState } from 'react';
import MoneyInput from './MoneyInput.jsx';

// "Detayli veri topla ama kullaniciya detayli form doldurtma" prensibi:
// Her ekranda sadece BIR soru sorulur. Danisman istedigi adimda
// "Hizli Kaydet" diyip cikabilir -- kalan bilgiler sonra tamamlanabilir.

const TYPES = [
  { value: 'buyer', label: 'Alıcı', icon: '🔵' },
  { value: 'tenant', label: 'Kiracı', icon: '🟢' },
  { value: 'seller', label: 'Satıcı', icon: '🟠' },
  { value: 'investor', label: 'Yatırımcı', icon: '📈' },
];

const INTEREST_OPTIONS = [
  { value: 'Daire', icon: '🏠' },
  { value: 'Villa', icon: '🏡' },
  { value: 'Arsa', icon: '🌳' },
  { value: 'İş Yeri', icon: '🏢' },
  { value: 'Diğer', icon: '📦' },
];

const SALE_BUDGET_PRESETS = [5_000_000, 10_000_000, 15_000_000, 20_000_000, 25_000_000];
const RENT_BUDGET_PRESETS = [20_000, 30_000, 50_000, 75_000, 100_000];

const DISTRICT_PRESETS = ['Kadıköy', 'Ataşehir', 'Maltepe', 'Üsküdar', 'Kartal', 'Beşiktaş', 'Şişli'];

const TIMELINE_OPTIONS = [
  { value: 'immediate', label: 'Hemen', icon: '🔴' },
  { value: '1_3_months', label: '1–3 ay', icon: '🟠' },
  { value: '3_6_months', label: '3–6 ay', icon: '🟡' },
  { value: 'later', label: 'Daha sonra', icon: '🔵' },
];

function formatMoneyShort(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const emptyDraft = {
  firstName: '',
  lastName: '',
  phone: '',
  type: '',
  propertyInterest: '',
  budget: '',
  preferredDistricts: [],
  purchaseTimeline: '',
};

export default function QuickAddCustomerModal({ onSubmit, onClose, onSwitchToDetailed }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(emptyDraft);
  const [customDistrict, setCustomDistrict] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function update(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function toggleDistrict(name) {
    setDraft((d) => {
      const has = d.preferredDistricts.includes(name);
      return {
        ...d,
        preferredDistricts: has
          ? d.preferredDistricts.filter((x) => x !== name)
          : [...d.preferredDistricts, name],
      };
    });
  }

  function addCustomDistrict() {
    const name = customDistrict.trim();
    if (!name) return;
    if (!draft.preferredDistricts.includes(name)) {
      update({ preferredDistricts: [...draft.preferredDistricts, name] });
    }
    setCustomDistrict('');
  }

  // Yapılandırılmış cevapları otomatik olarak okunabilir bir özet metnine
  // çeviriyoruz -- böylece mevcut serbest-metin eşleştirme motoru da
  // Hızlı Kayıt'tan gelen verilerden faydalanabiliyor.
  function buildRequirementsSummary() {
    const parts = [];
    if (draft.propertyInterest) parts.push(`${draft.propertyInterest} arıyor`);
    if (draft.preferredDistricts.length) parts.push(draft.preferredDistricts.join(', '));
    const timelineLabel = TIMELINE_OPTIONS.find((t) => t.value === draft.purchaseTimeline)?.label;
    if (timelineLabel) parts.push(`${timelineLabel} içinde`);
    return parts.length ? parts.join(' · ') + '.' : undefined;
  }

  const isStep0Valid = draft.firstName.trim() && draft.lastName.trim() && draft.phone.trim() && draft.type;

  async function handleSave() {
    if (!isStep0Valid) {
      setStep(0);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        phone: draft.phone.trim(),
        type: draft.type,
        budget: draft.budget === '' ? undefined : Number(draft.budget),
        propertyInterest: draft.propertyInterest || undefined,
        preferredDistricts: draft.preferredDistricts.length ? draft.preferredDistricts : undefined,
        purchaseTimeline: draft.purchaseTimeline || undefined,
        requirements: buildRequirementsSummary(),
      };
      await onSubmit(payload);
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Kaydedilirken bir hata oluştu.';
      setError(Array.isArray(message) ? message.join(', ') : message);
      setSaving(false);
    }
  }

  const isSeller = draft.type === 'seller';
  const budgetPresets = draft.type === 'tenant' ? RENT_BUDGET_PRESETS : SALE_BUDGET_PRESETS;
  const totalSteps = 5; // 0..4
  const progressPct = Math.round(((step + 1) / totalSteps) * 100);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 'min(480px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="quickadd__progress">
          <div className="quickadd__progress-bar" style={{ width: `${progressPct}%` }} />
        </div>

        {step === 0 && (
          <div>
            <h2>⚡ Hızlı Müşteri Kaydı</h2>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="form-field">
                <label>Ad *</label>
                <input value={draft.firstName} onChange={(e) => update({ firstName: e.target.value })} autoFocus />
              </div>
              <div className="form-field">
                <label>Soyad *</label>
                <input value={draft.lastName} onChange={(e) => update({ lastName: e.target.value })} />
              </div>
              <div className="form-field full">
                <label>Telefon *</label>
                <input value={draft.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="+905XXXXXXXXX" />
              </div>
            </div>
            <div style={{ marginTop: 4 }}>
              <label className="quickadd__q-label">Alıcı / Kiracı / Satıcı / Yatırımcı?</label>
              <div className="quickadd__grid-4">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`quickadd__choice${draft.type === t.value ? ' is-selected' : ''}`}
                    onClick={() => update({ type: t.value })}
                  >
                    <div className="quickadd__choice-icon">{t.icon}</div>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={onSwitchToDetailed}>📋 Detaylı Kayıt</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" disabled={!isStep0Valid || saving} onClick={handleSave}>
                  {saving ? 'Kaydediliyor…' : 'Hızlı Kaydet'}
                </button>
                <button type="button" className="btn btn-primary" disabled={!isStep0Valid} onClick={() => setStep(1)}>
                  Devam Et →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2>{isSeller ? 'Ne satıyor?' : 'Ne arıyor?'}</h2>
            <div className="quickadd__grid-3" style={{ marginTop: 20 }}>
              {INTEREST_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`quickadd__choice${draft.propertyInterest === opt.value ? ' is-selected' : ''}`}
                  onClick={() => update({ propertyInterest: opt.value })}
                >
                  <div className="quickadd__choice-icon">{opt.icon}</div>
                  {opt.value}
                </button>
              ))}
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>← Geri</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={handleSave}>
                  {saving ? 'Kaydediliyor…' : 'Kaydet ve Bitir'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>Devam Et →</button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>{isSeller ? 'Beklenti fiyatı ne kadar?' : 'Bütçesi ne kadar?'}</h2>
            <div className="quickadd__grid-3" style={{ marginTop: 20 }}>
              {budgetPresets.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`quickadd__choice${Number(draft.budget) === amount ? ' is-selected' : ''}`}
                  onClick={() => update({ budget: amount })}
                >
                  {formatMoneyShort(amount)}
                </button>
              ))}
            </div>
            <div className="form-field" style={{ marginTop: 16 }}>
              <label>Ya da tam tutar girin (₺)</label>
              <MoneyInput value={draft.budget} onChange={(v) => update({ budget: v })} />
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← Geri</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={handleSave}>
                  {saving ? 'Kaydediliyor…' : 'Kaydet ve Bitir'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>Devam Et →</button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2>Nerede?</h2>
            <div className="quickadd__chips" style={{ marginTop: 20 }}>
              {DISTRICT_PRESETS.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`quickadd__chip${draft.preferredDistricts.includes(name) ? ' is-selected' : ''}`}
                  onClick={() => toggleDistrict(name)}
                >
                  {name}
                </button>
              ))}
              {draft.preferredDistricts.filter((d) => !DISTRICT_PRESETS.includes(d)).map((name) => (
                <button
                  key={name}
                  type="button"
                  className="quickadd__chip is-selected"
                  onClick={() => toggleDistrict(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="form-field" style={{ marginTop: 12 }}>
              <label>+ Bölge Ekle</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={customDistrict}
                  onChange={(e) => setCustomDistrict(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomDistrict(); } }}
                  placeholder="Örn: Şile"
                />
                <button type="button" className="btn btn-secondary" onClick={addCustomDistrict}>Ekle</button>
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>← Geri</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={handleSave}>
                  {saving ? 'Kaydediliyor…' : 'Kaydet ve Bitir'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>Devam Et →</button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2>{isSeller ? 'Ne zaman satmayı planlıyor?' : 'Ne zaman alacak?'}</h2>
            <div className="quickadd__grid-2" style={{ marginTop: 20 }}>
              {TIMELINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`quickadd__choice${draft.purchaseTimeline === opt.value ? ' is-selected' : ''}`}
                  onClick={() => update({ purchaseTimeline: opt.value })}
                >
                  <div className="quickadd__choice-icon">{opt.icon}</div>
                  {opt.label}
                </button>
              ))}
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>← Geri</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Kaydediliyor…' : '✓ Kaydet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
