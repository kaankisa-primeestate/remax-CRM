import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { commissionsApi, COMMISSION_STATUSES } from '../api/commissions';
import { usersApi } from '../api/auth';
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
    const params = buildFilters();
    const [list, sum] = await Promise.all([
      commissionsApi.list(params),
      commissionsApi.summary(params),
    ]);
    setCommissions(list);
    setSummary(sum);
    setLoading(false);
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

  const agentName = (agentId) => agents.find((a) => a.id === agentId)?.name ?? agentId;

  return (
    <div>
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
            {commissions.map((c) => (
              <div
                className="record-row"
                key={c.id}
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
            ))}
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
