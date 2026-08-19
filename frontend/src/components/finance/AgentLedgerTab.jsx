import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { agentLedgerApi } from '../../api/agentLedger';
import { bankAccountsApi, formatMoney } from '../../api/bankAccounts';
import { usersApi } from '../../api/auth';

export default function AgentLedgerTab() {
  const [agents, setAgents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [history, setHistory] = useState({});

  const [adjType, setAdjType] = useState('debit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDescription, setAdjDescription] = useState('');
  const [adjDate, setAdjDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [adjBankAccountId, setAdjBankAccountId] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [agentData, accData, balanceData] = await Promise.all([
      usersApi.listAgents().catch(() => []),
      bankAccountsApi.list().catch(() => []),
      agentLedgerApi.getSummary().catch(() => ({})),
    ]);
    setAgents(agentData);
    setAccounts(accData);
    setBalances(balanceData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleHistory(agentId) {
    if (expandedId === agentId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(agentId);
    if (!history[agentId]) {
      const h = await agentLedgerApi.getHistory(agentId);
      setHistory((prev) => ({ ...prev, [agentId]: h }));
    }
  }

  function resetForm() {
    setAdjType('debit');
    setAdjAmount('');
    setAdjDescription('');
    setAdjDate(new Date().toISOString().slice(0, 10));
    setAdjBankAccountId('');
  }

  async function handleAddAdjustment(agentId) {
    if (!adjAmount || Number(adjAmount) <= 0 || !adjDescription.trim()) return;
    setAdjSaving(true);
    try {
      await agentLedgerApi.createAdjustment({
        agentId,
        type: adjType,
        amount: Number(adjAmount),
        description: adjDescription.trim(),
        date: adjDate,
        bankAccountId: adjBankAccountId || undefined,
      });
      resetForm();
      const h = await agentLedgerApi.getHistory(agentId);
      setHistory((prev) => ({ ...prev, [agentId]: h }));
      load();
    } catch {
      alert('Kayıt eklenemedi, tekrar deneyin.');
    } finally {
      setAdjSaving(false);
    }
  }

  return (
    <div className="folder-panel">
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Komisyonu onaylanan danışmanların bakiyesi burada otomatik oluşur. Kısmi ödemeleri{' '}
        <Link to="/komisyonlar">Komisyonlar</Link> sayfasından, avans/ceza gibi manuel kayıtları ve giderlerden yansıtılan masrafları buradan görebilirsin.
      </p>
      {loading || agents.length === 0 ? (
        <div className="empty-state">{loading ? 'Yükleniyor…' : 'Henüz danışman yok.'}</div>
      ) : (
        agents.map((agent) => {
          const balance = balances[agent.id] ?? 0;
          const agentHistory = history[agent.id] || [];
          return (
            <div key={agent.id} className="ledger-agent-card">
              <div className="ledger-agent-card__header" onClick={() => toggleHistory(agent.id)}>
                <div>
                  <div className="ledger-agent-card__name">{agent.name}</div>
                  <div className="ledger-agent-card__email">{agent.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={`ledger-agent-card__balance${balance > 0 ? ' is-owed' : balance < 0 ? ' is-owing' : ''}`}>
                    {balance > 0 && `Ofis borçlu: ${formatMoney(balance)}`}
                    {balance < 0 && `Danışman borçlu: ${formatMoney(Math.abs(balance))}`}
                    {balance === 0 && 'Bakiye: —'}
                  </div>
                  <span style={{ color: 'var(--muted)' }}>{expandedId === agent.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedId === agent.id && (
                <div className="ledger-agent-card__body">
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, margin: '0 0 10px' }}>Manuel Kayıt Ekle</h4>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
                    <div className="form-field" style={{ margin: 0 }}>
                      <label>Tür</label>
                      <select value={adjType} onChange={(e) => setAdjType(e.target.value)}>
                        <option value="debit">Avans / Ceza (bakiye azalır)</option>
                        <option value="credit">Danışman Ofis Adına Ödedi (bakiye artar)</option>
                      </select>
                    </div>
                    <div className="form-field" style={{ margin: 0 }}>
                      <label>Tutar</label>
                      <input type="number" min="0.01" step="0.01" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} style={{ width: 110 }} />
                    </div>
                    <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                      <label>Açıklama</label>
                      <input value={adjDescription} onChange={(e) => setAdjDescription(e.target.value)} placeholder="Örn: Avans ödemesi" />
                    </div>
                    <div className="form-field" style={{ margin: 0 }}>
                      <label>Tarih</label>
                      <input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
                    </div>
                    <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                      <label>Banka Hesabı (opsiyonel)</label>
                      <select value={adjBankAccountId} onChange={(e) => setAdjBankAccountId(e.target.value)}>
                        <option value="">Seçilmedi</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>{acc.bankName} — {acc.accountName}</option>
                        ))}
                      </select>
                    </div>
                    <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} disabled={adjSaving || !adjAmount || !adjDescription.trim()} onClick={() => handleAddAdjustment(agent.id)}>
                      {adjSaving ? 'Ekleniyor…' : '+ Kayıt Ekle'}
                    </button>
                  </div>

                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, margin: '0 0 10px' }}>Hareket Geçmişi</h4>
                  {agentHistory.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Henüz hareket yok.</div>
                  ) : (
                    agentHistory.map((item) => (
                      <div key={item.id} className="ledger-history-item">
                        <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{new Date(item.date).toLocaleDateString('tr-TR')}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: item.direction === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                          {item.direction === 'credit' ? '+' : '−'}{formatMoney(item.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
