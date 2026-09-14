import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User, Building2, Building, Home, Store, Trees, LandPlot, CalendarClock,
  Warehouse, HardHat, Hotel, LayoutGrid, ChevronUp, ChevronDown, ChevronRight,
  Search, SearchX, Filter, List, LayoutGrid as GridIcon,
} from 'lucide-react';
import { EmptyState, TableSkeleton } from '../components/Feedback';
import { PanelHead } from '../components/PanelHead';
import { PropertyGalleryCard } from '../components/PropertyGalleryCard.jsx';
import { propertiesApi, PROPERTY_TYPES, PROPERTY_STATUSES, formatPropertyPrice } from '../api/properties';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import { ListingTypeBadge } from '../components/PropertyStatusBadge.jsx';
import PropertyFormModal from '../components/PropertyFormModal.jsx';
import PropertyWizardModal from '../components/PropertyWizardModal.jsx';
import MoneyInput from '../components/MoneyInput.jsx';
import QuickStatusSelect from '../components/QuickStatusSelect.jsx';

// Portfoy turu ikonlari. Her deger PROPERTY_TYPES'taki gercek bir turu
// karsilar; eslesmeyen bir tur gelirse ikon basilmaz.
const TUR_IKONLARI = {
  apartment: Building2,
  land: LandPlot,
  field: Trees,
  commercial: Store,
  timeshare: CalendarClock,
  villa: Home,
  office: Building,
  building: Warehouse,
  project: HardHat,
  hotel: Hotel,
};

// Gorunum tercihi tarayicida saklanir; kullanici her girisinde ayni
// gorunumle karsilasir. Erisilemezse (gizli sekme vb.) liste varsayilan.
const GORUNUM_ANAHTARI = 'primecrm.portfoy.gorunum';
function kayitliGorunum() {
  try {
    return localStorage.getItem(GORUNUM_ANAHTARI) === 'gallery' ? 'gallery' : 'list';
  } catch {
    return 'list';
  }
}

const filterCardStyle = {
  background: 'var(--cl-surface)',
  border: '1px solid var(--cl-border)',
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
  fontFamily: 'var(--font-body)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--cl-muted)',
  marginBottom: 4,
  display: 'block',
};

const rangeInputRowStyle = { display: 'flex', gap: 8, minWidth: 0 };

