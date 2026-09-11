import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Flame, AlertTriangle, User } from 'lucide-react';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 className="dossier__name" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={20} style={{ color: 'var(--cl-danger)' }} /> Sıcak Fırsatlar
        </h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Müşteri veya ilan ara…"
          style={{ maxWidth: 260 }}
        />
      </div>
      <p style={{ fontSize: 13, color: 'var(--cl-muted)', marginTop: -10, marginBottom: 20 }}>
        {isBroker
          ? 'Ofis genelindeki tüm danışmanların müşteri ve portföyleri arasındaki eşleşmeler, en yüksek orandan en düşüğe sıralı.'
          : 'Sizinle ilgili (kendi müşteriniz ya da kendi portföyünüz olan) tüm eşleşmeler, en yüksek orandan en düşüğe sıralı.'}
        {' '}Bir satıra tıklayınca ilgili portföye gidersiniz.
      </p>

      {error && (
        <div className="empty-state" style={{ color: 'var(--cl-danger)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <AlertTriangle size={15} /> {error} <button type="button" className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={load}>Tekrar dene</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Eşleşmeler taranıyor…</div>
      ) : error ? null : filtered.length === 0 ? (
        <div className="empty-state">
          {search.trim() ? 'Aramanızla eşleşen bir sonuç yok.' : 'Şu an güçlü bir eşleşme bulunamadı — müşteri ve portföy bilgileri ne kadar dolu olursa eşleştirme o kadar isabetli olur.'}
        </div>
      ) : (
        <div className="folder-panel" style={{ padding: 0 }}>
          {filtered.map((p, i) => {
            const colors = scoreColor(p.score);
            return (
              <div
                key={`${p.customer.id}-${p.property.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid var(--cl-border)' : 'none',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: 13,
                    background: colors.bg,
                    color: colors.fg,
                    borderRadius: 999,
                    padding: '4px 10px',
                    flexShrink: 0,
                    minWidth: 48,
                    textAlign: 'center',
                  }}
                >
                  %{p.score}
                </span>
                <Link to={`/portfoyler/${p.property.id}`} style={{ flex: 1, minWidth: 160, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.property.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--cl-muted)' }}>
                    {p.property.district} · {money(p.property.price)}
                    {isBroker && p.propertyAgentName && ` · ${p.propertyAgentName}`}
                  </div>
                </Link>
                <Link
                  to={`/musteriler/${p.customer.id}`}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--cl-primary-800)', textAlign: 'right', flexShrink: 0, textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <User size={12} /> {p.customer.firstName} {p.customer.lastName}
                  </span>
                  {isBroker && p.customerAgentName && (
                    <span style={{ fontSize: 11, color: 'var(--cl-muted)', fontWeight: 400 }}>{p.customerAgentName}</span>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
