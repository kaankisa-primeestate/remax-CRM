import { useEffect, useState, useCallback } from 'react';
import { agentDuesApi, currentPeriod, periodLabel } from '../api/agentDues';
import { bankAccountsApi, formatMoney } from '../api/bankAccounts';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';

// Danisman Aidatlari: her ay danismanlarin ofise odedigi aidatlarin
// takip edildigi ayri sayfa. Broker toplu kayit acar + odeme isaretler,
// Danisman sadece kendi aidatlarini gorur. Odenmemis/gecikmis aidatlar
// icin acik bir uyari bandi var.
export default function AgentDuesPage() {
  const { isBroker } = useAuth();
  const [dues, setDues] = useState([]);
  const [agents, setAgents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payAccountId, setPayAccountId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [duesData, agentsData, accountsData] = await Promise.all([
      agentDuesApi.list(),
      isBroker ? usersApi.listAgents() : Promise.resolve([]),
      isBroker ? bankAccountsApi.list().catch(() => []) : Promise.resolve([]),
    ]);
    setDues(duesData);
    setAgents(agentsData);
    setAccounts(accountsData);
    setLoading(false);
  }, [isBroker]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await agentDuesApi.generate(currentPeriod());
      alert(`${result.created} yeni aidat kaydı oluşturuldu. (${result.skipped} danışman zaten kayıtlıydı ya da aidat tutarı tanımlı değil.)`);
      load();
    } catch (err) {
      alert('Aidat kayıtları oluşturulamadı, tekrar deneyin.');
    } finally {
      setGenerating(false);
    }
  }

  function startPay(due) {
    setPayingId(due.id);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAccountId('');
  }

  async function confirmPay(id) {
    try {
      await agentDuesApi.markPaid(id, {
        paidDate: payDate,
        bankAccountId: payAccountId || undefined,
      });
      setPayingId(null);
      load();
    } catch (err) {
      alert('Ödeme işaretlenemedi, tekrar deneyin.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu aidat kaydı silinsin mi?')) return;
    setDues((prev) => prev.filter((d) => d.id !== id));
    try {
      await agentDuesApi.remove(id);
      load();
    } catch {
      alert('Silinemedi, sayfa yenileniyor.');
      load();
    }
  }

  const agentNameById = Object.fromEntries(agents.map((a) => [a.id, a.name]));
  const nowPeriod = currentPeriod();
  const unpaidOverdue = dues.filter((d) => !d.paid && d.period <= nowPeriod);

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Danışman Aidatları</h2>

      {unpaidOverdue.length > 0 && (
        <div className="dues-warning-banner">
          <span className="dues-warning-banner__icon">⚠️</span>
          <div>
            <strong>{unpaidOverdue.length} aidat ödemesi bekliyor.</strong>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              {unpaidOverdue.map((d) => `${agentNameById[d.agentId] || 'Danışman'} (${periodLabel(d.period)})`).join(', ')}
            </div>
          </div>
        </div>
      )}

      {isBroker && (
        <div className="folder-panel" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 16 }}>{periodLabel(nowPeriod)} Aidatlarını Oluştur</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                Aylık aidat tutarı tanımlı tüm danışmanlar için bu ayın kaydını otomatik açar. Zaten var olan kayıtları tekrar oluşturmaz.
              </p>
            </div>
            <button type="button" className="btn btn-primary" disabled={generating} onClick={handleGenerate}>
              {generating ? 'Oluşturuluyor…' : `+ ${periodLabel(nowPeriod)} Kayıtlarını Oluştur`}
            </button>
          </div>
        </div>
      )}

      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : dues.length === 0 ? (
          <div className="empty-state">
            {isBroker ? 'Henüz aidat kaydı yok. Yukarıdan bu ayın kayıtlarını oluşturabilirsin.' : 'Henüz aidat kaydınız yok.'}
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 8px' }}>Dönem</th>
                  {isBroker && <th style={{ padding: '6px 8px' }}>Danışman</th>}
                  <th style={{ padding: '6px 8px' }}>Tutar</th>
                  <th style={{ padding: '6px 8px' }}>Durum</th>
                  <th style={{ padding: '6px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {dues.map((due) => (
                  <tr key={due.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                    <td style={{ padding: '8px' }}>{periodLabel(due.period)}</td>
                    {isBroker && <td style={{ padding: '8px' }}>{agentNameById[due.agentId] || '—'}</td>}
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{formatMoney(due.expectedAmount)}</td>
                    <td style={{ padding: '8px' }}>
                      {due.paid ? (
                        <span className="dues-status dues-status--paid">✓ Ödendi ({new Date(due.paidDate).toLocaleDateString('tr-TR')})</span>
                      ) : (
                        <span className="dues-status dues-status--unpaid">⚠️ Ödenmedi</span>
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {isBroker && !due.paid && (
                        payingId === due.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} style={{ fontSize: 12, padding: '4px 6px' }} />
                            <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)} style={{ fontSize: 12, padding: '4px 6px' }}>
                              <option value="">Hesap seçilmedi</option>
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>{acc.bankName} — {acc.accountName}</option>
                              ))}
                            </select>
                            <button type="button" className="btn btn-primary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => confirmPay(due.id)}>Onayla</button>
                            <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setPayingId(null)}>Vazgeç</button>
                          </div>
                        ) : (
                          <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => startPay(due)}>
                            Ödendi İşaretle
                          </button>
                        )
                      )}
                      {isBroker && (
                        <button type="button" className="task-row__delete" onClick={() => handleDelete(due.id)} title="Sil">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
