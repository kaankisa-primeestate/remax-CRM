import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import StatusBadge from '../components/StatusBadge.jsx';
import CustomerFormModal from '../components/CustomerFormModal.jsx';

export default function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (activeType !== 'all') params.type = activeType;
    const data = await customersApi.list(params);
    setCustomers(data);
    setLoading(false);
  }, [search, activeType]);

  useEffect(() => {
    const timeout = setTimeout(load, 250); // arama için hafif debounce
    return () => clearTimeout(timeout);
  }, [load]);

  async function handleCreate(payload) {
    await customersApi.create(payload);
    setShowForm(false);
    load();
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
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Yeni Müşteri
          </button>
        </div>

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
