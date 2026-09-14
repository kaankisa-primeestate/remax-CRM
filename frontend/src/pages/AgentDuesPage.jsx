import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, Check, X, ChevronRight, Receipt } from 'lucide-react';
import { EmptyState, TableSkeleton } from '../components/Feedback';
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
  const navigate = useNavigate();
  const [dues, setDues] = useState([]);
  const [agents, setAgents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payAccountId, setPayAccountId] = useState('');

  useEffect(() => {
    if (isBroker) {
      navigate('/muhasebe', { replace: true });
    }
  }, [isBroker, navigate]);

  const load = useCallback(async () => {
    if (isBroker) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [duesData, agentsData, accountsData] = await Promise.all([
        agentDuesApi.list().catch(() => []),
        isBroker ? usersApi.listAgents() : Promise.resolve([]),
        isBroker ? bankAccountsApi.list().catch(() => []) : Promise.resolve([]),
      ]);
      setDues(duesData);
      setAgents(agentsData);
      setAccounts(accountsData);
    } finally {
      setLoading(false);
    }
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

  if (isBroker) return null;

  return (
    <div>
      <div className="cl-page-header">
        <div className="cl-page-header__text">
          <nav className="cl-breadcrumb" aria-label="Sayfa yolu">
            <Link to="/">Ana Sayfa</Link>
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            <span aria-current="page">Danışman Aidatları</span>
          </nav>
          <h2 className="cl-page-title">Danışman Aidatları</h2>
          <p className="cl-page-subtitle">
            Aylık aidat tahakkuklarını oluşturun ve tahsilat durumunu izleyin.
          </p>
        </div>
      </div>

      {unpaidOverdue.length > 0 && (
        <div className="dues-warning-banner">
          <span className="dues-warning-banner__icon"><AlertTriangle size={16} /></span>
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
              <h3 style={{ fontFamily: 'var(--cl-font-heading)', margin: 0, fontSize: 16 }}>{periodLabel(nowPeriod)} Aidatlarını Oluştur</h3>
              <p style={{ color: 'var(--cl-muted)', fontSize: 13, margin: '4px 0 0' }}>
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
          <TableSkeleton rows={5} columns={4} label="Aidatlar yükleniyor…" />
        ) : dues.length === 0 ? (
          <EmptyState
            Icon={Receipt}
            title={isBroker ? 'Henüz aidat kaydı yok' : 'Henüz aidat kaydınız yok'}
            note={isBroker ? 'Yukarıdaki düğmeyle bu ayın kayıtlarını oluşturabilirsiniz.' : undefined}
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Dönem</th>
                  {isBroker && <th>Danışman</th>}
                  <th className="is-right">Tutar</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {dues.map((due) => (
                  <tr key={due.id}>
                    <td data-label="Dönem">{periodLabel(due.period)}</td>
                    {isBroker && <td data-label="Danışman">{agentNameById[due.agentId] || '—'}</td>}
                    <td data-label="Tutar" className="amount is-right">{formatMoney(due.expectedAmount)}</td>
                    <td data-label="Durum">
                      {due.paid ? (
                        <span className="pill pill--ok">
                          <Check size={12} strokeWidth={2.5} /> Ödendi ({new Date(due.paidDate).toLocaleDateString('tr-TR')})
                        </span>
                      ) : (
                        <span className="pill pill--no">
                          <AlertTriangle size={12} strokeWidth={2} /> Ödenmedi
                        </span>
                      )}
                    </td>
                    <td data-label="İşlem">
                      {isBroker && !due.paid && (
                        payingId === due.id ? (
                          <div className="row-actions row-actions--wrap">
                            <input type="date" className="cell-select" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                            <select className="cell-select" value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)}>
                              <option value="">Hesap seçilmedi</option>
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>{acc.bankName} — {acc.accountName}</option>
                              ))}
                            </select>
                            <button type="button" className="btn btn-primary btn--sm" onClick={() => confirmPay(due.id)}>Onayla</button>
                            <button type="button" className="btn btn-secondary btn--sm" onClick={() => setPayingId(null)}>Vazgeç</button>
                          </div>
                        ) : (
                          <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => startPay(due)}>
                            Ödendi İşaretle
                          </button>
                        )
                      )}
                      {isBroker && (
                        <button type="button" className="task-row__delete" onClick={() => handleDelete(due.id)} title="Sil"><X size={13} /></button>
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
