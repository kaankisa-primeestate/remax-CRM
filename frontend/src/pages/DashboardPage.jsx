import { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '../api/dashboard';
import { propertiesApi } from '../api/properties';

function toISO(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function rangeForPeriod(period) {
  const now = new Date();
  const to = toISO(now);
  const from = new Date(now);
  if (period === 'week') {
    from.setDate(from.getDate() - 7);
  } else if (period === 'month') {
    from.setMonth(from.getMonth() - 1);
  } else if (period === 'year') {
    from.setFullYear(from.getFullYear() - 1);
  }
  return { from: toISO(from), to };
}

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Bu Hafta' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'year', label: 'Bu Yıl' },
  { value: 'custom', label: 'Özel Aralık' },
];

const ACTIVITY_ICONS = {
  property: '🏠',
  customer: '👤',
  interaction: '📞',
  commission: '💰',
};

const money = (n) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n || 0);

const dateTime = (d) =>
  new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Bu bolumlerin gercek verisi henuz backend'de yok (ornegin ilan onay
// akisi, sozlesme bitis takibi). "Yakinda" placeholder ile gosterilir --
// bkz. gelistirme notebook'u.
const PLACEHOLDER_ACTIONS = [
  { dot: '🔴', title: 'Yeni İlan Onayı', meta: 'Onay akışı eklendiğinde burada görünecek' },
  { dot: '🟡', title: 'Sözleşme / Vekaletname Uyarısı', meta: 'Sözleşme takibi eklendiğinde burada görünecek' },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState(rangeForPeriod('month').from);
  const [customTo, setCustomTo] = useState(rangeForPeriod('month').to);
  const [data, setData] = useState(null);
  const [propertyStats, setPropertyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = period === 'custom' ? { from: customFrom, to: customTo } : rangeForPeriod(period);
    const [summary, properties] = await Promise.all([
      dashboardApi.summary({ from, to }),
      propertiesApi.list({}),
    ]);
    setData(summary);
    const active = properties.filter((p) => p.status === 'active');
    setPropertyStats({
      total: properties.length,
      activeSale: active.filter((p) => p.listingType === 'sale').length,
      activeRent: active.filter((p) => p.listingType === 'rent').length,
    });
    setLoading(false);
  }, [period, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || '';
  const totalRevenue = data ? data.leaderboard.reduce((sum, r) => sum + r.salesValue, 0) : 0;
  const topAgent = data?.leaderboard?.[0];

  return (
    <div>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Genel Bakış</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: period === 'custom' ? 12 : 0 }}>
          {PERIOD_OPTIONS.map((opt) => (
            <button key={opt.value} className={period === opt.value ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setPeriod(opt.value)} style={{ fontSize: 13, padding: '6px 14px' }}>
              {opt.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Başlangıç</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Bitiş</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {loading || !data || !propertyStats ? (
        <div className="empty-state">Yükleniyor…</div>
      ) : (
        <>
          {/* --- Metrik Kartları --- */}
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-card__label">Toplam Portföy</div>
              <div className="metric-card__value">{propertyStats.total} İlan</div>
              <div className="metric-card__delta is-muted">Tüm zamanlar</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Toplam Ciro ({periodLabel})</div>
              <div className="metric-card__value">{money(totalRevenue)}</div>
              <div className="metric-card__delta is-muted">{data.leaderboard.length} danışman katkısı</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Aktif Satış / Kira</div>
              <div className="metric-card__value">{propertyStats.activeSale + propertyStats.activeRent} İşlem</div>
              <div className="metric-card__delta is-muted">{propertyStats.activeSale} Satılık / {propertyStats.activeRent} Kiralık</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Danışman Performansı</div>
              <div className="metric-card__value" style={{ fontSize: 16 }}>{topAgent ? topAgent.agentName : '—'}</div>
              <div className="metric-card__delta is-up">{topAgent ? `Lider · ${money(topAgent.salesValue)}` : 'Veri yok'}</div>
            </div>
          </div>

          {/* --- Ciro Grafiği + Akıllı Aksiyon Merkezi --- */}
          <div className="panel-grid-2">
            <div className="panel">
              <h3 className="panel__title">Ofis Ciro ve Hedef Grafiği</h3>
              <div className="panel__empty">
                Aylık ciro trend grafiği, geçmiş dönem verisi biriktikçe burada görünecek.
                <span className="soon-badge">Yakında</span>
              </div>
            </div>
            <div className="panel">
              <h3 className="panel__title">Akıllı Aksiyon & Onay Merkezi</h3>
              {PLACEHOLDER_ACTIONS.map((a, i) => (
                <div className="action-item" key={i}>
                  <span className="action-item__dot">{a.dot}</span>
                  <div className="action-item__body">
                    <div className="action-item__title">{a.title}</div>
                    <div className="action-item__meta">{a.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- Rozetler (gercek veri) --- */}
          {data.badges.length > 0 && (
            <div className="folder-panel" style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Rozetler</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {data.badges.map((b, i) => (
                  <div key={i} style={{ background: 'var(--paper-raised)', border: '1px solid var(--paper-line)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{b.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{b.agentName}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- Danışman Liderlik Tablosu (gercek veri) --- */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <h3 className="panel__title">Danışman Liderlik Tablosu</h3>
            {data.leaderboard.length === 0 ? (
              <div className="panel__empty">Bu aralıkta veri yok.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '6px 8px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>Danışman</th>
                    <th style={{ padding: '6px 8px' }}>Portföy</th>
                    <th style={{ padding: '6px 8px' }}>Müşteri</th>
                    <th style={{ padding: '6px 8px' }}>Görüşme</th>
                    <th style={{ padding: '6px 8px' }}>Komisyon</th>
                    <th style={{ padding: '6px 8px' }}>Satış Tutarı</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((row, i) => (
                    <tr key={row.agentId} style={{ borderTop: '1px solid var(--paper-line)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '10px 8px' }}>{row.agentName}</td>
                      <td style={{ padding: '10px 8px' }}>{row.propertiesCount}</td>
                      <td style={{ padding: '10px 8px' }}>{row.customersCount}</td>
                      <td style={{ padding: '10px 8px' }}>{row.interactionsCount}</td>
                      <td style={{ padding: '10px 8px' }}>{row.commissionsCount}</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>{money(row.salesValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* --- Canlı Aktivite (gercek veri) --- */}
          <div className="panel">
            <h3 className="panel__title">Canlı Aktivite</h3>
            {data.activity.length === 0 ? (
              <div className="panel__empty">Bu aralıkta aktivite yok.</div>
            ) : (
              data.activity.map((item, i) => (
                <div className="record-row" key={i}>
                  <span style={{ marginRight: 10 }}>{ACTIVITY_ICONS[item.type] || '•'}</span>
                  <span className="record-row__name" style={{ flex: 1 }}>
                    {item.agentName} — {item.title}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                    {dateTime(item.occurredAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
