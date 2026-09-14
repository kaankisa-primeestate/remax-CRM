import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Flame, AlertTriangle, User, ChevronRight, Search, SearchX, RotateCcw } from 'lucide-react';
import { EmptyState, TableSkeleton } from '../components/Feedback';
import { PanelHead } from '../components/PanelHead';
import { customersApi } from '../api/customers';
import { useAuth } from '../context/AuthContext.jsx';

const money = (n) =>
  n ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : '—';

function scoreColor(score) {
  if (score >= 70) return { bg: 'rgba(21, 154, 99, 0.12)', fg: 'var(--cl-success)' };
  if (score >= 55) return { bg: 'rgba(196, 154, 85, 0.15)', fg: '#8a6420' };
  return { bg: 'rgba(16, 35, 61, 0.06)', fg: 'var(--cl-primary-800)' };
}

// Sicak Firsatlar: TEK bir sunucu tarafi endpoint'ten (hot-matches) ofis
// genelindeki (Broker) ya da kendisiyle ilgili (Danisman) TUM eslesmeleri
// tek seferde ceker -- eskiden her musteri icin AYRI bir istek atilip,
// hata SESSIZCE yutuluyordu (try/catch { return [] }), bu yuzden gercek
// bir hata ile "eslesme yok" ayirt edilemiyordu. Artik TEK istek, hata
// varsa ACIKCA gosteriliyor.
export default function RequestsPage() {
  const { isBroker } = useAuth();
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const results = await customersApi.hotMatches();
      setPairs(results);
    } catch (err) {
      setError(err?.response?.data?.message || 'Eşleşmeler yüklenemedi, tekrar deneyin.');
      setPairs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = pairs.filter((p) => {
    if (!search.trim()) return true;
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return (
      `${p.customer.firstName} ${p.customer.lastName}`.toLocaleLowerCase('tr-TR').includes(q) ||
      (p.property.title || '').toLocaleLowerCase('tr-TR').includes(q) ||
      (p.property.district || '').toLocaleLowerCase('tr-TR').includes(q)
    );
  });

  return (
    <div>
      <div className="cl-page-header">
        <div className="cl-page-header__text">
          <nav className="cl-breadcrumb" aria-label="Sayfa yolu">
            <Link to="/">Ana Sayfa</Link>
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            <span aria-current="page">Sıcak Fırsatlar</span>
          </nav>
          <h2 className="cl-page-title">Sıcak Fırsatlar</h2>
          <p className="cl-page-subtitle">
            {isBroker
              ? 'Ofis genelindeki müşteri ve portföy eşleşmeleri, en yüksek orandan en düşüğe sıralı.'
              : 'Sizinle ilgili müşteri ve portföy eşleşmeleri, en yüksek orandan en düşüğe sıralı.'}
            {' '}Bir satıra tıklayınca ilgili portföye gidersiniz.
          </p>
        </div>
      </div>

      <div className="folder-panel">
        <PanelHead
          Icon={Flame}
          title="Eşleşme listesi"
          note="Müşteri ve portföy bilgileri ne kadar dolu olursa eşleştirme o kadar isabetli olur."
          meta={loading || error ? undefined : `${filtered.length} eşleşme`}
        >
          <div className="list-toolbar">
            <div className="list-toolbar__search">
              <Search size={16} strokeWidth={2} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Müşteri veya ilan ara…"
                aria-label="Eşleşmelerde ara"
              />
            </div>
          </div>
        </PanelHead>

        {error ? (
          <EmptyState
            Icon={AlertTriangle}
            title="Eşleşmeler yüklenemedi"
            note={error}
            actionLabel="Tekrar dene"
            onAction={load}
          />
        ) : loading ? (
          <TableSkeleton rows={5} columns={4} label="Eşleşmeler taranıyor…" />
        ) : filtered.length === 0 ? (
          search.trim() ? (
            <EmptyState
              Icon={SearchX}
              title="Aramanızla eşleşen bir sonuç yok"
              note="Aramayı temizleyip tüm eşleşmeleri görebilirsiniz."
              actionLabel="Aramayı temizle"
              onAction={() => setSearch('')}
            />
          ) : (
            <EmptyState
              Icon={Flame}
              title="Şu an güçlü bir eşleşme bulunamadı"
              note="Müşteri ve portföy bilgileri ne kadar dolu olursa eşleştirme o kadar isabetli olur."
            />
          )
        ) : (
        <div className="opportunity-list">
          {filtered.map((p, i) => {
            const colors = scoreColor(p.score);
            return (
              <div className="opportunity-row" key={`${p.customer.id}-${p.property.id}`}>
                <span className="opportunity-row__score" style={{ background: colors.bg, color: colors.fg }}>
                  %{p.score}
                </span>
                <Link to={`/portfoyler/${p.property.id}`} className="opportunity-row__property">
                  <span className="opportunity-row__title">{p.property.title}</span>
                  <span className="opportunity-row__meta">
                    {p.property.district} · {money(p.property.price)}
                    {isBroker && p.propertyAgentName && ` · ${p.propertyAgentName}`}
                  </span>
                </Link>
                <Link to={`/musteriler/${p.customer.id}`} className="opportunity-row__customer">
                  <span className="opportunity-row__customer-name">
                    <User size={12} strokeWidth={2} /> {p.customer.firstName} {p.customer.lastName}
                  </span>
                  {isBroker && p.customerAgentName && (
                    <span className="opportunity-row__meta">{p.customerAgentName}</span>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
