import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { PIPELINE_STAGES } from '../constants/pipeline.js';

const MATCHABLE_TYPES = ['buyer', 'tenant', 'investor'];
const MAX_CUSTOMERS_TO_SCAN = 50; // performans icin ust sinir

const TIMELINE_LABELS = {
  immediate: 'Hemen',
  '1_3_months': '1–3 ay içinde',
  '3_6_months': '3–6 ay içinde',
  later: 'Daha sonra',
};

const TIMELINE_URGENCY = { immediate: 0, '1_3_months': 1, '3_6_months': 2, later: 3 };

const money = (n) =>
  n ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : '—';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'bugün';
  if (days === 1) return 'dün';
  if (days < 30) return `${days} gün önce`;
  return new Date(dateStr).toLocaleDateString('tr-TR');
}

// Talepler: "Kim ne ariyor?" -- mevcut musteri verisini aksiyon odakli,
// eslesme sayisiyla zenginlestirilmis bir calisma masasi olarak sunar.
// Yeni bir backend yapisi gerektirmez, var olan musteri + eslestirme
// motorunu yeniden duzenler.
export default function RequestsPage() {
  const [customers, setCustomers] = useState([]);
  const [matchCounts, setMatchCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('urgency'); // urgency | matches | recent
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const all = await customersApi.list({});
    const requests = all
      .filter((c) => MATCHABLE_TYPES.includes(c.type))
      .slice(0, MAX_CUSTOMERS_TO_SCAN);
    setCustomers(requests);
    setLoading(false);

    // Eslesme sayilarini arka planda, sayfa zaten gorunur haldeyken
    // hesapliyoruz -- kullanici bekletilmez, kartlar geldikce dolar.
    const results = await Promise.all(
      requests.map(async (c) => {
        try {
          const matches = await customersApi.matchingProperties(c.id);
          return [c.id, { count: matches.length, topScore: matches[0]?.score ?? 0 }];
        } catch {
          return [c.id, { count: 0, topScore: 0 }];
        }
      }),
    );
    setMatchCounts(Object.fromEntries(results));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || (c.propertyInterest || '').toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'urgency') {
      const ua = TIMELINE_URGENCY[a.purchaseTimeline] ?? 9;
      const ub = TIMELINE_URGENCY[b.purchaseTimeline] ?? 9;
      return ua - ub;
    }
    if (sortBy === 'matches') {
      return (matchCounts[b.id]?.count ?? 0) - (matchCounts[a.id]?.count ?? 0);
    }
    // recent
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Talepler</h2>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="İsim veya ne aradığıyla ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="urgency">Aciliyete göre sırala</option>
            <option value="matches">Eşleşme sayısına göre sırala</option>
            <option value="recent">Son güncellemeye göre sırala</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Yükleniyor…</div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          {search ? 'Aramanızla eşleşen talep yok.' : 'Aktif bir talebiniz (Alıcı/Kiracı/Yatırımcı) yok.'}
        </div>
      ) : (
        sorted.map((c) => {
          const stageLabel = PIPELINE_STAGES.find((s) => s.key === c.pipelineStage)?.label || 'İlk Temas';
          const match = matchCounts[c.id];
          return (
            <Link to={`/musteriler/${c.id}`} className="request-card" key={c.id}>
              <div className="request-card__main">
                <div className="request-card__name">
                  {c.firstName} {c.lastName}
                  <span className="request-card__type">{CUSTOMER_TYPES.find((t) => t.value === c.type)?.label}</span>
                </div>
                <div className="request-card__meta">
                  {c.propertyInterest && <span>{c.propertyInterest}</span>}
                  {c.budget && <span> · {money(c.budget)}</span>}
                  {c.preferredDistricts?.length > 0 && <span> · {c.preferredDistricts.join(', ')}</span>}
                </div>
              </div>
              <div className="request-card__side">
                {c.purchaseTimeline && (
                  <span className={`request-card__urgency${c.purchaseTimeline === 'immediate' ? ' is-urgent' : ''}`}>
                    {TIMELINE_LABELS[c.purchaseTimeline]}
                  </span>
                )}
                <span className="request-card__stage">{stageLabel}</span>
                {match !== undefined && (
                  <span className={`request-card__matches${match.count > 0 ? ' has-matches' : ''}`}>
                    {match.count > 0 ? `🔗 ${match.count} eşleşme` : 'Eşleşme yok'}
                  </span>
                )}
                <span className="request-card__updated">{timeAgo(c.updatedAt)}</span>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
