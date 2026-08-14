import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { propertiesApi } from '../api/properties';
import { customersApi } from '../api/customers';

const money = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0);

const MATCHABLE_TYPES = ['buyer', 'tenant', 'investor'];
const MAX_CUSTOMERS_TO_SCAN = 8; // performans icin taranacak musteri sayisi ust siniri
const MAX_MATCHES_SHOWN = 4;

const KANBAN_COLUMNS = [
  { key: 'new', label: 'Yeni Talepler' },
  { key: 'showing', label: 'Gösterim Yapılan' },
  { key: 'offer', label: 'Teklif Aşaması' },
  { key: 'closed', label: 'Tapu / Kapanan' },
];

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || '';

  const [loading, setLoading] = useState(true);
  const [activePropertiesCount, setActivePropertiesCount] = useState(0);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [properties, customers] = await Promise.all([
        propertiesApi.list({ status: 'active' }),
        customersApi.list({}),
      ]);
      if (cancelled) return;
      setActivePropertiesCount(properties.length);

      // Akilli Eslestirme: kendi musterilerinden (alici/kiraci/yatirimci)
      // birkacini tarayip en iyi eslesen portfoyleri topluyoruz. Bu, zaten
      // var olan eslestirme motorunu (matching.service.ts) kullanir --
      // yeni bir backend ozelligi degildir.
      const candidates = customers
        .filter((c) => MATCHABLE_TYPES.includes(c.type))
        .slice(0, MAX_CUSTOMERS_TO_SCAN);

      const results = await Promise.all(
        candidates.map(async (c) => {
          try {
            const found = await customersApi.matchingProperties(c.id);
            if (!found || found.length === 0) return null;
            return { customer: c, ...found[0] };
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const topMatches = results
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_MATCHES_SHOWN);
      setMatches(topMatches);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 4 }}>
        Merhaba{firstName ? `, ${firstName}` : ''} 👋
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 20 }}>
        {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* --- Metrik Kartları --- */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card__label">Aktif Portföylerim</div>
          <div className="metric-card__value">{loading ? '…' : activePropertiesCount} İlan</div>
          <div className="metric-card__delta is-muted">Şu an yayında</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Bu Ayki Hedefim<span className="soon-badge">Yakında</span></div>
          <div className="metric-card__value" style={{ color: 'var(--muted)', fontSize: 16 }}>Hedef belirlenmedi</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Sıcak Fırsatlar<span className="soon-badge">Yakında</span></div>
          <div className="metric-card__value" style={{ color: 'var(--muted)', fontSize: 16 }}>—</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Bu Haftaki Gösterim<span className="soon-badge">Yakında</span></div>
          <div className="metric-card__value" style={{ color: 'var(--muted)', fontSize: 16 }}>—</div>
        </div>
      </div>

      {/* --- Bugünün İş Planı + Akıllı Eşleştirmeler --- */}
      <div className="panel-grid-2">
        <div className="panel">
          <h3 className="panel__title">Bugünün İş Planı ve Randevuları</h3>
          <div className="panel__empty">
            Takvim özelliği eklendiğinde günlük randevularınız burada akış halinde görünecek.
            <span className="soon-badge">Yakında</span>
          </div>
        </div>
        <div className="panel">
          <h3 className="panel__title">Akıllı Eşleştirmeler</h3>
          {loading ? (
            <div className="panel__empty">Yükleniyor…</div>
          ) : matches.length === 0 ? (
            <div className="panel__empty">Şu an güçlü bir eşleşme bulunamadı.</div>
          ) : (
            matches.map((m) => (
              <div className="match-card" key={`${m.customer.id}-${m.property.id}`}>
                <span className="match-card__pct">%{m.score}</span>
                <div className="match-card__body">
                  <div className="match-card__title">{m.property.title}</div>
                  <div className="match-card__meta">
                    {m.customer.firstName} {m.customer.lastName} için · {m.property.district} · {money(m.property.price)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- Müşteri Takip Kanban Panosu --- */}
      <div className="panel">
        <h3 className="panel__title">
          Müşteri Takip Panosu <span className="soon-badge">Yakında</span>
        </h3>
        <div className="kanban-board">
          {KANBAN_COLUMNS.map((col) => (
            <div className="kanban-column" key={col.key}>
              <div className="kanban-column__title">{col.label}</div>
              <div className="kanban-empty">Aşama takibi eklendiğinde burada görünecek</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
