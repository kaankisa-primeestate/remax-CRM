import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { customersApi } from '../api/customers';

const MATCHABLE_TYPES = ['buyer', 'tenant', 'investor'];
const MAX_CUSTOMERS_TO_SCAN = 50; // performans icin ust sinir

const money = (n) =>
  n ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : '—';

function scoreColor(score) {
  if (score >= 70) return { bg: '#e6f4ea', fg: '#1e7a3d' };
  if (score >= 55) return { bg: '#fdf3e0', fg: '#8a6100' };
  return { bg: '#eef3f9', fg: 'var(--ink-navy)' };
}

// Sicak Firsatlar: eskiden "Talepler" (musteri listesi) ve Panelim'deki
// "Akilli Eslestirmeler" widget'i AYRI AYRI, kismen ortusen iki farkli
// gorunum sunuyordu -- kafa karistiriyordu. Artik TEK bir ekran: musteri
// ile portfoy arasindaki HER eslesmeyi (ayni eslestirme motorundan,
// matching.service.ts), en yuksek skordan en dusuge dogru TEK bir liste
// halinde gosterir. Bir satira tiklamak ilgili portfoye goturur,
// musteri adina tiklamak musteri kartina goturur.
export default function RequestsPage() {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const all = await customersApi.list({});
    const candidates = all.filter((c) => MATCHABLE_TYPES.includes(c.type)).slice(0, MAX_CUSTOMERS_TO_SCAN);

    const results = await Promise.all(
      candidates.map(async (c) => {
        try {
          const matches = await customersApi.matchingProperties(c.id);
          return matches.map((m) => ({ customer: c, property: m.property, score: m.score }));
        } catch {
          return [];
        }
      }),
    );
    const flattened = results.flat().sort((a, b) => b.score - a.score);
    setPairs(flattened);
    setLoading(false);
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
        <h2 className="dossier__name" style={{ margin: 0 }}>🔥 Sıcak Fırsatlar</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Müşteri veya ilan ara…"
          style={{ maxWidth: 260 }}
        />
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -10, marginBottom: 20 }}>
        Müşterilerinizin aradığı özelliklerle portföylerin otomatik karşılaştırılmasından doğan tüm eşleşmeler, en yüksek orandan en düşüğe sıralı. Bir satıra tıklayınca ilgili portföye gidersiniz.
      </p>

      {loading ? (
        <div className="empty-state">Eşleşmeler taranıyor…</div>
      ) : filtered.length === 0 ? (
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
                  borderTop: i > 0 ? '1px solid var(--paper-line)' : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
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
                <Link to={`/portfoyler/${p.property.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.property.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {p.property.district} · {money(p.property.price)}
                  </div>
                </Link>
                <Link
                  to={`/musteriler/${p.customer.id}`}
                  style={{ fontSize: 12, color: 'var(--ink-navy)', textAlign: 'right', flexShrink: 0, textDecoration: 'none' }}
                >
                  👤 {p.customer.firstName} {p.customer.lastName}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
