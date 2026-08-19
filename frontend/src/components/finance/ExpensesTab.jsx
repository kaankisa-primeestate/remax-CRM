import { useEffect, useState, useCallback } from 'react';
import { expensesApi, EXPENSE_CATEGORIES } from '../../api/expenses';
import { bankAccountsApi, formatMoney } from '../../api/bankAccounts';
import { usersApi } from '../../api/auth';

export default function ExpensesTab() {
  const [expenses, setExpenses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState('rent');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [chargebackPercentage, setChargebackPercentage] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [expData, agentData, accData] = await Promise.all([
      expensesApi.list(),
      usersApi.listAgents().catch(() => []),
      bankAccountsApi.list().catch(() => []),
    ]);
    setExpenses(expData);
    setAgents(agentData);
    setAccounts(accData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setCategory('rent');
    setTitle('');
    setAmount('');
    setVatRate('');
    setDate(new Date().toISOString().slice(0, 10));
    setReferenceNo('');
    setBankAccountId('');
    setAgentId('');
    setChargebackPercentage('');
    setIsRecurring(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await expensesApi.create({
        category,
        title: title.trim(),
        amount: Number(amount),
        vatRate: vatRate ? Number(vatRate) : undefined,
        date,
        referenceNo: referenceNo.trim() || undefined,
        bankAccountId: bankAccountId || undefined,
        agentId: agentId || undefined,
        chargebackPercentage: agentId && chargebackPercentage ? Number(chargebackPercentage) : undefined,
        isRecurring,
      });
      resetForm();
      load();
    } catch {
      alert('Gider eklenemedi, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu gider silinsin mi? (Bağlı banka hareketi ve cari kaydı varsa onlar da silinecek)')) return;
    setExpenses((prev) => prev.filter((x) => x.id !== id));
    try {
      await expensesApi.remove(id);
      load();
    } catch {
      alert('Gider silinemedi, sayfa yenileniyor.');
      load();
    }
  }

  return (
    <>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni Gider Ekle</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Açıklama</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Ağustos Kirası" />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tutar (KDV dahil)</label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0, maxWidth: 100 }}>
            <label>KDV % (opsiyonel)</label>
            <input type="number" min="0" max="100" value={vatRate} onChange={(e) => setVatRate(e.target.value)} placeholder="20" />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tarih</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 120 }}>
            <label>Fiş/Fatura No</label>
            <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Opsiyonel" />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Banka Hesabı (opsiyonel)</label>
            <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
              <option value="">Seçilmedi</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.bankName} — {acc.accountName}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
            <label>Danışman (opsiyonel)</label>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">Seçilmedi</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          {agentId && (
            <div className="form-field" style={{ margin: 0, maxWidth: 170 }}>
              <label>Yansıtma Oranı %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={chargebackPercentage}
                onChange={(e) => setChargebackPercentage(e.target.value)}
                placeholder="Örn: 50"
                title="Doldurursan, bu oranda tutar otomatik olarak danışmanın cari hesabına borç yazılır"
              />
            </div>
          )}
          <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0 }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} style={{ width: 'auto' }} />
            <label style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 13 }}>Sabit Gider (her ay tekrar eden)</label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim() || !amount}>
            {saving ? 'Ekleniyor…' : '+ Gider Ekle'}
          </button>
        </form>
        {agentId && chargebackPercentage && (
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, marginBottom: 0 }}>
            Bu gider kaydedildiğinde, {agents.find((a) => a.id === agentId)?.name || 'seçilen danışman'}'ın cari hesabına otomatik olarak <strong>%{chargebackPercentage}</strong> oranında borç yazılacak.
          </p>
        )}
      </div>

      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">Henüz gider eklenmemiş.</div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 8px' }}>Tarih</th>
                  <th style={{ padding: '6px 8px' }}>Kategori</th>
                  <th style={{ padding: '6px 8px' }}>Açıklama</th>
                  <th style={{ padding: '6px 8px' }}>Tutar</th>
                  <th style={{ padding: '6px 8px' }}>Danışman / Yansıtma</th>
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
                      <td style={{ padding: '8px' }}>
                        {agent?.name || '—'}
                        {agent && exp.chargebackPercentage > 0 && (
                          <span style={{ color: 'var(--muted)', fontSize: 11 }}> (%{exp.chargebackPercentage} yansıtıldı)</span>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <button type="button" className="task-row__delete" onClick={() => handleDelete(exp.id)} title="Sil">✕</button>
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
  );
}
