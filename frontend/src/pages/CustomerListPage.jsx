import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Flame, X, ChevronUp, ChevronDown, ChevronRight, Users, ShoppingBag, Tag,
  KeyRound, Home, TrendingUp, LayoutGrid, Search, SearchX, Filter,
  List, LayoutGrid as GridIcon,
} from 'lucide-react';
import { EmptyState, TableSkeleton } from '../components/Feedback';
import { PanelHead } from '../components/PanelHead';
import { CustomerGalleryCard } from '../components/CustomerGalleryCard.jsx';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CustomerFormModal from '../components/CustomerFormModal.jsx';
import QuickAddCustomerModal from '../components/QuickAddCustomerModal.jsx';
import MoneyInput from '../components/MoneyInput.jsx';

// Musteri turu ikonlari. Her deger CUSTOMER_TYPES'taki gercek bir turu
// karsilar; eslesmeyen bir tur gelirse ikon basilmaz.
const TUR_IKONLARI = {
  buyer: ShoppingBag,
  seller: Tag,
  tenant: KeyRound,
  landlord: Home,
  investor: TrendingUp,
};

// Gorunum tercihi tarayicida saklanir; portfoyden ayri bir anahtar
// kullaniliyor, iki sayfa birbirinin tercihini degistirmesin.
const GORUNUM_ANAHTARI = 'primecrm.musteri.gorunum';
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

// "Sicak Firsat" tanimi: AgentDashboardPage'deki ile ayni mantik --
// Alici/Kiraci/Yatirimci tipinde VE "Ne zaman?" sorusuna "Hemen" diyen
// musteriler. Backend'de ayri bir filtre parametresi yok, bu yuzden
// istemci tarafinda (zaten yuklenmis musteri listesi uzerinde) filtreleniyor.
const HOT_TYPES = ['buyer', 'tenant', 'investor'];

