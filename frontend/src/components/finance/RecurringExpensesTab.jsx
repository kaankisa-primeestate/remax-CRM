import { useEffect, useState, useCallback } from 'react';
import { recurringExpensesApi } from '../../api/recurringExpenses';
import { expensesApi } from '../../api/expenses';
import { bankAccountsApi, formatMoney } from '../../api/bankAccounts';

const currentPeriod = () => new Date().toISOString().slice(0, 7); // YYYY-MM

// Sabit Gider Sablonu: kira, internet gibi her ay tekrarlanan giderlerin
// sablonu + o donem icin "bekleyen odemeler" listesi. Odeme yapildiginda
// GERCEK bir Expense kaydi olusur (backend uzerinden) -- boylece tum para
// hareketleri her zaman Giderler sekmesinde de gorunur, cift kayit olmaz.
export default function RecurringExpensesTab() {
  const [templates, setTemplates] = useState([]);
  const [pending, setPending] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period] = useState(currentPeriod());

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(''); // categoryId
  const [defaultAmount, setDefaultAmount] = useState('');
  const [dueDayOfMonth, setDueDayOfMonth] = useState('1');
  const [defaultBankAccountId, setDefaultBankAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payReferenceNo, setPayReferenceNo] = useState('');
  const [paySaving, setPaySaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [templateData, pendingData, accData, catData] = await Promise.all([
      recurringExpensesApi.list(),
      recurringExpensesApi.getPending(period),
      bankAccountsApi.list().catch(() => []),
      expensesApi.listCategories().catch(() => []),
    ]);
    setTemplates(templateData);
    setPending(pendingData);
    setAccounts(accData);
    setCategories(catData);
    if (catData.length > 0) {
      setCategory((prev) => prev || catData[0].id);
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setTitle('');
    setCategory(categories.length > 0 ? categories[0].id : '');
    setDefaultAmount('');
    setDueDayOfMonth('1');
    setDefaultBankAccountId('');
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim() || !defaultAmount || Number(defaultAmount) <= 0) return;
    setSaving(true);
    try {
      await recurringExpensesApi.create({
        title: title.trim(),
        categoryId: category,
        defaultAmount: Number(defaultAmount),
        dueDayOfMonth: Number(dueDayOfMonth),
        defaultBankAccountId: defaultBankAccountId || undefined,
      });
      resetForm();
      load();
    } catch {
      alert('Şablon eklenemedi, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(template) {
    try {
      await recurringExpensesApi.update(template.id, { isActive: !template.isActive });
      load();
    } catch {
      alert('Güncellenemedi, tekrar deneyin.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu sabit gider şablonu silinsin mi? (Geçmiş ödemeler etkilenmez)')) return;
    try {
      await recurringExpensesApi.remove(id);
      load();
    } catch {
      alert('Silinemedi, tekrar deneyin.');
    }
  }

  function openPayForm(pendingItem) {
    setPayingId(pendingItem.template.id);
    setPayAmount(String(pendingItem.template.defaultAmount));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayBankAccountId(pendingItem.template.defaultBankAccountId || '');
    setPayReferenceNo('');
  }

  async function handlePay(templateId) {
    if (!payAmount || Number(payAmount) <= 0) return;
    setPaySaving(true);
    try {
      await recurringExpensesApi.pay(templateId, {
        amount: Number(payAmount),
        date: payDate,
        bankAccountId: payBankAccountId || undefined,
        referenceNo: payReferenceNo.trim() || undefined,
      });
      setPayingId(null);
      load();
    } catch {
      alert('Ödeme kaydedilemedi, tekrar deneyin.');
    } finally {
      setPaySaving(false);
    }
  }

  return (
    <>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni Sabit Gider Şablonu</h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -6, marginBottom: 12 }}>
          Kira, internet gibi her ay tekrarlanan giderler için bir şablon oluştur — sistem her ay vade günü geldiğinde "Bekleyen Ödemeler" listesine düşürür, sen ödeme anında tutarı gerekirse değiştirirsin.
        </p>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Başlık</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Ofis Kirası" />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Varsayılan Tutar</label>
            <input type="number" min="0.01" step="0.01" value={defaultAmount} onChange={(e) => setDefaultAmount(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0, maxWidth: 140 }}>
            <label>Ayın Kaçıncı Günü</label>
            <input type="number" min="1" max="31" value={dueDayOfMonth} onChange={(e) => setDueDayOfMonth(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Varsayılan Banka Hesabı (opsiyonel)</label>
            <select value={defaultBankAccountId} onChange={(e) => setDefaultBankAccountId(e.target.value)}>
              <option value="">Seçilmedi</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.bankName ? `${acc.bankName} — ${acc.accountName}` : acc.accountName}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim() || !defaultAmount}>
            {saving ? 'Ekleniyor…' : '+ Şablon Ekle'}
          </button>
        </form>
      </div>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>
          Bu Ayın Bekleyen Ödemeleri ({period})
        </h3>
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : pending.length === 0 ? (
          <div className="empty-state">Bu ay için bekleyen ödeme yok — hepsi ödenmiş ya da aktif şablon yok.</div>
        ) : (
          pending.map((item) => (
            <div key={item.template.id} className="ledger-history-item" style={{ flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 140 }}>
                {item.isOverdue && <span style={{ color: 'var(--danger)' }}>⚠ </span>}
                {item.template.title}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Vade: {new Date(item.dueDate).toLocaleDateString('tr-TR')}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(item.template.defaultAmount)}</span>
              {payingId === item.template.id ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', width: '100%', marginTop: 8 }}>
                  <input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={{ width: 100 }} title="Ödenen tutar" />
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                  <select value={payBankAccountId} onChange={(e) => setPayBankAccountId(e.target.value)}>
                    <option value="">Banka seçilmedi</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.bankName ? `${acc.bankName} — ${acc.accountName}` : acc.accountName}</option>
                    ))}
                  </select>
                  <input value={payReferenceNo} onChange={(e) => setPayReferenceNo(e.target.value)} placeholder="Fiş No (opsiyonel)" style={{ width: 110 }} />
                  <button type="button" className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} disabled={paySaving} onClick={() => handlePay(item.template.id)}>
                    {paySaving ? '…' : 'Onayla'}
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setPayingId(null)}>
                    İptal
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => openPayForm(item)}>
                  Öde
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="folder-panel">
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Tüm Şablonlar</h3>
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : templates.length === 0 ? (
          <div className="empty-state">Henüz şablon eklenmemiş.</div>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="ledger-history-item" style={{ opacity: t.isActive ? 1 : 0.5 }}>
              <span style={{ flex: 1 }}>{t.title}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{categories.find((c) => c.id === t.categoryId)?.name || t.category || '—'} · Her ayın {t.dueDayOfMonth}. günü</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(t.defaultAmount)}</span>
              <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleToggleActive(t)}>
                {t.isActive ? 'Pasifleştir' : 'Aktifleştir'}
              </button>
              <button type="button" className="task-row__delete" onClick={() => handleDelete(t.id)} title="Sil">✕</button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
