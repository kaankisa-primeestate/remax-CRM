import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { propertiesApi, PROPERTY_TYPES, PROPERTY_STATUSES } from '../api/properties';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import { PropertyStatusBadge, ListingTypeBadge } from '../components/PropertyStatusBadge.jsx';
import PropertyFormModal from '../components/PropertyFormModal.jsx';

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

export default function PropertyListPage() {
  const { isBroker } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [agents, setAgents] = useState([]);

  const [agentId, setAgentId] = useState('');
  const [status, setStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [rooms, setRooms] = useState('');
  const [minBuildingAge, setMinBuildingAge] = useState('');
  const [maxBuildingAge, setMaxBuildingAge] = useState('');
  const [heatingType, setHeatingType] = useState('');
  const [view, setView] = useState('');
  const [hasPool, setHasPool] = useState(false);
  const [hasGym, setHasGym] = useState(false);
  const [hasSecurity, setHasSecurity] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isBroker]);

  // Sekme (Tümü/Konut/Arsa/...) değiştiğinde filtre panelini otomatik kapat
  useEffect(() => {
    setShowFilters(false);
  }, [activeType]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (activeType !== 'all') params.propertyType = activeType;
    if (isBroker && agentId) params.agentId = agentId;
    if (status) params.status = status;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (minArea) params.minArea = minArea;
    if (maxArea) params.maxArea = maxArea;
    if (rooms) params.rooms = rooms;
    if (minBuildingAge) params.minBuildingAge = minBuildingAge;
    if (maxBuildingAge) params.maxBuildingAge = maxBuildingAge;
    if (heatingType) params.heatingType = heatingType;
    if (view) params.view = view;
    if (hasPool) params.hasPool = 'true';
    if (hasGym) params.hasGym = 'true';
    if (hasSecurity) params.hasSecurity = 'true';
    if (hasParking) params.hasParking = 'true';
    if (keyword) params.keyword = keyword;

    const data = await propertiesApi.list(params);
    setProperties(data);
    setLoading(false);
  }, [
    search, activeType, isBroker, agentId, status, minPrice, maxPrice, minArea, maxArea,
    rooms, minBuildingAge, maxBuildingAge, heatingType, view, hasPool, hasGym, hasSecurity, hasParking, keyword,
  ]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  async function handleCreate(payload) {
    await propertiesApi.create(payload);
    setShowForm(false);
    load();
  }

  const activeFilterCount = [
    agentId, status, minPrice, maxPrice, minArea, maxArea, rooms,
    minBuildingAge, maxBuildingAge, heatingType, view, keyword,
  ].filter(Boolean).length + [hasPool, hasGym, hasSecurity, hasParking].filter(Boolean).length;

  function clearFilters() {
    setAgentId('');
    setStatus('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setRooms('');
    setMinBuildingAge('');
    setMaxBuildingAge('');
    setHeatingType('');
    setView('');
    setHasPool(false);
    setHasGym(false);
    setHasSecurity(false);
    setHasParking(false);
    setKeyword('');
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
          <button className="btn btn-secondary" onClick={() => setShowFilters((v) => !v)}>
            Filtreler{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''} {showFilters ? '▲' : '▼'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Yeni Portföy
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
                <label style={filterLabelStyle}>Durum</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Tümü</option>
                  {PROPERTY_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={filterLabelStyle}>Oda Sayısı</label>
                <input value={rooms} onChange={(e) => setRooms(e.target.value)} placeholder="Örn: 2+1" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={filterLabelStyle}>Isıtma Tipi</label>
                <input value={heatingType} onChange={(e) => setHeatingType(e.target.value)} placeholder="Örn: Doğalgaz" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={filterLabelStyle}>Manzara</label>
                <input value={view} onChange={(e) => setView(e.target.value)} placeholder="Örn: Deniz" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={filterLabelStyle}>Fiyat Aralığı (₺)</label>
                <div style={rangeInputRowStyle}>
                  <input placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" style={{ width: '50%', minWidth: 0 }} />
                  <input placeholder="Maks" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" style={{ width: '50%', minWidth: 0 }} />
                </div>
              </div>
              <div>
                <label style={filterLabelStyle}>Metrekare Aralığı</label>
                <div style={rangeInputRowStyle}>
                  <input placeholder="Min" value={minArea} onChange={(e) => setMinArea(e.target.value)} type="number" style={{ width: '50%', minWidth: 0 }} />
                  <input placeholder="Maks" value={maxArea} onChange={(e) => setMaxArea(e.target.value)} type="number" style={{ width: '50%', minWidth: 0 }} />
                </div>
              </div>
              <div>
                <label style={filterLabelStyle}>Bina Yaşı Aralığı</label>
                <div style={rangeInputRowStyle}>
                  <input placeholder="Min" value={minBuildingAge} onChange={(e) => setMinBuildingAge(e.target.value)} type="number" style={{ width: '50%', minWidth: 0 }} />
                  <input placeholder="Maks" value={maxBuildingAge} onChange={(e) => setMaxBuildingAge(e.target.value)} type="number" style={{ width: '50%', minWidth: 0 }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                [hasPool, setHasPool, 'Havuz'],
                [hasGym, setHasGym, 'Spor Salonu'],
                [hasSecurity, setHasSecurity, 'Güvenlik'],
                [hasParking, setHasParking, 'Otopark'],
              ].map(([val, setVal, label]) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                  <input type="checkbox" checked={val} onChange={(e) => setVal(e.target.checked)} style={{ width: 'auto' }} />
                  {label}
                </label>
              ))}
            </div>

            <div>
              <label style={filterLabelStyle}>
                Anahtar Kelime (notlarda / ilan açıklamasında ara — örn: "okula yakın")
              </label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Örn: okula yakın, pazara yakın"
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
