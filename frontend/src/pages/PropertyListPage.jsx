import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { propertiesApi, PROPERTY_TYPES } from '../api/properties';
import { PropertyStatusBadge, ListingTypeBadge } from '../components/PropertyStatusBadge.jsx';
import PropertyFormModal from '../components/PropertyFormModal.jsx';

export default function PropertyListPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (activeType !== 'all') params.propertyType = activeType;
    const data = await propertiesApi.list(params);
    setProperties(data);
    setLoading(false);
  }, [search, activeType]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  async function handleCreate(payload) {
    await propertiesApi.create(payload);
    setShowForm(false);
    load();
  }

  const formatPrice = (p) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: p.priceCurrency || 'TRY',
      maximumFractionDigits: 0,
    }).format(p.price);

  return (
    <div>
      <div className="folder-tabs">
        <button
          className={`folder-tab ${activeType === 'all' ? 'active' : ''}`}
          onClick={() => setActiveType('all')}
        >
          Tümü
        </button>
        {PROPERTY_TYPES.map((t) => (
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
            placeholder="Başlık, il, ilçe veya mahalle ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Yeni Portföy
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : properties.length === 0 ? (
          <div className="empty-state">
            Kayıt bulunamadı. "Yeni Portföy" ile ilk kaydı oluşturun.
          </div>
        ) : (
          <div>
            {properties.map((p) => (
              <Link to={`/portfoyler/${p.id}`} className="record-row" key={p.id}>
                <ListingTypeBadge listingType={p.listingType} />
                <PropertyStatusBadge status={p.status} />
                <span className="record-row__name">{p.title}</span>
                <span className="record-row__phone">{p.district}</span>
                <span className="record-row__budget">{formatPrice(p)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <PropertyFormModal onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