export default function PropertyListPage() {
  const { isBroker, user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [scope, setScope] = useState('mine'); // 'mine' | 'office' -- sadece Danisman icin anlamli
  const [showForm, setShowForm] = useState(false);
  const location = useLocation();

  // "+ Hizli Ekle" (ust bar) uzerinden "Yeni Portfoy" secildiginde,
  // bu sayfaya gelir gelmez wizard'i otomatik acar -- ekstra tiklama gerekmez.
  // Ayrica Danisman Panelindeki "Aktif Portföylerim" karti gibi yerlerden
  // status on-filtresiyle gelinebilir.
  useEffect(() => {
    if (location.state?.openPropertyWizard) {
      setShowForm(true);
    }
    if (location.state?.presetStatus) {
      setStatus(location.state.presetStatus);
    }
  }, [location.state]);
  const [showFilters, setShowFilters] = useState(false);
  const [gorunum, setGorunum] = useState(kayitliGorunum);

  function gorunumSec(deger) {
    setGorunum(deger);
    try { localStorage.setItem(GORUNUM_ANAHTARI, deger); } catch { /* onemli degil */ }
  }
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
    } else if (scope === 'office') {
      // Danisman icin: sadece isim donen, herkese acik endpoint
      // (listAgents Broker'a ozel oldugu icin 403 doner, bu yuzden ayri)
      usersApi.listAgentRoster().then(setAgents).catch(() => setAgents([]));
    }
  }, [isBroker, scope]);

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
    if (!isBroker && scope === 'office') params.scope = 'office';
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

    const data = await propertiesApi.list(params).catch(() => []);
    setProperties(data);
    setLoading(false);
  }, [
    search, activeType, isBroker, agentId, scope, status, minPrice, maxPrice, minArea, maxArea,
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

  async function handleStatusChange(propertyId, newStatus) {
    try {
      await propertiesApi.update(propertyId, { status: newStatus });
      setProperties((prev) => prev.map((p) => (p.id === propertyId ? { ...p, status: newStatus } : p)));
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Durum güncellenemedi.';
      alert(Array.isArray(message) ? message.join(', ') : message);
    }
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

  return (
    <div>
      <div className="cl-page-header">
        <div className="cl-page-header__text">
          <nav className="cl-breadcrumb" aria-label="Sayfa yolu">
            <Link to="/">Ana Sayfa</Link>
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            <span aria-current="page">Portföy Havuzu</span>
          </nav>
          <h2 className="cl-page-title">Portföy Havuzu</h2>
          <p className="cl-page-subtitle">
            Ofisin satılık ve kiralık portföyünü türe göre filtreleyip yönetin.
          </p>
        </div>
      </div>
      {!isBroker && (
        <div className="folder-tabs" style={{ marginBottom: 4 }}>
          <button
            className={`folder-tab ${scope === 'mine' ? 'active' : ''}`}
            onClick={() => setScope('mine')}
          >
            <User size={16} strokeWidth={2} /> Portföylerim
          </button>
          <button
            className={`folder-tab ${scope === 'office' ? 'active' : ''}`}
            onClick={() => setScope('office')}
          >
            <Building2 size={16} strokeWidth={2} /> Ofis Portföyü
          </button>
        </div>
      )}
      <div className="folder-tabs">
        <button
          type="button"
          className={`folder-tab ${activeType === 'all' ? 'active' : ''}`}
          onClick={() => setActiveType('all')}
        >
          <LayoutGrid size={16} strokeWidth={2} /> Tümü
        </button>
        {PROPERTY_TYPES.map((t) => {
          const Ikon = TUR_IKONLARI[t.value];
          return (
            <button
              type="button"
              key={t.value}
              className={`folder-tab ${activeType === t.value ? 'active' : ''}`}
              onClick={() => setActiveType(t.value)}
            >
              {Ikon && <Ikon size={16} strokeWidth={2} />} {t.label}
            </button>
          );
        })}
      </div>
      <div className="folder-panel">
        <PanelHead
          Icon={Building2}
          title="Portföy listesi"
          note={activeType === 'all'
            ? 'Tüm portföy türleri'
            : (PROPERTY_TYPES.find((t) => t.value === activeType)?.label || 'Portföy')}
          meta={loading ? undefined : `${properties.length} kayıt`}
        >
          <div className="list-toolbar">
            <div className="list-toolbar__search">
              <Search size={16} strokeWidth={2} />
              <input
                type="search"
                placeholder="Başlık, il, ilçe veya mahalle ile ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Portföylerde ara"
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              <Filter size={16} strokeWidth={2} />
              Filtreler{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              {showFilters ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
            </button>
            <div className="segmented view-switch" role="group" aria-label="Görünüm">
              <button
                type="button"
                className={`segmented__item${gorunum === 'list' ? ' is-active' : ''}`}
                aria-pressed={gorunum === 'list'}
                onClick={() => gorunumSec('list')}
                title="Liste görünümü"
              >
                <List size={16} strokeWidth={2} /> Liste
              </button>
              <button
                type="button"
                className={`segmented__item${gorunum === 'gallery' ? ' is-active' : ''}`}
                aria-pressed={gorunum === 'gallery'}
                onClick={() => gorunumSec('gallery')}
                title="Galeri görünümü"
              >
                <GridIcon size={16} strokeWidth={2} /> Galeri
              </button>
            </div>
          </div>
        </PanelHead>

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
                  <MoneyInput placeholder="Min" value={minPrice} onChange={setMinPrice} style={{ width: '50%', minWidth: 0 }} />
                  <MoneyInput placeholder="Maks" value={maxPrice} onChange={setMaxPrice} style={{ width: '50%', minWidth: 0 }} />
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
                style={{ marginTop: 14, color: 'var(--cl-danger)' }}
                onClick={clearFilters}
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={6} columns={4} label="Portföyler yükleniyor…" />
        ) : properties.length === 0 ? (
          (search || activeFilterCount > 0) ? (
            <EmptyState
              Icon={SearchX}
              title="Arama veya filtreyle eşleşen portföy bulunamadı"
              note="Aramayı ve filtreleri temizleyip tekrar deneyin."
              actionLabel="Aramayı ve filtreleri temizle"
              onAction={() => { setSearch(''); clearFilters(); }}
            />
          ) : (
            <EmptyState
              Icon={Building2}
              title="Bu listede henüz portföy yok"
              note={'Üst menüdeki "+ Hızlı Ekle" düğmesiyle ilk portföyü oluşturabilirsiniz.'}
            />
          )
        ) : gorunum === 'gallery' ? (
          <div className="gallery-grid">
            {properties.map((p) => {
              const isOfficeView = !isBroker && scope === 'office';
              const ownerName = isOfficeView ? agents.find((a) => a.id === p.agentId)?.name : null;
              return (
                <PropertyGalleryCard
                  key={p.id}
                  property={p}
                  TurIkonu={TUR_IKONLARI[p.propertyType]}
                  fiyatMetni={formatPropertyPrice(p)}
                  sahipAdi={ownerName}
                />
              );
            })}
          </div>
        ) : (
          <div>
            {properties.map((p) => {
              const isOfficeView = !isBroker && scope === 'office';
              const isOwnListing = !user || p.agentId === user.id;
              const ownerName = isOfficeView ? agents.find((a) => a.id === p.agentId)?.name : null;
              return (
                <Link to={`/portfoyler/${p.id}`} className="record-row" key={p.id}>
                  <ListingTypeBadge listingType={p.listingType} />
                  {isOfficeView && !isOwnListing ? (
                    <span className="status-badge" style={{ background: 'var(--cl-border)', color: 'var(--cl-muted)' }}>
                      {PROPERTY_STATUSES.find((s) => s.value === p.status)?.label}
                    </span>
                  ) : (
                    <QuickStatusSelect
                      status={p.status}
                      onChange={(newStatus) => handleStatusChange(p.id, newStatus)}
                    />
                  )}
                  <span className="record-row__name">{p.title}</span>
                  <span className="record-row__phone">
                    {p.district}
                    {isOfficeView && ownerName && ` · ${ownerName}`}
                  </span>
                  <span className="record-row__budget">{formatPropertyPrice(p)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      {showForm && (
        <PropertyWizardModal onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