export default function CustomerListPage() {
  const { isBroker } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const location = useLocation();

  // "+ Hizli Ekle" (ust bar) uzerinden "Yeni Musteri" secildiginde,
  // bu sayfaya gelir gelmez formu otomatik acar -- ekstra tiklama gerekmez.
  // Ayrica Danisman Panelindeki "Sıcak Fırsatlar" karti gibi yerlerden
  // hotOnly on-filtresiyle gelinebilir.
  useEffect(() => {
    if (location.state?.openQuickAdd) {
      setShowQuickAdd(true);
    }
    if (location.state?.presetHotOnly) {
      setHotOnly(true);
    }
  }, [location.state]);
  const [showFilters, setShowFilters] = useState(false);
  const [gorunum, setGorunum] = useState(kayitliGorunum);

  function gorunumSec(deger) {
    setGorunum(deger);
    try { localStorage.setItem(GORUNUM_ANAHTARI, deger); } catch { /* onemli degil */ }
  }
  const [agents, setAgents] = useState([]);
  const [hotOnly, setHotOnly] = useState(false);

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

    const data = await customersApi.list(params).catch(() => []);
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
    setShowQuickAdd(false);
    load();
  }

  const activeFilterCount = [agentId, minBudget, maxBudget, keyword].filter(Boolean).length;

  function clearFilters() {
    setAgentId('');
    setMinBudget('');
    setMaxBudget('');
    setKeyword('');
  }

  const displayedCustomers = hotOnly
    ? customers.filter((c) => HOT_TYPES.includes(c.type) && c.purchaseTimeline === 'immediate')
    : customers;

  const formatBudget = (c) =>
    c.budget != null
      ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c.budgetCurrency || 'TRY', maximumFractionDigits: 0 }).format(c.budget)
      : '—';

  return (
    <div>
      <div className="cl-page-header">
        <div className="cl-page-header__text">
          <nav className="cl-breadcrumb" aria-label="Sayfa yolu">
            <Link to="/">Ana Sayfa</Link>
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            <span aria-current="page">Müşteri Havuzu</span>
          </nav>
          <h2 className="cl-page-title">Müşteri Havuzu</h2>
          <p className="cl-page-subtitle">
            Alıcı, satıcı, kiracı ve yatırımcı kayıtlarını türe göre filtreleyip yönetin.
          </p>
        </div>
      </div>
      <div className="folder-tabs">
        <button
          type="button"
          className={`folder-tab ${activeType === 'all' ? 'active' : ''}`}
          onClick={() => setActiveType('all')}
        >
          <LayoutGrid size={16} strokeWidth={2} /> Tümü
        </button>
        {CUSTOMER_TYPES.map((t) => {
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
          Icon={Users}
          title="Müşteri listesi"
          note={activeType === 'all'
            ? 'Tüm müşteri türleri'
            : (CUSTOMER_TYPES.find((t) => t.value === activeType)?.label || 'Müşteri')}
          meta={loading ? undefined : `${displayedCustomers.length} kayıt`}
        >
          <div className="list-toolbar">
            <div className="list-toolbar__search">
              <Search size={16} strokeWidth={2} />
              <input
                type="search"
                placeholder="Ad, soyad veya telefon ile ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Müşterilerde ara"
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
                title="Kart görünümü"
              >
                <GridIcon size={16} strokeWidth={2} /> Kartlar
              </button>
            </div>
          </div>
        </PanelHead>

        {hotOnly && (
          <div className="active-filter-row">
            <span className="pill pill--wait">
              <Flame size={13} strokeWidth={2} /> Sıcak Fırsatlar filtresi aktif
              <button
                type="button"
                className="pill__remove"
                onClick={() => setHotOnly(false)}
                aria-label="Sıcak Fırsatlar filtresini kaldır"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </span>
          </div>
        )}

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
                  <MoneyInput placeholder="Min" value={minBudget} onChange={setMinBudget} style={{ width: '50%', minWidth: 0 }} />
                  <MoneyInput placeholder="Maks" value={maxBudget} onChange={setMaxBudget} style={{ width: '50%', minWidth: 0 }} />
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
                style={{ marginTop: 14, color: 'var(--cl-danger)' }}
                onClick={clearFilters}
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={6} columns={4} label="Müşteriler yükleniyor…" />
        ) : displayedCustomers.length === 0 ? (
          hotOnly ? (
            <EmptyState
              Icon={Flame}
              title={'Şu an "Hemen" almak/kiralamak isteyen bir müşteri yok'}
              note="Sıcak Fırsatlar filtresini kaldırıp tüm müşterileri görebilirsiniz."
              actionLabel="Sıcak Fırsatlar filtresini kaldır"
              onAction={() => setHotOnly(false)}
            />
          ) : (search || activeFilterCount > 0) ? (
            <EmptyState
              Icon={SearchX}
              title="Arama veya filtreyle eşleşen müşteri bulunamadı"
              note="Aramayı ve filtreleri temizleyip tekrar deneyin."
              actionLabel="Aramayı ve filtreleri temizle"
              onAction={() => { setSearch(''); clearFilters(); }}
            />
          ) : (
            <EmptyState
              Icon={Users}
              title="Bu listede henüz müşteri yok"
              note={'Üst menüdeki "+ Hızlı Ekle" düğmesiyle ilk müşteriyi oluşturabilirsiniz.'}
            />
          )
        ) : gorunum === 'gallery' ? (
          <div className="gallery-grid">
            {displayedCustomers.map((c) => (
              <CustomerGalleryCard key={c.id} customer={c} butceMetni={formatBudget(c)} />
            ))}
          </div>
        ) : (
          <div>
            {displayedCustomers.map((c) => (
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
      {showQuickAdd && (
        <QuickAddCustomerModal
          onSubmit={handleCreate}
          onClose={() => setShowQuickAdd(false)}
          onSwitchToDetailed={() => { setShowQuickAdd(false); setShowForm(true); }}
        />
      )}
      {showForm && (
        <CustomerFormModal onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
