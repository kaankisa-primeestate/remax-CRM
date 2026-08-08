import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CustomerFormModal from '../components/CustomerFormModal.jsx';

const filterCardStyle = {
  background: 'var(--paper-raised, #fbfaf5)',
  border: '1px solid var(--ink-navy-light, #cfc9b8)',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  boxSizing: 'border-box',
  width: '100%',
};

const filterGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '14px 16px',
  marginBottom: 14,
};

const filterLabelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--muted)',
  marginBottom: 4,
  display: 'block',
};

const rangeInputRowStyle = { display: 'flex', gap: 8, minWidth: 0 };

export default function CustomerListPage() {
  const { isBroker } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [agents, setAgents] = useState([]);

  const [agentId, setAgentId] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isBroker]);

  // Sekme (Tümü/Alıcı/Satıcı/...) değiştiğinde filtre panelini otomatik kapat
  useEffect(() => {
    setShowFilters(false);
  }, [activeType]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (activeType !== 'all') params.type = activeType;
    if (isBroker && agentId) params.agentId = agentId;
    if (minBudget) params.minBudget = minBudget;
    if (maxBudget) params.maxBudget = maxBudget;
    if (keyword) params.keyword = keyword;

    const data = await customersApi.list(params);
    setCustomers(data);
    setLoading(false);
  }, [search, activeType, isBroker, agentId, minBudget, maxBudget, keyword]);

  useEffect(() => {
    const timeout = setTimeout(load, 250); // arama için hafif debounce
    return () => clearTimeout(timeout);
  }, [load]);

  async function handleCreate(payload) {
    await customersApi.create(payload);
    setShowForm(false);
    load();
  }

  const activeFilterCount = [agentId, minBudget, maxBudget, keyword].filter(Boolean).length;

  function clearFilters() {
    setAgentId('');
    setMinBudget('');
    setMaxBudget('');
    setKeyword('');
  }

  const formatBudget = (c) =>
    c.budget != null
      ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c.budgetCurrency || 'TRY', maximumFractionDigits: 0 }).format(c.budget)
      : '—';

  return (
    <div>
      <div className="folder-tabs">
        <button
          className={`folder-tab ${activeType === 'all' ? 'active' : ''}`}
          onClick={() => setActiveType('all')}
        >
          Tümü
        </button>
        {CUSTOMER_TYPES.map((t) => (
          <button
            key={t.value}
            className={`folder-tab ${activeType === t.value ? 'active' : ''}`}
            onClick={() => setActiveType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="folder-panel">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Ad, soyad veya telefon ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={() => setShowFilters((v) => !v)}>
            Filtreler{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''} {showFilters ? '▲' : '▼'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Yeni Müşteri
          </button>
        </div>

        {showFilters && (
          <div style={filterCardStyle}>
            <div style={filterGridStyle}>
              {isBroker && (
                <div>
                  <label style={filterLabelStyle}>Danışman</label>
                  <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={{ width: '100%' }}>
                    <option value="">Tümü</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={filterLabelStyle}>Bütçe Aralığı (₺)</label>
                <div style={rangeInputRowStyle}>
                  <input placeholder="Min" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} type="number" style={{ width: '50%', minWidth: 0 }} />
                  <input placeholder="Maks" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} type="number" style={{ width: '50%', minWidth: 0 }} />
                </div>
              </div>
            </div>

            <div>
              <label style={filterLabelStyle}>
                Anahtar Kelime (istekler / notlarda ara — örn: "3+1", "okula yakın")
              </label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Örn: 3+1, okula yakın"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 14, color: 'var(--danger)' }}
                onClick={clearFilters}
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            Kayıt bulunamadı. "Yeni Müşteri" ile ilk kaydı oluşturun.
          </div>
        ) : (
          <div>
            {customers.map((c) => (
              <Link to={`/musteriler/${c.id}`} className="record-row" key={c.id}>
                <StatusBadge type={c.type} />
                <span className="record-row__name">
                  {c.firstName} {c.lastName}
                </span>
                <span className="record-row__phone">{c.phone}</span>
                <span className="record-row__budget">{formatBudget(c)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      {showForm && (
        <CustomerFormModal onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
