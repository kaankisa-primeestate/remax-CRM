import { useEffect, useState, useCallback } from 'react';
import { bankAccountsApi, CURRENCIES, ACCOUNT_TYPES, formatMoney } from '../../api/bankAccounts';
import ReceiptUploader from '../ReceiptUploader.jsx';

// Banka Hesaplari sekmesi -- kendi verisini kendi yukler, disaridan prop
// almaz. Boylece bagimsiz/tek basina test edilebilir/kullanilabilir bir
// ekran (Finans sayfasindaki genel "her sekme kendi icinde kullanisli
// olmali" ilkesine uygun).
export default function BankAccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [transactions, setTransactions] = useState({});

  const [accountType, setAccountType] = useState('bank');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [saving, setSaving] = useState(false);

  const [txType, setTxType] = useState('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [txDescription, setTxDescription] = useState('');
  const [txReferenceNo, setTxReferenceNo] = useState('');
  const [txReceiptUrl, setTxReceiptUrl] = useState(null);
  const [txSaving, setTxSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await bankAccountsApi.list();
    setAccounts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Kasa (nakit) icin "banka adi" alani anlamsizdir ve gonderilmez --
  // sadece Banka/Kredi Karti turlerinde zorunlu.
  const needsBankName = accountType !== 'cash';

  async function handleAddAccount(e) {
    e.preventDefault();
    if (!accountName.trim() || (needsBankName && !bankName.trim())) return;
    setSaving(true);
    try {
      await bankAccountsApi.create({
        type: accountType,
        bankName: needsBankName ? bankName.trim() : undefined,
        accountName: accountName.trim(),
        iban: iban.trim() || undefined,
        currency,
      });
      setAccountType('bank');
      setBankName('');
      setAccountName('');
      setIban('');
      setCurrency('TRY');
      load();
    } catch {
      alert('Hesap oluşturulamadı, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(accountId) {
    if (!confirm('Bu hesap pasifleştirilsin mi? (Kayıtlar silinmez, sadece listeden gizlenir)')) return;
    try {
      await bankAccountsApi.setActive(accountId, false);
      load();
    } catch {
      alert('İşlem başarısız, tekrar deneyin.');
    }
  }

  async function toggleExpand(accountId) {
    if (expandedId === accountId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(accountId);
    if (!transactions[accountId]) {
      const txs = await bankAccountsApi.listTransactions(accountId);
      setTransactions((prev) => ({ ...prev, [accountId]: txs }));
    }
  }

  function resetTxForm() {
    setTxType('deposit');
    setTxAmount('');
    setTxDate(new Date().toISOString().slice(0, 10));
    setTxDescription('');
    setTxReferenceNo('');
    setTxReceiptUrl(null);
  }

  async function handleAddTransaction(e, accountId) {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) return;
    setTxSaving(true);
    try {
      await bankAccountsApi.addTransaction(accountId, {
        type: txType,
        amount: Number(txAmount),
        date: txDate,
        description: txDescription.trim() || undefined,
        referenceNo: txReferenceNo.trim() || undefined,
        receiptUrl: txReceiptUrl || undefined,
      });
      resetTxForm();
      const txs = await bankAccountsApi.listTransactions(accountId);
      setTransactions((prev) => ({ ...prev, [accountId]: txs }));
      load();
    } catch {
      alert('Hareket eklenemedi, tekrar deneyin.');
    } finally {
      setTxSaving(false);
    }
  }

  async function handleDeleteTransaction(accountId, transactionId) {
    if (!confirm('Bu hareket silinsin mi?')) return;
    try {
      await bankAccountsApi.removeTransaction(transactionId);
      const txs = await bankAccountsApi.listTransactions(accountId);
      setTransactions((prev) => ({ ...prev, [accountId]: txs }));
      load();
    } catch {
      alert('Hareket silinemedi, tekrar deneyin.');
    }
  }

  return (
    <>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni Banka Hesabı Ekle</h3>
        <form onSubmit={handleAddAccount} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
            <label>Hesap Türü</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          {needsBankName && (
            <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
              <label>Banka Adı</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Örn: İş Bankası" />
            </div>
          )}
          <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
            <label>Hesap Etiketi</label>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={accountType === 'cash' ? 'Örn: Ofis Kasası' : accountType === 'credit_card' ? 'Örn: Şirket Kredi Kartı' : 'Örn: Ana Hesap'}
            />
          </div>
          {needsBankName && (
            <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
              <label>IBAN (opsiyonel)</label>
              <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR.." />
            </div>
          )}
          <div className="form-field" style={{ margin: 0 }}>
            <label>Para Birimi</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !accountName.trim() || (needsBankName && !bankName.trim())}>
            {saving ? 'Ekleniyor…' : '+ Hesap Ekle'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="empty-state">Yükleniyor…</div>
      ) : accounts.length === 0 ? (
        <div className="empty-state">Henüz banka hesabı eklenmemiş.</div>
      ) : (
        accounts.map((acc) => (
          <div key={acc.id} className="folder-panel" style={{ marginBottom: 14 }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => toggleExpand(acc.id)}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {ACCOUNT_TYPES.find((t) => t.value === (acc.type || 'bank'))?.icon || '🏦'}{' '}
                  {acc.bankName ? `${acc.bankName} — ${acc.accountName}` : acc.accountName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  {acc.iban || 'IBAN belirtilmedi'} · {acc.currency}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: acc.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatMoney(acc.balance, acc.currency)}
                </div>
                <span style={{ color: 'var(--muted)' }}>{expandedId === acc.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expandedId === acc.id && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--paper-line)' }}>
                <form onSubmit={(e) => handleAddTransaction(e, acc.id)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Tür</label>
                    <select value={txType} onChange={(e) => setTxType(e.target.value)}>
                      <option value="deposit">Para Girişi</option>
                      <option value="withdrawal">Para Çıkışı</option>
                    </select>
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Tutar</label>
                    <input type="number" min="0.01" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Tarih</label>
                    <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
                  </div>
                  <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                    <label>Açıklama</label>
                    <input value={txDescription} onChange={(e) => setTxDescription(e.target.value)} placeholder="Opsiyonel" />
                  </div>
                  <ReceiptUploader value={txReceiptUrl} onChange={setTxReceiptUrl} label="Dekont Ekle" />
                  <div className="form-field" style={{ margin: 0, minWidth: 120 }}>
                    <label>Fiş/Fatura No</label>
                    <input value={txReferenceNo} onChange={(e) => setTxReferenceNo(e.target.value)} placeholder="Opsiyonel" />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={txSaving || !txAmount}>
                    {txSaving ? 'Ekleniyor…' : '+ Hareket Ekle'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => handleDeactivate(acc.id)}>
                    Hesabı Pasifleştir
                  </button>
                </form>

                {!transactions[acc.id] ? (
                  <div className="panel__empty">Yükleniyor…</div>
                ) : transactions[acc.id].length === 0 ? (
                  <div className="panel__empty">Henüz hareket yok.</div>
                ) : (
                  <div className="table-scroll">
                    <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                          <th style={{ padding: '6px 8px' }}>Tarih</th>
                          <th style={{ padding: '6px 8px' }}>Tür</th>
                          <th style={{ padding: '6px 8px' }}>Tutar</th>
                          <th style={{ padding: '6px 8px' }}>Açıklama</th>
                          <th style={{ padding: '6px 8px' }}>Fiş No</th>
                          <th style={{ padding: '6px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions[acc.id].map((t) => (
                          <tr key={t.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                            <td style={{ padding: '8px' }}>{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                            <td style={{ padding: '8px' }}>{t.type === 'deposit' ? '↑ Giriş' : '↓ Çıkış'}</td>
                            <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: t.type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>
                              {formatMoney(t.amount, acc.currency)}
                            </td>
                            <td style={{ padding: '8px' }}>{t.description || '—'}</td>
                            <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{t.referenceNo || '—'}</td>
                            <td style={{ padding: '8px' }}>
                              <button type="button" className="task-row__delete" onClick={() => handleDeleteTransaction(acc.id, t.id)} title="Sil">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}
