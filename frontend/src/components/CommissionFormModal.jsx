import { useState, useEffect } from 'react';
import { TRANSACTION_TYPES, commissionsApi } from '../api/commissions';
import { usersApi } from '../api/auth';
import { transactionsApi } from '../api/transactions';
import { useAuth } from '../context/AuthContext.jsx';
import MoneyInput from './MoneyInput.jsx';

const emptyForm = {
  agentId: '',
  transactionId: '',
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
  const { isBroker, user } = useAuth();
  const [form, setForm] = useState(() => toFormState(initialValues));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);
  const [roster, setRoster] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rateSuggestion, setRateSuggestion] = useState(null);

  const isEdit = Boolean(initialValues?.id);

  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
    }
    usersApi.listAgentRoster().then(setRoster).catch(() => setRoster([]));
    // Sadece yeni kayit olustururken islem listesi gerekli -- duzenlemede
    // (isEdit) isbirlikli paylasim zaten uygulanmis bir kayittir, tekrar
    // isleme baglamaya gerek yok.
    if (!isEdit) {
      transactionsApi.list().then(setTransactions).catch(() => setTransactions([]));
    }
  }, [isBroker, isEdit]);

  const selectedTransaction = transactions.find((t) => t.id === form.transactionId) || null;
  const isCollaborative = Boolean(selectedTransaction?.collaboratorAgentId && selectedTransaction?.splitFinalizedAt);
  const nameFor = (id) => roster.find((r) => r.id === id)?.name || 'Bilinmeyen';

  const effectiveAgentId = isBroker ? form.agentId : user?.id;

  // Kademeli Prim onerisi: agentId + islem tutari belirliyse, danismanin
  // o yilki cirosuna gore bir oran onerisi cekilir -- form alanini
  // OTOMATIK DOLDURMAZ, sadece bir bilgi notu olarak gosterilir, "Uygula"
  // butonuna basinca elle kabul edilir (CMA'daki gibi oneri/onay ayrimi).
  useEffect(() => {
    if (isEdit || !effectiveAgentId || !form.transactionAmount || Number(form.transactionAmount) <= 0) {
      setRateSuggestion(null);
      return;
    }
    const timeout = setTimeout(() => {
      commissionsApi
        .suggestRate(effectiveAgentId, Number(form.transactionAmount))
        .then((data) => setRateSuggestion(data.appliedTier ? data : null))
        .catch(() => setRateSuggestion(null));
    }, 400);
    return () => clearTimeout(timeout);
  }, [effectiveAgentId, form.transactionAmount, isEdit]);

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
        agentId: isCollaborative ? undefined : (form.agentId || undefined),
        transactionId: form.transactionId || undefined,
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
            {!isEdit && transactions.length > 0 && (
              <div className="form-field full">
                <label>İşleme Bağla (opsiyonel)</label>
                <select
                  value={form.transactionId}
                  onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
                >
                  <option value="">Bağlanmasın (serbest kayıt)</option>
                  {transactions.map((t) => {
                    const label = t.externalPropertyLabel || t.externalCustomerLabel || `İşlem (${t.stage})`;
                    const collabTag = t.collaboratorAgentId && t.splitFinalizedAt ? ' 🤝' : '';
                    return (
                      <option key={t.id} value={t.id}>{label}{collabTag}</option>
                    );
                  })}
                </select>
                {isCollaborative && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, marginBottom: 0, background: '#eef3f9', padding: '8px 10px', borderRadius: 6 }}>
                    🤝 Bu işlem <strong>işbirlikli satış</strong> — onaylanmış paylaşıma göre komisyon otomatik olarak iki ayrı kayıt halinde oluşturulacak:{' '}
                    <strong>{nameFor(selectedTransaction.agentId)}</strong> (%{selectedTransaction.commissionSplitPercentage ?? 50}) ve{' '}
                    <strong>{nameFor(selectedTransaction.collaboratorAgentId)}</strong> (%{100 - (selectedTransaction.commissionSplitPercentage ?? 50)}).
                    {' '}Aşağıdaki "Danışman Payı" oranı, bu iki paya bölünecek toplam havuzu belirler.
                  </p>
                )}
              </div>
            )}

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
              {rateSuggestion && (
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 0' }}>
                  💡 Kademeli Prim önerisi: bu yılki ciro ({new Intl.NumberFormat('tr-TR').format(rateSuggestion.ytdVolume)} ₺ + bu işlem) eşiği aştığı için <strong>%{rateSuggestion.appliedTier.rate}</strong> önerilir.{' '}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, agentSharePercent: String(rateSuggestion.appliedTier.rate) }))}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-navy)', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 11 }}
                  >
                    Uygula
                  </button>
                </p>
              )}
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

            {isBroker && !isCollaborative && (
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
            <span>Danışman Brüt Payı (havuz): {formatMoney(preview.agentGross)}</span>
            {isCollaborative ? (
              <>
                <span style={{ paddingTop: 4, borderTop: '1px dashed var(--paper-line)' }}>
                  {nameFor(selectedTransaction.agentId)} payı (%{selectedTransaction.commissionSplitPercentage ?? 50}): {formatMoney((preview.net * (selectedTransaction.commissionSplitPercentage ?? 50)) / 100)}
                </span>
                <span>
                  {nameFor(selectedTransaction.collaboratorAgentId)} payı (%{100 - (selectedTransaction.commissionSplitPercentage ?? 50)}): {formatMoney((preview.net * (100 - (selectedTransaction.commissionSplitPercentage ?? 50))) / 100)}
                </span>
              </>
            ) : (
              <strong>Net Ödenecek: {formatMoney(preview.net)}</strong>
            )}
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
