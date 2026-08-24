import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { commissionsApi, COMMISSION_STATUSES } from '../api/commissions';
import { usersApi } from '../api/auth';
import { agentLedgerApi } from '../api/agentLedger';
import { bankAccountsApi } from '../api/bankAccounts';
import { useAuth } from '../context/AuthContext.jsx';
import { CommissionStatusBadge } from '../components/CommissionStatusBadge.jsx';
import CommissionFormModal from '../components/CommissionFormModal.jsx';

const formatMoney = (n) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR');
};

function SummaryCard({ label, value, accent }) {
  return (
    <div
      style={{
        background: 'var(--paper-raised, #ece8da)',
        border: '1px solid var(--ink-navy-light, #cfc9b8)',
        borderRadius: 4,
        padding: '14px 18px',
        minWidth: 160,
        flex: 1,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--muted)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display, var(--font-body))',
          fontSize: 22,
          color: accent || 'var(--ink-navy)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function CommissionsPage() {
  const { isBroker, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [agents, setAgents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [prefill, setPrefill] = useState(null);

  const [myBalance, setMyBalance] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [expandedPaymentsId, setExpandedPaymentsId] = useState(null);
  const [payments, setPayments] = useState({});
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payAccountId, setPayAccountId] = useState('');
  const [paySaving, setPaySaving] = useState(false);

  // Islemler sayfasindan "Tapu Onayla" ile geldiyse, formu otomatik ac
  // ve ilgili bilgileri (danisman/portfoy/musteri/tutar) on-doldur.
  useEffect(() => {
    if (location.state?.prefillCommission) {
      setPrefill(location.state.prefillCommission);
      setShowForm(true);
      // State'i temizle ki sayfa yenilenince (F5) tekrar acilmasin
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
      bankAccountsApi.list().then(setAccounts).catch(() => setAccounts([]));
    } else {
      agentLedgerApi.getBalance().then(setMyBalance).catch(() => setMyBalance(null));
    }
  }, [isBroker]);

  const buildFilters = useCallback(() => {
    const params = {};
    if (activeStatus !== 'all') params.status = activeStatus;
    if (isBroker && agentFilter !== 'all') params.agentId = agentFilter;
    return params;
  }, [activeStatus, agentFilter, isBroker]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilters();
      const [list, sum] = await Promise.all([
        commissionsApi.list(params).catch(() => []),
        commissionsApi.summary(params).catch(() => null),
      ]);
      setCommissions(list);
      setSummary(sum);
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(payload) {
    await commissionsApi.create(payload);
    setShowForm(false);
    load();
  }

  async function handleUpdate(payload) {
    await commissionsApi.update(editing.id, payload);
    setEditing(null);
    load();
  }

  async function handleStatusChange(commission, newStatus) {
    await commissionsApi.update(commission.id, { status: newStatus });
    load();
  }

  async function handleDelete(commission) {
    if (!window.confirm('Bu komisyon kaydını silmek istediğinize emin misiniz?')) return;
    await commissionsApi.remove(commission.id);
    load();
  }

  async function togglePayments(commissionId) {
    if (expandedPaymentsId === commissionId) {
      setExpandedPaymentsId(null);
      return;
    }
    setExpandedPaymentsId(commissionId);
    setPayAmount('');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAccountId('');
    if (!payments[commissionId]) {
      const list = await commissionsApi.getPayments(commissionId);
      setPayments((prev) => ({ ...prev, [commissionId]: list }));
    }
  }

  async function handleAddPayment(commissionId) {
    if (!payAmount || Number(payAmount) <= 0) return;
    setPaySaving(true);
    try {
      await commissionsApi.addPayment(commissionId, {
        amount: Number(payAmount),
        date: payDate,
        bankAccountId: payAccountId || undefined,
      });
      const list = await commissionsApi.getPayments(commissionId);
      setPayments((prev) => ({ ...prev, [commissionId]: list }));
      setPayAmount('');
      setPayAccountId('');
      load(); // komisyon durumu "Odendi"ye donmus olabilir
    } catch (err) {
      alert('Ödeme eklenemedi, tekrar deneyin.');
    } finally {
      setPaySaving(false);
    }
  }

  async function handleDeletePayment(commissionId, paymentId) {
    if (!confirm('Bu ödeme kaydı silinsin mi?')) return;
    try {
      await commissionsApi.removePayment(paymentId);
      const list = await commissionsApi.getPayments(commissionId);
      setPayments((prev) => ({ ...prev, [commissionId]: list }));
      load();
    } catch {
      alert('Ödeme silinemedi, tekrar deneyin.');
    }
  }

  const agentName = (agentId) => agents.find((a) => a.id === agentId)?.name ?? agentId;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--muted)',
          background: 'transparent',
          border: 'none',
          padding: 0,
          marginBottom: 12,
          cursor: 'pointer',
          display: 'block',
        }}
      >
        ← Geri Dön
      </button>
      <div className="folder-tabs">
        <button
          className={`folder-tab ${activeStatus === 'all' ? 'active' : ''}`}
          onClick={() => setActiveStatus('all')}
        >
          Tümü
        </button>
        {COMMISSION_STATUSES.map((s) => (
          <button
            key={s.value}
            className={`folder-tab ${activeStatus === s.value ? 'active' : ''}`}
            onClick={() => setActiveStatus(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="folder-panel">
        {!isBroker && myBalance !== null && (
          <div className={`agent-balance-card${myBalance > 0 ? ' agent-balance-card--owed' : myBalance < 0 ? ' agent-balance-card--owing' : ''}`} style={{ marginBottom: 20 }}>
            <div className="agent-balance-card__label">Cari Bakiyeniz</div>
            <div className="agent-balance-card__value">
              {myBalance > 0 && `Ofis size ${formatMoney(myBalance)} borçlu`}
              {myBalance < 0 && `Ofise ${formatMoney(Math.abs(myBalance))} borçlusunuz`}
              {myBalance === 0 && 'Bakiyeniz güncel — borç yok'}
            </div>
          </div>
        )}
        {summary && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <SummaryCard label="Toplam Brüt Komisyon" value={formatMoney(summary.totalGross)} />
            <SummaryCard label="Toplam Net (Danışman)" value={formatMoney(summary.totalNetPayable)} />
            <SummaryCard label="Ödenen" value={formatMoney(summary.totalPaid)} accent="var(--success)" />
            <SummaryCard label="Bekleyen" value={formatMoney(summary.totalPending)} accent="var(--danger)" />
          </div>
        )}

        <div className="toolbar">
          {isBroker && (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              style={{ maxWidth: 220 }}
            >
              <option value="all">Tüm Danışmanlar</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Yeni Komisyon Kaydı
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : commissions.length === 0 ? (
          <div className="empty-state">
            Kayıt bulunamadı. "Yeni Komisyon Kaydı" ile ilk kaydı oluşturun.
          </div>
        ) : (
          <div>
            {commissions.map((c) => {
              const commissionPayments = payments[c.id] || [];
              const totalPaid = commissionPayments.reduce((sum, p) => sum + Number(p.amount), 0);
              const remaining = Number(c.netPayable) - totalPaid;
              return (
              <div key={c.id} className="commission-row-wrapper">
              <div
                className="record-row"
                style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
              >
                <CommissionStatusBadge status={c.status} />
                <span className="record-row__name" style={{ flex: 2 }}>
                  {c.propertyTitle || (c.transactionType === 'sale' ? 'Satış İşlemi' : 'Kiralama İşlemi')}
                </span>
                {isBroker && (
                  <span className="record-row__phone" style={{ flex: 1 }}>
                    {agentName(c.agentId)}
                  </span>
                )}
                <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  Vade: {formatDate(c.dueDate)}
                </span>
                <span className="record-row__budget" style={{ flex: 1 }}>
                  {formatMoney(c.netPayable)}
                </span>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {isBroker && c.status !== 'paid' && (
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c, e.target.value)}
                      style={{ fontSize: 12, padding: '4px 6px' }}
                    >
                      {COMMISSION_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  )}
                  {isBroker && c.status === 'approved' && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => togglePayments(c.id)}
                    >
                      {expandedPaymentsId === c.id ? 'Kapat' : '💳 Ödeme Ekle'}
                    </button>
                  )}
                  {c.status === 'paid' && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => togglePayments(c.id)}
                    >
                      {expandedPaymentsId === c.id ? 'Kapat' : 'Ödeme Geçmişi'}
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setEditing(c)}
                  >
                    Düzenle
                  </button>
                  {isBroker && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 12, color: 'var(--danger)' }}
                      onClick={() => handleDelete(c)}
                    >
                      Sil
                    </button>
                  )}
                </div>
              </div>

              {expandedPaymentsId === c.id && (
                <div className="commission-payments-panel">
                  {c.status !== 'paid' && (
                    <div className="commission-payments-panel__remaining">
                      Kalan: <strong>{formatMoney(remaining)}</strong> / {formatMoney(c.netPayable)}
                    </div>
                  )}
                  {isBroker && c.status !== 'paid' && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label>Tutar</label>
                        <input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={{ width: 120 }} />
                      </div>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label>Tarih</label>
                        <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                      </div>
                      <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                        <label>Banka Hesabı (opsiyonel)</label>
                        <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)}>
                          <option value="">Seçilmedi</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>{acc.bankName} — {acc.accountName}</option>
                          ))}
                        </select>
                      </div>
                      <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} disabled={paySaving || !payAmount} onClick={() => handleAddPayment(c.id)}>
                        {paySaving ? 'Ekleniyor…' : '+ Ödeme Kaydet'}
                      </button>
                    </div>
                  )}
                  {commissionPayments.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Henüz ödeme yapılmamış.</div>
                  ) : (
                    commissionPayments.map((p) => (
                      <div key={p.id} className="commission-payment-item">
                        <span>{formatDate(p.date)}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatMoney(p.amount)}</span>
                        {isBroker && (
                          <button type="button" className="task-row__delete" onClick={() => handleDeletePayment(c.id, p.id)} title="Sil">✕</button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <CommissionFormModal
          initialValues={prefill}
          onSubmit={handleCreate}
          onClose={() => { setShowForm(false); setPrefill(null); }}
        />
      )}
      {editing && (
        <CommissionFormModal
          initialValues={editing}
          onSubmit={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
