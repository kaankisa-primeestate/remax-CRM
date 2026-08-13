import { useState, useEffect } from 'react';
import { TRANSACTION_TYPES } from '../api/commissions';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import MoneyInput from './MoneyInput.jsx';

const emptyForm = {
  agentId: '',
  transactionType: 'sale',
  propertyTitle: '',
  transactionAmount: '',
  commissionRate: '',
  agentSharePercent: '50',
  withholdingTaxPercent: '0',
  vatPercent: '0',
  penaltyAmount: '0',
  dueDate: '',
  notes: '',
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function toFormState(initialValues) {
  // Yeni kayit olusturuluyorsa (initialValues yok), tarih alanina
  // varsayilan olarak bugunun tarihini koyuyoruz -- kullanici degistirmek
  // isterse zaten takvimden secebilir.
  if (!initialValues) return { ...emptyForm, dueDate: todayISO() };
  return {
    ...emptyForm,
    ...initialValues,
    agentId: initialValues.agentId || '',
    dueDate: (initialValues.dueDate || '').slice(0, 10),
  };
}

function calculatePreview(form) {
  const amount = Number(form.transactionAmount) || 0;
  const rate = Number(form.commissionRate) || 0;
  const sharePct = Number(form.agentSharePercent) || 0;
  const withholdingPct = Number(form.withholdingTaxPercent) || 0;
  const vatPct = Number(form.vatPercent) || 0;
  const penalty = Number(form.penaltyAmount) || 0;

  const gross = (amount * rate) / 100;
  const agentGross = (gross * sharePct) / 100;
  const withholding = (agentGross * withholdingPct) / 100;
  const vat = (agentGross * vatPct) / 100;
  const net = agentGross - withholding - vat - penalty;

  return { gross, agentGross, net };
}

export default function CommissionFormModal({ initialValues, onSubmit, onClose }) {
  const { isBroker } = useAuth();
  const [form, setForm] = useState(() => toFormState(initialValues));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);

  const isEdit = Boolean(initialValues?.id);

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
      const payload = {
        ...form,
        transactionAmount: Number(form.transactionAmount),
        commissionRate: Number(form.commissionRate),
        agentSharePercent: Number(form.agentSharePercent),
        withholdingTaxPercent: Number(form.withholdingTaxPercent) || 0,
        vatPercent: Number(form.vatPercent) || 0,
        penaltyAmount: Number(form.penaltyAmount) || 0,
        propertyTitle: form.propertyTitle || undefined,
        notes: form.notes || undefined,
        agentId: form.agentId || undefined,
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

  const preview = calculatePreview(form);
  const formatMoney = (n) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n || 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 'min(680px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? 'Komisyon Kaydını Düzenle' : 'Yeni Komisyon Kaydı'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>İşlem Tipi *</label>
              <select name="transactionType" value={form.transactionType} onChange={handleChange}>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Vade Tarihi *</label>
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field full">
              <label>Portföy / İşlem Açıklaması</label>
              <input
                name="propertyTitle"
                value={form.propertyTitle}
                onChange={handleChange}
                placeholder="Örn: Kadıköy 3+1 Deniz Manzaralı"
              />
            </div>

            <div className="form-field">
              <label>İşlem Bedeli (₺) *</label>
              <MoneyInput
                value={form.transactionAmount}
                onChange={(v) => setForm((f) => ({ ...f, transactionAmount: v }))}
                required
              />
            </div>
            <div className="form-field">
              <label>Komisyon Oranı (%) *</label>
              <input
                name="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.commissionRate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-field">
              <label>Danışman Payı (%) *</label>
              <input
                name="agentSharePercent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.agentSharePercent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label>Stopaj (%)</label>
              <input
                name="withholdingTaxPercent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.withholdingTaxPercent}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>KDV (%)</label>
              <input
                name="vatPercent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.vatPercent}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Ceza (₺)</label>
              <MoneyInput
                value={form.penaltyAmount}
                onChange={(v) => setForm((f) => ({ ...f, penaltyAmount: v }))}
              />
            </div>

            {isBroker && (
              <div className="form-field">
                <label>Danışman *</label>
                <select name="agentId" value={form.agentId} onChange={handleChange} required>
                  <option value="">Seçiniz</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-field full">
              <label>Notlar</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} />
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'var(--paper-raised, #ece8da)',
              borderRadius: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span>Brüt Komisyon: {formatMoney(preview.gross)}</span>
            <span>Danışman Brüt Payı: {formatMoney(preview.agentGross)}</span>
            <strong>Net Ödenecek: {formatMoney(preview.net)}</strong>
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
