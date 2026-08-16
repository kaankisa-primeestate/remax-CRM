import { useEffect, useState, useCallback } from 'react';
import { bankAccountsApi, CURRENCIES, formatMoney } from '../api/bankAccounts';
import { expensesApi, EXPENSE_CATEGORIES } from '../api/expenses';
import { usersApi } from '../api/auth';

const FINANCE_TABS = [
  { key: 'accounts', label: '🏦 Banka Hesapları' },
  { key: 'expenses', label: '🧾 Giderler' },
  { key: 'ledger', label: '👤 Danışman Cari Hesapları' },
  { key: 'partners', label: '🤝 Ortaklar' },
  { key: 'summary', label: '📊 Özet' },
];

// Finans -- gercek bir muhasebe uygulamasi gibi sekmeli (tab) yapida.
// Asama 1 (Banka Hesaplari) ve Asama 2 (Giderler) tam calisir durumda;
// Asama 3-5 (Cari Hesap, Ortaklar, Ozet) placeholder sekmeler olarak
// hazir, sirayla doldurulacak. Bkz. Finans_Modulu_Yol_Haritasi.md
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [transactions, setTransactions] = useState({});

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
  const [txSaving, setTxSaving] = useState(false);

  const [expenses, setExpenses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [expLoading, setExpLoading] = useState(true);
  const [expCategory, setExpCategory] = useState('rent');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expVatRate, setExpVatRate] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expReferenceNo, setExpReferenceNo] = useState('');
  const [expBankAccountId, setExpBankAccountId] = useState('');
  const [expAgentId, setExpAgentId] = useState('');
  const [expIsRecurring, setExpIsRecurring] = useState(false);
  const [expSaving, setExpSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await bankAccountsApi.list();
    setAccounts(data);
    setLoading(false);
  }, []);

  const loadExpenses = useCallback(async () => {
    setExpLoading(true);
    const [expData, agentData] = await Promise.all([
      expensesApi.list(),
      usersApi.listAgents().catch(() => []),
    ]);
    setExpenses(expData);
    setAgents(agentData);
    setExpLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadExpenses();
  }, [load, loadExpenses]);

  function resetExpenseForm() {
    setExpCategory('rent');
    setExpTitle('');
    setExpAmount('');
    setExpVatRate('');
    setExpDate(new Date().toISOString().slice(0, 10));
    setExpReferenceNo('');
    setExpBankAccountId('');
    setExpAgentId('');
    setExpIsRecurring(false);
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount || Number(expAmount) <= 0) return;
    setExpSaving(true);
    try {
      await expensesApi.create({
        category: expCategory,
        title: expTitle.trim(),
        amount: Number(expAmount),
        vatRate: expVatRate ? Number(expVatRate) : undefined,
        date: expDate,
        referenceNo: expReferenceNo.trim() || undefined,
        bankAccountId: expBankAccountId || undefined,
        agentId: expAgentId || undefined,
        isRecurring: expIsRecurring,
      });
      resetExpenseForm();
      loadExpenses();
      load(); // banka hesabina baglandiysa bakiye guncellensin
    } catch (err) {
      alert('Gider eklenemedi, tekrar deneyin.');
    } finally {
      setExpSaving(false);
    }
  }

  async function handleDeleteExpense(id) {
    if (!confirm('Bu gider silinsin mi? (Bağlı banka hareketi varsa o da silinecek)')) return;
    setExpenses((prev) => prev.filter((x) => x.id !== id));
    try {
      await expensesApi.remove(id);
      load(); // banka bakiyesi guncellensin
    } catch {
      alert('Gider silinemedi, sayfa yenileniyor.');
      loadExpenses();
    }
  }

  async function handleAddAccount(e) {
    e.preventDefault();
    if (!bankName.trim() || !accountName.trim()) return;
    setSaving(true);
    try {
      await bankAccountsApi.create({
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        iban: iban.trim() || undefined,
        currency,
      });
      setBankName('');
      setAccountName('');
      setIban('');
      setCurrency('TRY');
      load();
    } catch (err) {
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
      });
      resetTxForm();
      const txs = await bankAccountsApi.listTransactions(accountId);
      setTransactions((prev) => ({ ...prev, [accountId]: txs }));
      load(); // bakiyeyi guncellemek icin
    } catch (err) {
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
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Finans</h2>

      <div className="folder-tabs" style={{ flexWrap: 'wrap' }}>
        {FINANCE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`folder-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="finance-tab-content">
      {activeTab === 'accounts' && (
        <>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni Banka Hesabı Ekle</h3>
        <form onSubmit={handleAddAccount} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Banka Adı</label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Örn: İş Bankası" />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
            <label>Hesap Etiketi</label>
            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Örn: Ana Hesap" />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
            <label>IBAN (opsiyonel)</label>
            <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR.." />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Para Birimi</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !bankName.trim() || !accountName.trim()}>
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
                <div style={{ fontWeight: 700, fontSize: 15 }}>{acc.bankName} — {acc.accountName}</div>
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
      )}

      {activeTab === 'expenses' && (
        <>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni Gider Ekle</h3>
        <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Kategori</label>
            <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Açıklama</label>
            <input value={expTitle} onChange={(e) => setExpTitle(e.target.value)} placeholder="Örn: Ağustos Kirası" />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tutar (KDV dahil)</label>
            <input type="number" min="0.01" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0, maxWidth: 100 }}>
            <label>KDV % (opsiyonel)</label>
            <input type="number" min="0" max="100" value={expVatRate} onChange={(e) => setExpVatRate(e.target.value)} placeholder="20" />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tarih</label>
            <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 120 }}>
            <label>Fiş/Fatura No</label>
            <input value={expReferenceNo} onChange={(e) => setExpReferenceNo(e.target.value)} placeholder="Opsiyonel" />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Banka Hesabı (opsiyonel)</label>
            <select value={expBankAccountId} onChange={(e) => setExpBankAccountId(e.target.value)}>
              <option value="">Seçilmedi</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.bankName} — {acc.accountName}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
            <label>Danışman (opsiyonel)</label>
            <select value={expAgentId} onChange={(e) => setExpAgentId(e.target.value)}>
              <option value="">Seçilmedi</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0 }}>
            <input type="checkbox" checked={expIsRecurring} onChange={(e) => setExpIsRecurring(e.target.checked)} style={{ width: 'auto' }} />
            <label style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 13 }}>Sabit Gider (her ay tekrar eden)</label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={expSaving || !expTitle.trim() || !expAmount}>
            {expSaving ? 'Ekleniyor…' : '+ Gider Ekle'}
          </button>
        </form>
      </div>

      <div className="folder-panel">
        {expLoading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">Henüz gider eklenmemiş.</div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 8px' }}>Tarih</th>
                  <th style={{ padding: '6px 8px' }}>Kategori</th>
                  <th style={{ padding: '6px 8px' }}>Açıklama</th>
                  <th style={{ padding: '6px 8px' }}>Tutar</th>
                  <th style={{ padding: '6px 8px' }}>Danışman</th>
                  <th style={{ padding: '6px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const agent = agents.find((a) => a.id === exp.agentId);
                  const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label;
                  return (
                    <tr key={exp.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                      <td style={{ padding: '8px' }}>{new Date(exp.date).toLocaleDateString('tr-TR')}</td>
                      <td style={{ padding: '8px' }}>{catLabel}{exp.isRecurring && ' 🔁'}</td>
                      <td style={{ padding: '8px' }}>
                        {exp.title}
                        {exp.referenceNo && <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}> · {exp.referenceNo}</span>}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                        {formatMoney(exp.amount)}
                        {exp.vatRate != null && <span style={{ color: 'var(--muted)', fontSize: 11 }}> (KDV %{exp.vatRate})</span>}
                      </td>
                      <td style={{ padding: '8px' }}>{agent?.name || '—'}</td>
                      <td style={{ padding: '8px' }}>
                        <button type="button" className="task-row__delete" onClick={() => handleDeleteExpense(exp.id)} title="Sil">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {activeTab === 'ledger' && (
        <div className="finance-placeholder">
          <div className="finance-placeholder__icon">👤</div>
          <div className="finance-placeholder__title">Danışman Cari Hesapları</div>
          <p className="finance-placeholder__text">
            Bu bölüm sırada: bir danışmanın komisyonu onaylandığında burada otomatik bir bakiye oluşacak,
            yapılan (kısmi) ödemeler buradan işlenecek. Danışman kendi bakiyesini Komisyonlar sayfasından görecek.
          </p>
        </div>
      )}

      {activeTab === 'partners' && (
        <div className="finance-placeholder">
          <div className="finance-placeholder__icon">🤝</div>
          <div className="finance-placeholder__title">Ortaklar</div>
          <p className="finance-placeholder__text">
            Bu bölüm sırada: ortakların sermaye giriş/çıkışlarının ve kâr payı hareketlerinin takip edildiği hesaplar burada olacak.
          </p>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="finance-placeholder">
          <div className="finance-placeholder__icon">📊</div>
          <div className="finance-placeholder__title">Özet</div>
          <p className="finance-placeholder__text">
            Bu bölüm sırada: toplam gelir/gider, net kâr-zarar, banka bakiyeleri toplamı ve danışmanlara olan
            toplam borç, hepsi bir arada burada görünecek.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
